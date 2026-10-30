/* GES Pasco v1.0.8: account-scoped local data and durable synchronization. */
(() => {
  'use strict';
  const keys = ['ges-pasco-data','ges-pasco-bookmarks','ges-pasco-preferences-meta','theme-v2','reader-theme','fontSize','fontFamily'];
  let user = null, epoch = 0, timer, running = false, failed = false, storageFailed = false;
  let pending = {}, records = {};
  const scoped = key => keys.includes(key) ? key + '-user-' + (user?.uid || 'signed-out') : key;
  const storage = window.gesPascoStorage = {
    getItem: key => localStorage.getItem(scoped(key)),
    setItem(key,value) { try { localStorage.setItem(scoped(key),value); } catch(e) { storageFailed=true; render(); throw e; } },
    removeItem: key => localStorage.removeItem(scoped(key))
  };
  function read(key,fallback) { try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function ownKey(name) { return 'ges-pasco-sync-'+user.uid+'-'+name; }
  function persist() {
    if(!user)return;
    try { localStorage.setItem(ownKey('pending'),JSON.stringify(pending)); localStorage.setItem(ownKey('records'),JSON.stringify(records)); }
    catch { storageFailed=true; }
    render();
  }
  function render() {
    const label=document.getElementById('syncStatus'),button=document.getElementById('syncRetry');
    if(label)label.textContent=storageFailed?'Device storage unavailable':!navigator.onLine?'Offline — saved on this device':running?'Syncing…':failed?'Sync unavailable — saved on this device':Object.keys(pending).length?'Saved on this device — sync pending':'Synced';
    if(button) { button.disabled=!user||!navigator.onLine||running; button.onclick=()=>flush(true); }
  }
  function dirty(key,value) { pending[key]={value,revision:Date.now()+'-'+Math.random()}; persist(); clearTimeout(timer); timer=setTimeout(flush,1500); }
  const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
  function id(cfi) { let h=2166136261; for(const c of cfi){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 'b_'+(h>>>0).toString(36); }
  function normalize(b) {return {cfi:String(b.cfi),chapter:String(b.chapter||''),progress:Number(b.progress)||0,date:b.date||new Date().toISOString(),deleted:!!b.deleted};}
  function visible() { storage.setItem('ges-pasco-bookmarks',JSON.stringify(Object.values(records).filter(b=>!b.deleted))); }
  function queue(data) { if(user&&data?.location)dirty('position',data); }
  function queuePreferences(p) {
    const value={theme:p.theme||'dark',fontSize:Number(p.fontSize)||100,fontFamily:p.fontFamily||'serif',lastChanged:new Date().toISOString()};
    for(const k of ['theme','fontSize','fontFamily'])storage.setItem(k==='theme'?'theme-v2':k,String(value[k]));
    storage.setItem('ges-pasco-preferences-meta',value.lastChanged);
    if(user)dirty('preferences',value);
  }
  function syncBookmarks(bookmarks) {
    if(!user)return;
    const wanted=new Map(bookmarks.map(b=>[b.cfi,normalize(b)]));
    for(const [cfi,b] of Object.entries(records))if(!b.deleted&&!wanted.has(cfi)) {const value={...b,deleted:true,date:new Date().toISOString()};records[cfi]=value;dirty('bookmark|'+cfi,value);}
    for(const [cfi,b] of wanted)if(!records[cfi]||records[cfi].deleted||JSON.stringify(normalize(records[cfi]))!==JSON.stringify(b)){records[cfi]=b;dirty('bookmark|'+cfi,b);}
    persist();
  }
  const practiceKey=uid=>'ges-pasco-practice-'+uid+'-history';
  function practiceRows(uid){try{return JSON.parse(localStorage.getItem(practiceKey(uid)))||[];}catch{return [];}}
  function queuePractice(){if(!user||window.GESPascoDataAccounts?.operationFor(user.uid))return;const core=window.GESPascoPracticeSyncCore;if(!core)return;for(const row of core.merge(practiceRows(user.uid),[],user.uid))dirty('practice|'+row.id,core.encode(row));}
  async function pullPractice(context,token){
    const snapshot=await gesPascoDb.collection('users').doc(context.uid).collection('practiceResults').orderBy('finishedAtMs','desc').limit(20).get({source:'server'});
    if(token!==epoch)return;
    const core=window.GESPascoPracticeSyncCore,remote=snapshot.docs.map(d=>core.decode(d.data(),context.uid)).filter(Boolean);
    const merged=core.merge(practiceRows(context.uid),remote,context.uid);
    localStorage.setItem(practiceKey(context.uid),JSON.stringify(merged));
    window.dispatchEvent(new Event('ges-pasco-practice-updated'));
  }
  async function pull(context,token) {
    const root=gesPascoDb.collection('users').doc(context.uid);
    const before=storage.getItem('ges-pasco-data');
    const beforePrefs=storage.getItem('ges-pasco-preferences-meta');
    const [position,prefs,marks]=await Promise.all([root.collection('readerData').doc('default').get({source:'server'}),root.collection('readerData').doc('preferences').get({source:'server'}),root.collection('bookmarks').get({source:'server'})]);
    if(token!==epoch)return;
    const local=read('ges-pasco-data',{}),remote=position.exists?position.data():null;
    if(storage.getItem('ges-pasco-data')===before&&remote&&Date.parse(remote.lastRead)> (Date.parse(local.lastRead)||0)&&!pending.position)storage.setItem('ges-pasco-data',JSON.stringify(remote));
    else if(local.location&&!pending.position&&(!remote||Date.parse(local.lastRead)>Date.parse(remote.lastRead)))dirty('position',local);
    const p=prefs.exists?prefs.data():null;
    if(storage.getItem('ges-pasco-preferences-meta')===beforePrefs&&p&&!pending.preferences&&Date.parse(p.lastChanged)>=(Date.parse(storage.getItem('ges-pasco-preferences-meta'))||0)) {
      storage.setItem('theme-v2',p.theme);storage.setItem('fontSize',String(p.fontSize));storage.setItem('fontFamily',p.fontFamily);storage.setItem('ges-pasco-preferences-meta',p.lastChanged);
    }
    if(!p&&!pending.preferences)queuePreferences({theme:storage.getItem('theme-v2')||'dark',fontSize:Number(storage.getItem('fontSize'))||100,fontFamily:storage.getItem('fontFamily')||'serif'});
    // After first migration, cloud absence is authoritative; deleted records remain explicit.
    const next={}; for(const doc of marks.docs){const b=normalize(doc.data());next[b.cfi]=b;}
    for(const [key,op] of Object.entries(pending))if(key.startsWith('bookmark|'))next[op.value.cfi]=op.value;
    records=next;visible();persist();
    window.dispatchEvent(new Event('ges-pasco-bookmarks-updated'));
    await pullPractice(context,token);
  }
  async function flush(refresh=false) {
    if(!user||!navigator.onLine||running){render();return;}
    const context=user,token=epoch;running=true;failed=false;render();
    const task=(async()=>{
      try {
        const root=gesPascoDb.collection('users').doc(context.uid);
        for(const [key,op] of Object.entries(pending)) {
          if(token!==epoch)return;
          if(key==='position') {const d=op.value;await root.collection('readerData').doc('default').set({location:d.location,chapter:d.chapter||'',progress:Number(d.progress)||0,lastRead:d.lastRead,updatedAt:stamp()});}
          else if(key.startsWith('practice|')){const ref=root.collection('practiceResults').doc(encodeURIComponent(op.value.recordId));const saved=await ref.get({source:'server'});if(token!==epoch)return;if(!saved.exists)await ref.set(op.value);}
          else if(key==='preferences')await root.collection('readerData').doc('preferences').set({...op.value,updatedAt:stamp()});
          else await root.collection('bookmarks').doc(id(op.value.cfi)).set({...op.value,updatedAt:stamp()});
          if(token!==epoch)return;
          if(pending[key]?.revision===op.revision)delete pending[key];persist();
        }
        if(refresh)await pull(context,token);
      } catch(e) {if(token===epoch){failed=true;console.warn('Cloud sync deferred:',e);}}
      finally {if(token===epoch){running=false;persist();if(Object.keys(pending).length){clearTimeout(timer);timer=setTimeout(flush,30000);}}}
    })();await task;
  }
  async function prepare(nextUser) {
    clearUser();user=nextUser;if(!user)return;
    const token=epoch;
    try {pending=JSON.parse(localStorage.getItem(ownKey('pending'))||'{}');records=JSON.parse(localStorage.getItem(ownKey('records'))||'{}');}catch{pending={};records={};}
    const legacyOwner=localStorage.getItem('ges-pasco-legacy-owner');
    if(!legacyOwner&&(localStorage.getItem('ges-pasco-data')||localStorage.getItem('ges-pasco-bookmarks'))&&confirm('Older reading data is saved on this device. Does it belong to '+(user.email||'this account')+'? Choose OK to import it, or Cancel to keep it unassigned.')) {
      for(const key of keys){const value=localStorage.getItem(key);if(value!==null&&storage.getItem(key)===null)storage.setItem(key,value);}
      localStorage.setItem('ges-pasco-legacy-owner',user.uid);
    }
    if(!localStorage.getItem(ownKey('initialized'))){for(const b of read('ges-pasco-bookmarks',[])){const value=normalize(b);records[b.cfi]=value;dirty('bookmark|'+b.cfi,value);}localStorage.setItem(ownKey('initialized'),'true');}
    queuePractice();
    persist();
    // Start restoration without allowing an unavailable server to block offline reading.
    if(!navigator.onLine){render();return;}
    const restore=(async()=>{try{await pull(user,token);if(token===epoch)await flush();}catch(e){if(token===epoch){failed=true;render();}}})();
    await Promise.race([restore,new Promise(resolve=>setTimeout(resolve,4000))]);
  }
  function clearUser(){epoch++;user=null;pending={};records={};running=false;clearTimeout(timer);failed=false;}
  function resetLocal(){if(user)for(const name of ['pending','records','initialized'])localStorage.removeItem(ownKey(name));clearUser();}
  window.addEventListener('online',()=>flush(true));window.addEventListener('offline',render);
  window.addEventListener('pagehide',()=>flush());
  window.gesPascoReaderSync={prepare,queue,queuePreferences,syncBookmarks,flush,clearUser,resetLocal,queuePractice};
})();
