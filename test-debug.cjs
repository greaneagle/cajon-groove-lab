const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=new Map();
const context={Date,Math,JSON,performance:{now:()=>52},
  navigator:{language:'en',platform:'Android'},screen:{width:400,height:800},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
context.globalThis=context;
const source=fs.readFileSync(__dirname+'/debug-log.js','utf8');
vm.runInNewContext(source,context);
context.GrooveDebug.log('onset',{frame:120,arrivalDelayMs:98,rawAudio:'secret',feature:'secret'});
context.GrooveDebug.log('score',{kind:'B',timingErrorMs:-29.5588,matched:true});
context.GrooveDebug.flush();
vm.runInNewContext(source,context);
const data=context.GrooveDebug.exportData({appVersion:'v5'});
assert.equal(data.events.length,2);
assert.equal(data.events[0].frame,120);
assert.equal(data.events[1].timingErrorMs,-29.559);
assert.equal(data.events[0].rawAudio,undefined);
assert.equal(data.events[0].feature,undefined);
assert.equal(data.metadata.appVersion,'v5');
context.GrooveDebug.clear();
assert.equal(context.GrooveDebug.stats().events,0);
console.log('Diagnostic export tests passed');
