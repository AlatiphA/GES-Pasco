/* Protected full-library delivery uses Firestore so the project can remain on Spark. */
(()=>{
 'use strict';
 const db=gesPascoDb,storeName='ges-pasco-protected-library-v1',chunkBytes=400*1024;
 const sampleBankIds=new Set(['index-split-043-1','index-split-047-1','index-split-050-1']);
 let adminUid='',activeFullUid='',loadedFullContent=false;
 function isSampleHref(href){const m=String(href||'').match(/(?:^|\/)index_split_(\d+)\.html(?:#.*)?$/i);if(!m)return true;const n=Number(m[1]);return n<=1||(n>=49&&n<=58)||(n>=358&&n<=456);}
 function readableHref(href){return (window.GESPascoAccess?.fullAccess?.()===true&&loadedFullContent)||isSampleHref(href);}
 function paywall(label='This chapter'){
  const modal=document.getElementById('premiumAccessDialog');if(!modal)return;
  const hasEntitlement=window.GESPascoAccess?.fullAccess?.()===true,needsDevice=!hasEntitlement&&window.GESPascoAccess?.state?.().kind==='subscription';
  document.getElementById('premiumAccessMessage').textContent=needsDevice?'Your subscription is active. Open Reading and devices to register this browser or resolve another device reading. You do not need to pay again.':hasEntitlement?'Your account has full access, but the protected library is not ready on this device. Reconnect and try again, or contact support if the problem continues.':label+' is included in the full library. Subscribe to unlock every chapter and question set; the three sample exams remain free.';
  const subscribe=document.getElementById('premiumAccessSubscribe');if(subscribe){subscribe.hidden=hasEntitlement;subscribe.textContent=needsDevice?'Manage devices':'MoMo and subscriptions';}
  if(!modal.open)modal.showModal();
 }
 function entitled(uid){return !!uid&&gesPascoAuth.currentUser?.uid===uid&&window.GESPascoAccess?.fullAccess?.()===true;}
 async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Protected library request timed out.')),15000);})]);}finally{clearTimeout(timer);}}
 function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(storeName,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('books'))req.result.createObjectStore('books',{keyPath:'uid'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Offline book storage unavailable.'));});}
 async function idbRead(uid){const d=await openDb();return new Promise((resolve,reject)=>{const tx=d.transaction('books','readonly'),r=tx.objectStore('books').get(uid);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
 async function idbWrite(uid,editionId,blob){const d=await openDb();return new Promise((resolve,reject)=>{const tx=d.transaction('books','readwrite');tx.objectStore('books').put({uid,editionId,blob,savedAt:Date.now()});tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Offline book could not be saved.'));});}
 async function idbDelete(uid){if(!uid||!('indexedDB'in window))return;try{const d=await openDb();await new Promise((resolve,reject)=>{const tx=d.transaction('books','readwrite');tx.objectStore('books').delete(uid);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{}}
 async function readManifest(){const contentDb=window.GESPascoDevices?await window.GESPascoDevices.contentDb():db;const snap=await bounded(contentDb.collection('protectedLibrary').doc('current').get({source:'server'}));if(!snap.exists)throw Error('The full library has not been uploaded yet.');const m=snap.data();if(typeof m.editionId!=='string'||!Number.isInteger(m.epubChunks)||m.epubChunks<1||m.epubChunks>100||!Number.isInteger(m.epubBytes)||m.epubBytes<100||m.epubBytes>25*1024*1024||typeof m.epubSha256!=='string'||typeof m.practiceJson!=='string')throw Error('The protected library upload is incomplete.');return m;}
 function decodeBase64(value){const binary=atob(value),out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;}
 async function digest(bytes){if(!crypto?.subtle)throw Error('This browser cannot verify the protected book download.');const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}
 async function fetchFullBook(uid,m){const contentDb=window.GESPascoDevices?await window.GESPascoDevices.contentDb():db;const refs=Array.from({length:m.epubChunks},(_,i)=>contentDb.collection('protectedLibrary').doc(m.editionId).collection('chunks').doc(String(i)).get({source:'server'}));const docs=await bounded(Promise.all(refs)),parts=[];let length=0;for(let i=0;i<docs.length;i++){if(!docs[i].exists||docs[i].data().index!==i||typeof docs[i].data().payload!=='string')throw Error('A protected book part is missing.');const part=decodeBase64(docs[i].data().payload);parts.push(part);length+=part.length;}if(length!==m.epubBytes)throw Error('The protected book download is incomplete.');const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}if(await digest(bytes)!==m.epubSha256)throw Error('The protected book failed its integrity check.');if(bytes[0]!==80||bytes[1]!==75||bytes[2]!==3||bytes[3]!==4)throw Error('The protected file is not a readable EPUB.');const blob=new Blob([bytes],{type:'application/epub+zip'});if(!entitled(uid))throw Error('Full access ended while the library was loading.');try{await idbWrite(uid,m.editionId,blob);}catch{}return blob;}
 async function sampleBook(){const response=await bounded(fetch('./library/sample.epub',{cache:'no-store'}));if(!response.ok)throw Error('Sample chapters could not be downloaded.');return response.blob();}
 async function bookBlob(uid){
  loadedFullContent=false;
  if(!uid||!window.GESPascoAccess?.fullAccess?.())return {blob:await sampleBook(),fullAccess:false};
  let saved=null;try{saved=await idbRead(uid);}catch{}
  if(saved?.blob instanceof Blob&&entitled(uid)){loadedFullContent=true;if(navigator.onLine!==false)readManifest().then(m=>m.editionId===saved.editionId?null:fetchFullBook(uid,m)).catch(()=>{});return {blob:saved.blob,fullAccess:true};}
  try{const m=await readManifest(),blob=await fetchFullBook(uid,m);if(!entitled(uid))return {blob:await sampleBook(),fullAccess:false};loadedFullContent=true;return {blob,fullAccess:true};}
  catch(error){
   if(error.code!=='permission-denied'&&error.code!=='unauthenticated'){
    let cached=null;try{cached=await idbRead(uid);}catch{}if(entitled(uid)&&cached?.blob instanceof Blob){loadedFullContent=true;return {blob:cached.blob,fullAccess:true};}
   }
   return {blob:await sampleBook(),fullAccess:false,warning:error.message||'Full library could not be loaded.'};
  }
 }
 async function practiceBanks(uid){
  if(!uid||!window.GESPascoAccess?.fullAccess?.())return [];
  const key='ges-pasco-premium-banks-'+uid;
  try{const m=await readManifest(),payload=JSON.parse(m.practiceJson);if(payload.schema!==1||!Array.isArray(payload.banks)||payload.banks.length>100||payload.banks.some(b=>!b||typeof b.id!=='string'||sampleBankIds.has(b.id)||!window.GESPascoQuizCore.validBank(b)))throw Error('Premium practice sets failed validation.');if(!entitled(uid))return [];try{localStorage.setItem(key,JSON.stringify({editionId:m.editionId,banks:payload.banks}));}catch{}return payload.banks;}
  catch(error){if(error.code==='permission-denied'||error.code==='unauthenticated')throw error;try{const saved=JSON.parse(localStorage.getItem(key));if(entitled(uid)&&saved?.banks&&saved.banks.every(b=>!sampleBankIds.has(b.id)&&window.GESPascoQuizCore.validBank(b)))return saved.banks;}catch{}throw error;}
 }
 function setStatus(text){document.getElementById('protectedContentStatus').textContent=text;}
 async function verifyAdmin(){const user=gesPascoAuth.currentUser;if(!user)throw Error('Sign in with a payment-administrator account.');const snap=await db.collection('paymentAdmins').doc(user.uid).get({source:'server'});if(!snap.exists||snap.data().active!==true)throw Error('Payment-administrator access is required.');return user.uid;}
 function hexHash(bytes){return digest(bytes);}
 function encodeBase64(bytes){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary);}
 async function uploadFiles(epubFile,bankFile){
  const uid=await verifyAdmin();if(!epubFile||!bankFile)throw Error('Choose both the original full EPUB and its premium question-set JSON.');
  if(epubFile.size<100||epubFile.size>25*1024*1024)throw Error('The EPUB must be smaller than 25 MB.');
  const epubBytes=new Uint8Array(await epubFile.arrayBuffer());if(epubBytes[0]!==80||epubBytes[1]!==75||epubBytes[2]!==3||epubBytes[3]!==4)throw Error('The selected book is not a readable EPUB.');
  const raw=await bankFile.text();if(raw.length>650000)throw Error('The premium question-set file is too large.');const parsed=JSON.parse(raw);if(parsed.schema!==1||!Array.isArray(parsed.banks)||!parsed.banks.length||parsed.banks.length>100||parsed.banks.some(b=>!b||typeof b.id!=='string'||sampleBankIds.has(b.id)||!window.GESPascoQuizCore.validBank(b)))throw Error('Choose the prepared premium question-set JSON, not the three free sample sets.');
  const editionId='edition-'+Date.now().toString(36),chunks=Math.ceil(epubBytes.length/chunkBytes),root=db.collection('protectedLibrary').doc(editionId);
  for(let i=0;i<chunks;i++){if(gesPascoAuth.currentUser?.uid!==uid)throw Error('The signed-in account changed; upload stopped.');const slice=epubBytes.subarray(i*chunkBytes,Math.min((i+1)*chunkBytes,epubBytes.length));await root.collection('chunks').doc(String(i)).set({index:i,payload:encodeBase64(slice),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});setStatus('Uploading protected book… '+Math.round((i+1)/chunks*75)+'%');}
  const practiceJson=JSON.stringify({schema:1,banks:parsed.banks}),epubSha256=await hexHash(epubBytes);if(practiceJson.length>650000)throw Error('The premium question sets exceed the Firestore size limit.');
  if(gesPascoAuth.currentUser?.uid!==uid)throw Error('The signed-in account changed; upload stopped.');await db.collection('protectedLibrary').doc('current').set({editionId,epubBytes:epubBytes.length,epubChunks:chunks,epubSha256,practiceJson,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
  window.GESPascoAdminPage?.saved(document.getElementById('protectedContentDialog'));setStatus('Protected library uploaded. Subscribers can now open the complete EPUB and practice sets.');window.dispatchEvent(new Event('ges-pasco-protected-content-updated'));
 }
 const entry=document.getElementById('protectedContentAdminEntry'),dialog=document.getElementById('protectedContentDialog'),close=document.getElementById('protectedContentClose'),epubInput=document.getElementById('protectedEpubFile'),bankInput=document.getElementById('protectedBankFile'),upload=document.getElementById('protectedContentUpload');
 window.GESPascoAdminPage?.registerGuard(()=>!upload?.disabled);
 async function openAdmin(){if(window.GESPascoAdminPage)window.GESPascoAdminPage.open(dialog);else if(!dialog.open)dialog.showModal();setStatus('Checking administrator access…');try{await verifyAdmin();setStatus('Choose the two local source files listed below, then upload. The files are sent to protected Firestore documents and are not added to the public app.');}catch(error){setStatus(error.message||'Could not verify administrator access.');}}
 entry?.addEventListener('click',openAdmin);close?.addEventListener('click',()=>dialog.close());dialog?.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});
 document.getElementById('premiumAccessClose')?.addEventListener('click',()=>document.getElementById('premiumAccessDialog').close());
 document.getElementById('premiumAccessSubscribe')?.addEventListener('click',()=>{document.getElementById('premiumAccessDialog').close();if(window.GESPascoAccess?.state?.().kind==='subscription'&&!window.GESPascoAccess.fullAccess()){window.GESPascoDevices?.open();return;}window.GESPascoMomo?.openForRenewal?.();});
 window.addEventListener('ges-pasco-premium-unavailable',event=>{if(window.GESPascoAccess?.fullAccess?.()!==true)return;const message=document.getElementById('premiumAccessMessage'),subscribe=document.getElementById('premiumAccessSubscribe'),modal=document.getElementById('premiumAccessDialog');if(message)message.textContent='Your account has full access, but the protected library could not be opened: '+(event.detail?.message||'Reconnect and try again.');if(subscribe)subscribe.hidden=true;if(modal&&!modal.open)modal.showModal();});
 upload?.addEventListener('click',async()=>{if(upload.disabled)return;upload.disabled=true;epubInput.disabled=true;bankInput.disabled=true;try{await uploadFiles(epubInput.files[0],bankInput.files[0]);}catch(error){setStatus(error.message||'Upload did not finish. Existing protected content remains active.');}finally{upload.disabled=false;epubInput.disabled=false;bankInput.disabled=false;}});
 gesPascoAuth.onAuthStateChanged(async user=>{adminUid='';if(entry)entry.hidden=true;if(!user)return;try{const snap=await db.collection('paymentAdmins').doc(user.uid).get({source:'server'});if(gesPascoAuth.currentUser?.uid!==user.uid)return;adminUid=snap.exists&&snap.data().active===true?user.uid:'';if(entry)entry.hidden=!adminUid;}catch{}});
 window.addEventListener('ges-pasco-access-updated',event=>{const d=event.detail||{};const clearPrivateCache=uid=>{idbDelete(uid);try{localStorage.removeItem('ges-pasco-premium-banks-'+uid);localStorage.removeItem('ges-pasco-published-quizzes-'+uid);}catch{}};if(activeFullUid&&(!d.fullAccess||d.uid!==activeFullUid)){clearPrivateCache(activeFullUid);activeFullUid='';}if(d.uid&&!d.fullAccess)clearPrivateCache(d.uid);if(d.fullAccess&&d.uid)activeFullUid=d.uid;});
 window.GESPascoPremiumContent={isSampleHref,readableHref,showPaywall:paywall,bookBlob,practiceBanks,hasOfflineBook:async uid=>!!(await idbRead(uid))?.blob,hasFullContent:()=>loadedFullContent};
})();
