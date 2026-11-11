// Tiny per-device classifier: no external packages, network requests or raw-audio storage.
(function(root) {
  'use strict';
  const N=2048;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mean=a=>a.reduce((s,v)=>s+v,0)/Math.max(1,a.length);

  function features(samples,rate) {
    if (!samples || samples.length < 500) return null;
    const count=samples.length, pre=Math.round(rate*.012);
    function rms(a,b) {let sum=0,n=0;for(let i=Math.max(0,a);i<Math.min(count,b);i++){sum+=samples[i]*samples[i];n++}return Math.sqrt(sum/Math.max(1,n))}
    const early=rms(pre,pre+Math.round(rate*.018));
    const middle=rms(pre+Math.round(rate*.018),pre+Math.round(rate*.055));
    const tail=rms(pre+Math.round(rate*.060),pre+Math.round(rate*.088));
    if (early < 0.002) return null;
    let peak=0,zero=0,prev=samples[pre]||0;
    const end=Math.min(count,pre+Math.round(rate*.045));
    for(let i=pre;i<end;i++){const v=samples[i];peak=Math.max(peak,Math.abs(v));if((v>=0)!==(prev>=0))zero++;prev=v}
    const real=new Float64Array(N),imag=new Float64Array(N);
    const offset=Math.max(0,pre-Math.round(rate*.002));
    for(let i=0;i<N;i++){const v=samples[offset+i]||0;real[i]=v*(.5-.5*Math.cos(2*Math.PI*i/(N-1)))}
    // In-place radix-2 FFT. Tiny enough for the main thread after onset detection.
    for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){let t=real[i];real[i]=real[j];real[j]=t}}
    for(let len=2;len<=N;len<<=1){const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);for(let i=0;i<N;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=real[b]*cr-imag[b]*ci,ti=real[b]*ci+imag[b]*cr;real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}
    const boundaries=[50,170,400,1000,2500,6000,Math.min(12000,rate/2)];
    const bands=new Array(6).fill(0);let total=0,weighted=0;
    for(let k=2;k<N/2;k++){const hz=k*rate/N;if(hz<50||hz>=boundaries[6])continue;const power=real[k]*real[k]+imag[k]*imag[k];let j=0;while(j<5&&hz>=boundaries[j+1])j++;bands[j]+=power;total+=power;weighted+=hz*power}
    if(total<=0)return null;
    // Relative band powers are insensitive to how loudly the phone records.
    const frac=bands.map(v=>Math.log(.00001+v/total));
    return [...frac,Math.log1p(weighted/total)/10,zero/Math.max(1,end-pre),Math.log((early+.0001)/(middle+.0001)),Math.log((middle+.0001)/(tail+.0001)),Math.log((peak+.0001)/(early+.0001))];
  }

  function predict(model,vector,exclude) {
    const items=[];
    for(const kind of ['B','S'])for(let i=0;i<(model?.[kind]||[]).length;i++){
      if(exclude&&exclude.kind===kind&&exclude.index===i)continue;
      const x=model[kind][i];if(!Array.isArray(x)||x.length!==vector.length)continue;
      items.push({kind,x});
    }
    if(!items.some(x=>x.kind==='B')||!items.some(x=>x.kind==='S'))return {kind:null,confidence:0};
    const dims=vector.length,mu=Array(dims).fill(0),sd=Array(dims).fill(0);
    for(const item of items)for(let j=0;j<dims;j++)mu[j]+=item.x[j]/items.length;
    for(const item of items)for(let j=0;j<dims;j++)sd[j]+=(item.x[j]-mu[j])**2/items.length;
    for(let j=0;j<dims;j++)sd[j]=Math.max(.1,Math.sqrt(sd[j]));
    const distances=items.map(item=>({kind:item.kind,d:Math.sqrt(item.x.reduce((s,v,j)=>s+Math.min(20,((v-vector[j])/sd[j])**2),0)/dims)})).sort((a,b)=>a.d-b.d);
    const k=Math.min(5,distances.length),votes={B:0,S:0};
    for(let i=0;i<k;i++)votes[distances[i].kind]+=1/(.05+distances[i].d**2);
    const kind=votes.B>=votes.S?'B':'S',share=votes[kind]/(votes.B+votes.S);
    // Confidence also falls when the nearest sound is unlike any calibration sample.
    const familiarity=clamp(1.4/(.45+distances[0].d),.25,1);
    return {kind,confidence:clamp(share*familiarity,0,1),distance:distances[0].d};
  }

  function validate(model) {
    let correct=0,total=0,uncertain=0;
    for(const kind of ['B','S'])for(let i=0;i<(model?.[kind]||[]).length;i++){
      const r=predict(model,model[kind][i],{kind,index:i});if(!r.kind)continue;
      total++;if(r.kind===kind)correct++;if(r.confidence<.6)uncertain++;
    }
    return {correct,total,accuracy:total?correct/total:0,uncertain};
  }

  // Compare feature vectors using the calibration spread, so user-tagged room
  // noises can be rejected without changing the reliable bass/slap classifier.
  function noiseSimilarity(model,vector) {
    const negatives=model?.noiseExamples||[];
    if(!negatives.length)return Infinity;
    const positives=[...(model.B||[]),...(model.S||[])];
    const dims=vector.length,mu=Array(dims).fill(0),sd=Array(dims).fill(0);
    for(const v of positives)for(let j=0;j<dims;j++)mu[j]+=v[j]/positives.length;
    for(const v of positives)for(let j=0;j<dims;j++)sd[j]+=(v[j]-mu[j])**2/positives.length;
    for(let j=0;j<dims;j++)sd[j]=Math.max(.1,Math.sqrt(sd[j]));
    return Math.min(...negatives.filter(v=>v.length===dims).map(v=>Math.sqrt(v.reduce((s,x,j)=>s+Math.min(20,((x-vector[j])/sd[j])**2),0)/dims)),Infinity);
  }

  root.CajonML={features,predict,validate,noiseSimilarity};
})(typeof window!=='undefined'?window:globalThis);
