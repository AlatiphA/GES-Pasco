/* Readiness is verified by the active worker, including external reader libraries. */
(() => {
  const status=document.getElementById('offlineStatus');
  const check=document.getElementById('offlineCheck'),download=document.getElementById('offlineDownload');
  let busy=false;
  const supported='serviceWorker' in navigator && 'caches' in window;
  function buttons(){check.disabled=busy||!supported;download.disabled=busy||!supported||navigator.onLine===false;}
  function ask(message){return new Promise((resolve,reject)=>{
    const worker=navigator.serviceWorker.controller;
    if(!worker){reject(Error('Reopen the app after installing the latest update, then check again.'));return;}
    const channel=new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();reject(Error('Install the latest app update and reopen it, then check again.'));},message==='PREPARE_OFFLINE'?90000:8000);
    channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();e.data.error?reject(Error(e.data.error)):resolve(e.data);};
    worker.postMessage(message,[channel.port2]);
  });}
  async function run(repair=false){
    if(busy)return;
    if(!supported){status.textContent='Offline downloads are unavailable in this browser.';buttons();return;}
    if(repair&&navigator.onLine===false){status.textContent='Connect to the internet to download or repair reader files.';return;}
    busy=true;buttons();status.textContent=repair?'Downloading the book and reader files… Keep this app open.':'Checking saved reader files…';
    try{
      const result=await ask(repair?'PREPARE_OFFLINE':'OFFLINE_STATUS');
      if(result.version!=='v'+globalThis.GES_PASCO_VERSION)throw Error('Install the latest app update and reopen it, then check again.');
      status.textContent=result.ready?'Ready for offline reading on this browser. Keep your account signed in.':result.missing+' reader file(s) missing. Connect and choose Download / repair.';
    }catch(e){status.textContent=e.message||'Could not check offline storage. Please retry.';}
    finally{busy=false;buttons();}
  }
  check.addEventListener('click',()=>run());download.addEventListener('click',()=>run(true));
  document.getElementById('offlineReadingSection').addEventListener('toggle',e=>{if(e.target.open)run();});
  window.addEventListener('online',()=>{buttons();run();});window.addEventListener('offline',()=>{buttons();run();});
  navigator.serviceWorker?.addEventListener('controllerchange',()=>run());
  buttons();run();
})();
