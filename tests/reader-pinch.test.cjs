const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('app.js','utf8');
function reader(){
 const handlers={}, options={}, calls=[];
 const context={fontSize:100,fontFamily:'serif',Date,Promise,console,
 doc:{addEventListener(name,fn,opts){handlers[name]=fn;options[name]=opts;}},
 rendition:{currentLocation:()=>({start:{cfi:'saved-sentence'}}),themes:{fontSize:s=>calls.push(['font',s])},display:cfi=>calls.push(['position',cfi])},
 window:{gesPascoStorage:{setItem:(...a)=>calls.push(['save',...a]),getItem:()=> 'light'},gesPascoReaderSync:{queuePreferences:p=>calls.push(['sync',p.fontSize])}}};
 const start=source.indexOf('    let _tx = null'),end=source.indexOf('    /* Desktop content clicks',start);
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 const event=points=>({touches:points.map(x=>({clientX:x,clientY:0})),cancelable:true,preventDefault(){this.prevented=true;}});
 return {handlers,options,calls,context,event};
}
test('pinch cancels native zoom at start and reflows once on release at saved sentence',()=>{
 const r=reader(),start=r.event([0,100]);r.handlers.touchstart(start);
 assert.equal(r.options.touchstart.passive,false);assert.equal(start.prevented,true);
 r.handlers.touchmove(r.event([0,140]));r.handlers.touchmove(r.event([0,170]));assert.deepEqual(r.calls,[]);
 r.handlers.touchend(r.event([0]));assert.deepEqual(r.calls,[]);
 r.handlers.touchend(r.event([]));assert.deepEqual(r.calls,[['font','170%'],['position','saved-sentence'],['save','fontSize',170],['sync',170]]);
});
test('cancelled pinch clears gesture state and bounds text zoom',()=>{
 const r=reader();r.handlers.touchstart(r.event([0,100]));r.handlers.touchmove(r.event([0,900]));r.handlers.touchcancel();
 assert.equal(r.context.fontSize,200);const count=r.calls.length;r.handlers.touchcancel();assert.equal(r.calls.length,count);
 r.handlers.touchstart(r.event([0,100]));r.handlers.touchmove(r.event([0,1]));r.handlers.touchend(r.event([]));assert.equal(r.context.fontSize,70);
});
test('native Safari gestures cancelled only inside reader and panning excludes browser pinch',()=>{
 const r=reader();for(const name of ['gesturestart','gesturechange','gestureend']){const e=r.event([]);r.handlers[name](e);assert.equal(e.prevented,true);}
 assert.match(source,/html, body \{ touch-action: pan-x pan-y !important;/);
 assert.match(fs.readFileSync('style.css','utf8'),/#viewer, #viewer iframe \{ touch-action: pan-x pan-y;/);
 const one=r.event([0]);r.handlers.touchstart(one);assert.equal(one.prevented,undefined);
});
