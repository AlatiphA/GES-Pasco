const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function worker(){
 const saved=new Map(),handlers={};let broken=false;
 const cache={match:async key=>saved.get(key)?.clone(),put:async(key,response)=>saved.set(key,response.clone())};
 const context={console,URL,Uint8Array,Promise,Response,Request:class{constructor(url){this.url=url;}},caches:{open:async()=>cache},fetch:async request=>{
  const url=request.url;if(broken&&url.endsWith('app.js'))throw Error('offline');
  if(url.endsWith('.epub')){const bytes=new Uint8Array(200);bytes.set([80,75,3,4]);return new Response(bytes);}
  return new Response(url.endsWith('version.js')?'globalThis.GES_PASCO_VERSION = "1.0.15";':'saved file');
 },self:{addEventListener:(name,fn)=>handlers[name]=fn}};
 context.importScripts=()=>context.GES_PASCO_VERSION='1.0.15';vm.createContext(context);vm.runInContext(fs.readFileSync('sw.js','utf8'),context);
 return {saved,context,set broken(value){broken=value;},async prepare(){return vm.runInContext('prepareOffline()',context);},async status(){return vm.runInContext('offlineStatus()',context);},handlers};
}
test('offline readiness requires book and every dependency',async()=>{const w=worker();assert.equal((await w.status()).ready,false);assert.equal((await w.prepare()).ready,true);w.saved.delete('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js');assert.equal((await w.status()).ready,false);await w.prepare();assert.equal((await w.status()).ready,true);});
test('failed repair preserves the complete previously saved reader',async()=>{const w=worker();await w.prepare();const previous=await w.saved.get('./app.js').clone().text();w.broken=true;await assert.rejects(w.prepare(),/Required app files/);assert.equal(await w.saved.get('./app.js').clone().text(),previous);assert.equal((await w.status()).ready,true);});
test('HTML saved as an EPUB is not reported as ready',async()=>{const w=worker();await w.prepare();w.saved.set('./library/sample.epub',new Response('<html>Not a book</html>'));assert.equal((await w.status()).ready,false);});
test('failed book requests never return an HTML app shell',async()=>{const w=worker();let response;w.context.fetch=async()=>{throw Error('offline');};w.context.caches.match=async()=>undefined;w.handlers.fetch({request:{method:'GET',url:'https://example.test/library/sample.epub',mode:'cors'},respondWith:p=>response=p});assert.equal((await response).type,'error');});

test('cached shell, EPUB library and sign-in SDK load when network is unavailable',async()=>{const w=worker();await w.prepare();w.context.fetch=async()=>{throw Error('offline');};w.context.caches.match=async request=>w.saved.get(typeof request==='string'?request:request.url)?.clone();w.saved.set('https://example.test/index.html',w.saved.get('./index.html'));for(const url of ['https://example.test/index.html','https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js','https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js']){let response;w.handlers.fetch({request:{method:'GET',url,mode:'cors'},respondWith:p=>response=p});assert.equal((await response).ok,true);}});
