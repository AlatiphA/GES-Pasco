/* Stage, verify and atomically publish replacements using the existing protected schema. */
(function(root){
 'use strict';
 const CHUNK_BYTES=400*1024,MAX_EPUB=25*1024*1024,MAX_BANK=650000;
 const sampleIds=new Set(['index-split-043-1','index-split-047-1','index-split-050-1']);
 const timed=(work,label)=>{let timer;return Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out. Reconnect and check the current library before retrying.')),15000);})]).finally(()=>clearTimeout(timer));};
 const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 function manifest(snap){
  if(!snap.exists)return null;const m=snap.data();
  if(!/^edition-[a-z0-9]{1,24}$/.test(m?.editionId||'')||!Number.isSafeInteger(m.epubBytes)||m.epubBytes<=100||m.epubBytes>MAX_EPUB||m.epubChunks!==Math.ceil(m.epubBytes/CHUNK_BYTES)||!/^[a-f0-9]{64}$/.test(m.epubSha256||'')||typeof m.practiceJson!=='string')throw Error('The current protected library needs attention before it can be updated.');
  return m;
 }
 const readState=async db=>manifest(await timed(db.collection('protectedLibrary').doc('current').get({source:'server'}),'Library check'));
 function bankJson(raw,validBank){
  if(new TextEncoder().encode(raw).length>MAX_BANK)throw Error('The premium question-set file is too large.');
  let value;try{value=JSON.parse(raw);}catch{throw Error('Choose a valid premium question-set JSON file.');}
  if(value.schema!==1||!Array.isArray(value.banks)||!value.banks.length||value.banks.length>100||new Set(value.banks.map(b=>b?.id)).size!==value.banks.length||value.banks.some(b=>!b||typeof b.id!=='string'||sampleIds.has(b.id)||!validBank(b)))throw Error('Choose the prepared premium question sets, excluding the three free sample sets.');
  const json=JSON.stringify({schema:1,banks:value.banks});if(new TextEncoder().encode(json).length>MAX_BANK)throw Error('The premium question sets exceed the storage limit.');return json;
 }
 function encode(bytes){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
 function decode(value){const text=atob(value);return Uint8Array.from(text,c=>c.charCodeAt(0));}
 async function upload({db,epubFile,bankFile,validBank,isCurrent=()=>true,verifyAdmin=async()=>{},onStatus=()=>{},zip=root.JSZip,timestamp=()=>firebase.firestore.FieldValue.serverTimestamp()}){
  const check=()=>{if(!isCurrent())throw Error('The signed-in account or library page changed. Reopen Protected library and retry.');};check();await verifyAdmin();check();
  if(!epubFile&&!bankFile)throw Error('Choose a replacement EPUB, premium question sets, or both.');
  const baseline=await readState(db);check();
  if(!baseline&&(!epubFile||!bankFile))throw Error('For the first upload, choose both the full EPUB and premium question sets.');
  const practiceJson=bankFile?bankJson(await bankFile.text(),validBank):baseline.practiceJson;
  // Also validate the retained question sets before making a new edition active.
  bankJson(practiceJson,validBank);let next=baseline?{...baseline}:{};
  if(epubFile){
   if(!Number.isSafeInteger(epubFile.size)||epubFile.size<=100||epubFile.size>MAX_EPUB||!(/\.epub$/i.test(epubFile.name||'')||epubFile.type==='application/epub+zip'))throw Error('Choose an EPUB larger than 100 bytes and no larger than 25 MB.');
   onStatus('Checking the replacement EPUB…');const bytes=new Uint8Array(await epubFile.arrayBuffer());check();
   if(bytes.length!==epubFile.size||bytes[0]!==80||bytes[1]!==75||bytes[2]!==3||bytes[3]!==4)throw Error('The selected file is not a readable EPUB.');
   if(!zip?.loadAsync)throw Error('The EPUB checker is unavailable. Reconnect and reopen Administration.');
   const archive=await zip.loadAsync(bytes,{checkCRC32:true});check();
   if(!archive.file('META-INF/container.xml')||!archive.file('mimetype')||(await archive.file('mimetype').async('string')).trim()!=='application/epub+zip')throw Error('The selected ZIP is not an EPUB book.');
   const editionId='edition-'+Date.now().toString(36)+crypto.randomUUID().replace(/-/g,'').slice(0,12),epubChunks=Math.ceil(bytes.length/CHUNK_BYTES),epubSha256=await digest(bytes),edition=db.collection('protectedLibrary').doc(editionId);
   for(let i=0;i<epubChunks;i++){check();await timed(edition.collection('chunks').doc(String(i)).set({index:i,payload:encode(bytes.subarray(i*CHUNK_BYTES,(i+1)*CHUNK_BYTES)),updatedAt:timestamp()}),'Book upload');onStatus('Uploading replacement book… '+Math.round((i+1)/epubChunks*100)+'%');}
   onStatus('Verifying the uploaded book…');const verified=new Uint8Array(bytes.length);let offset=0;
   for(let i=0;i<epubChunks;i++){
    check();const snap=await timed(edition.collection('chunks').doc(String(i)).get({source:'server'}),'Book verification'),part=snap.exists?snap.data():null;
    if(part?.index!==i||typeof part.payload!=='string')throw Error('An uploaded book section could not be verified.');const data=decode(part.payload);
    if(data.length!==Math.min(CHUNK_BYTES,bytes.length-i*CHUNK_BYTES))throw Error('An uploaded book section is incomplete.');verified.set(data,offset);offset+=data.length;
   }
   if(offset!==bytes.length||await digest(verified)!==epubSha256)throw Error('The uploaded book failed its integrity check.');
   next={editionId,epubBytes:bytes.length,epubChunks,epubSha256};
  }
  onStatus('Publishing the verified update…');check();await verifyAdmin();check();
  const current=db.collection('protectedLibrary').doc('current');
  await db.runTransaction(async tx=>{
   check();const latest=manifest(await tx.get(current));check();
   if((latest?.editionId||null)!==(baseline?.editionId||null)||(latest?.epubSha256||null)!==(baseline?.epubSha256||null)||(latest?.practiceJson||null)!==(baseline?.practiceJson||null))throw Error('Another administrator updated the library. Check the current library before retrying.');
   tx.set(current,{editionId:next.editionId,epubBytes:next.epubBytes,epubChunks:next.epubChunks,epubSha256:next.epubSha256,practiceJson,updatedAt:timestamp()});
  });
  return {...next,practiceJson};
 }
 const api={readState,upload,CHUNK_BYTES};if(typeof module==='object'&&module.exports)module.exports=api;root.GESPascoLibraryUpload=api;
})(typeof window==='object'?window:globalThis);
