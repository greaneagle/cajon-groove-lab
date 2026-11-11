// Offline synthetic regression check for the AudioWorklet onset logic.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/detector-worklet.js','utf8');
function run(strikes,noise=0){
  const events=[];let Detector;
  const sandbox={sampleRate:48000,currentFrame:0,Float32Array,Math,
    AudioWorkletProcessor:class{constructor(){this.port={postMessage:(event)=>events.push(event)}}},
    registerProcessor:(_,d)=>Detector=d};
  vm.runInNewContext(code,sandbox);
  const processor=new Detector();
  const length=48000*3,signal=new Float32Array(length);
  for(const start of strikes){
    const onset=Math.round(start*48000);
    for(let j=0;j<Math.min(15000,length-onset);j++){
      // Sharp initial tap followed by two weaker resonance lobes.
      const resonance=Math.exp(-j/4100)*(1+.28*Math.sin(j/850));
      signal[onset+j]+=.28*resonance*Math.sin(2*Math.PI*175*j/48000);
    }
  }
  for(let j=0;j<length;j++)signal[j]+=noise*Math.sin(j*1.7);
  for(let offset=0;offset<length;offset+=128){
    sandbox.currentFrame=offset;
    processor.process([ [signal.subarray(offset,offset+128)] ], [ [new Float32Array(128)] ]);
  }
  return events.filter(e=>e.type==='onset').map(e=>e.frame/48000);
}
const isolated=run([.35,1.25,2.15]);
assert.equal(isolated.length,3,'isolated hits should not double-trigger: '+isolated);
const rapid=run([.4,.58,.76]);
assert.equal(rapid.length,3,'180ms-apart hits should survive: '+rapid);
const silent=run([],.0001);
assert.equal(silent.length,0,'low background noise should not trigger: '+silent);
console.log('Detector regression passed',JSON.stringify({isolated,rapid,silent}));
