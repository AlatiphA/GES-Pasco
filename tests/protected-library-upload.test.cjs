const {test}=require('node:test'),assert=require('node:assert/strict');
const upload=require('../protected-library-upload.js');
const bank=JSON.stringify({schema:1,banks:[{id:'premium',questions:['example']}]});
const old=()=>({editionId:'edition-old',epubBytes:200,epubChunks:1,epubSha256:'a'.repeat(64),practiceJson:bank,updatedAt:1});
function setup({initial=old(),corrupt=false,fail=false,conflict=false}={}){
 const data=new Map(initial?[['protectedLibrary/current',initial]]:[]),writes=[];let active=true;
 const ref=path=>({path,collection:n=>ref(path+'/'+n),doc:n=>ref(path+'/'+n),async get(){let value=data.get(path);if(corrupt&&path.includes('/chunks/'))value={...value,payload:btoa('damaged')};return {exists:!!value,data:()=>value};},async set(value){if(fail)throw Error('Upload failed');writes.push(path);data.set(path,value);}});
 const db={collection:ref,async runTransaction(fn){if(conflict)data.set('protectedLibrary/current',{...old(),practiceJson:bank+' '});let change;await fn({get:r=>r.get(),set:(r,value)=>{change=[r.path,value];}});if(change){writes.push(change[0]);data.set(...change);}}};
 const bytes=new Uint8Array(500);bytes.set([80,75,3,4]);
 const epub={name:'revised.epub',size:bytes.length,arrayBuffer:async()=>bytes.buffer};
 const zip={loadAsync:async()=>({file:name=>name==='mimetype'?{async:async()=> 'application/epub+zip'}:name==='META-INF/container.xml'?{}:null})};
 const options={db,zip,validBank:b=>Array.isArray(b.questions),isCurrent:()=>active,verifyAdmin:async()=>{if(!active)throw Error('Role changed');},timestamp:()=>2};
 return {data,writes,options,epub,revoke:()=>active=false};
}
test('book-only replacement verifies staged bytes, preserves quizzes and publishes last',async()=>{
 const a=setup(),result=await upload.upload({...a.options,epubFile:a.epub});
 assert.notEqual(result.editionId,'edition-old');assert.equal(result.practiceJson,bank);assert.match(result.epubSha256,/^[a-f0-9]{64}$/);assert.equal(a.writes.at(-1),'protectedLibrary/current');assert.ok(a.writes[0].includes(result.editionId+'/chunks/'));assert.equal(a.data.get('protectedLibrary/current').epubBytes,500);
});
test('question-only update preserves the book and writes no book chunks',async()=>{
 const a=setup(),raw=JSON.stringify({schema:1,banks:[{id:'premium-new',questions:[]}]});await upload.upload({...a.options,bankFile:{text:async()=>raw}});
 const next=a.data.get('protectedLibrary/current');assert.equal(next.editionId,'edition-old');assert.equal(next.epubSha256,'a'.repeat(64));assert.equal(next.practiceJson,raw);assert.deepEqual(a.writes,['protectedLibrary/current']);
});
test('first publication requires both source files and accepts the complete pair',async()=>{
 const a=setup({initial:null});await assert.rejects(upload.upload({...a.options,epubFile:a.epub}),/first upload/);assert.deepEqual(a.writes,[]);
 await upload.upload({...a.options,epubFile:a.epub,bankFile:{text:async()=>bank}});assert.ok(a.data.has('protectedLibrary/current'));
});
for(const mode of ['corrupt','fail','conflict'])test(mode+' leaves the existing edition active',async()=>{
 const a=setup({[mode]:true});await assert.rejects(upload.upload({...a.options,epubFile:a.epub}));assert.equal(a.data.get('protectedLibrary/current').editionId,'edition-old');assert.equal(a.writes.includes('protectedLibrary/current'),false);
});
test('role loss during staging cannot publish and no source selection cannot publish',async()=>{
 const a=setup();await assert.rejects(upload.upload(a.options),/Choose a replacement/);
 await assert.rejects(upload.upload({...a.options,epubFile:a.epub,onStatus:text=>{if(text.startsWith('Verifying'))a.revoke();}}),/account or library page changed/);assert.equal(a.data.get('protectedLibrary/current').editionId,'edition-old');
});
test('invalid EPUBs and sample or oversized question files do not write anything',async()=>{
 for(const change of [ {epubFile:{name:'bad.epub',size:200,arrayBuffer:async()=>new Uint8Array(200).buffer}}, {bankFile:{text:async()=>JSON.stringify({schema:1,banks:[{id:'index-split-043-1',questions:[]}]})}}, {bankFile:{text:async()=> 'x'.repeat(650001)}} ]){
  const a=setup();await assert.rejects(upload.upload({...a.options,...change}));assert.deepEqual(a.writes,[]);
 }
 const a=setup();await assert.rejects(upload.upload({...a.options,epubFile:a.epub,zip:{loadAsync:async()=>({file:()=>null})}}),/not an EPUB/);assert.deepEqual(a.writes,[]);
});
