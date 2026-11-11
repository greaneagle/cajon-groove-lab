// Local diagnostic log. No raw audio, feature vectors, calibration samples, or identifiers.
(function(root) {
  'use strict';
  const KEY='cajon-debug-v1', LIMIT=2500, MAX_AGE=24*60*60*1000;
  const round=n=>typeof n==='number'&&Number.isFinite(n)?Math.round(n*1000)/1000:null;
  const allowed=['mic','onset','classified','rejected','score','miss','session','settings','calibration','test','metronome','error','diagnostic'];
  let history=[];
  try{
    const saved=JSON.parse(root.localStorage?.getItem(KEY)||'[]');
    if(Array.isArray(saved))history=saved.filter(x=>x&&Date.now()-x.epoch<MAX_AGE).slice(-LIMIT);
  }catch{}
  let dirty=0;
  function persist(force=false){
    if(!force&&++dirty<25)return;
    dirty=0;
    try{root.localStorage?.setItem(KEY,JSON.stringify(history))}catch{}
  }
  function log(type,details={}){
    if(!allowed.includes(type))return;
    const safe={};
    for(const [key,value] of Object.entries(details)){
      if(!/^(kind|reason|phase|state|mode|sensitivity|confidence|distance|strength|noise|threshold|energy|frame|rate|elapsedMs|arrivalDelayMs|featureDelayMs|timingErrorMs|targetIndex|expected|matched|accepted|bpm|meter|subdiv|tolerance|offsetMs|correct|hits|misses|score|count|confidencePercent|audioContextTime|inputLatencyMs|baseLatencyMs|outputLatencyMs|visibility|click|feedback|quality|sampleCount|calibrated|note|timeMs|durationMs|lagMs|residualMs)$/.test(key))continue;
      if(typeof value==='string')safe[key]=value.slice(0,90);
      else if(typeof value==='number')safe[key]=round(value);
      else if(typeof value==='boolean')safe[key]=value;
    }
    history.push({epoch:Date.now(),ms:round(root.performance?.now?.()??0),type,...safe});
    if(history.length>LIMIT)history.splice(0,history.length-LIMIT);
    persist();
  }
  function stats(){
    const out={};for(const e of history)out[e.type]=(out[e.type]||0)+1;
    return {events:history.length,byType:out};
  }
  function exportData(metadata={}){
    persist(true);
    return {
      format:'cajon-groove-debug',version:1,
      exportedAt:new Date().toISOString(),
      privacy:'No raw microphone audio, calibration vectors, names, account data or full browser user-agent.',
      environment:{
        language:root.navigator?.language||'unknown',
        platform:root.navigator?.userAgentData?.platform||root.navigator?.platform||'unknown',
        online:root.navigator?.onLine??null,
        screenWidth:root.screen?.width??null,
        screenHeight:root.screen?.height??null,
        pixelRatio:root.devicePixelRatio??null
      },
      metadata,summary:stats(),events:history.slice()
    };
  }
  function clear(){history=[];persist(true)}
  root.GrooveDebug={log,stats,exportData,clear,flush:()=>persist(true)};
})(typeof window!=='undefined'?window:globalThis);
