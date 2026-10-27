/* Explicit PWA updates; registration also works when authentication finishes after load. */
(() => {
  'use strict';
  const check=document.getElementById('checkUpdatesBtn');
  const install=document.getElementById('installUpdateBtn');
  const status=document.getElementById('updateStatus');
  document.querySelectorAll('[data-profile-version]').forEach(el=>el.textContent='v'+globalThis.GES_PASCO_VERSION);
  let registration=null,checking=false,installing=false,reloadRequested=false;
  const say=text=>{status.textContent=text;};
  function render(){check.disabled=checking||installing||!registration;install.hidden=!registration?.waiting;install.disabled=installing;}
  function ready(){if(registration?.waiting){say('Update ready to install.');render();}}
  function watch(worker){
    if(!worker)return;
    worker.addEventListener('statechange',()=>{
      if(worker.state==='installed'){
        checking=false;
        if(registration.waiting)ready();else{say('App is ready for offline use.');render();}
      }else if(worker.state==='redundant'){checking=false;say('Update could not be prepared. Check your connection and retry.');render();}
    });
  }
  async function checkUpdates(){
    if(!registration||checking||installing)return;
    if(!navigator.onLine){say('Connect to the internet to check for updates.');return;}
    checking=true;say('Checking for updates…');render();
    try{await registration.update();if(registration.waiting){checking=false;ready();}else if(registration.installing){say('Downloading update…');watch(registration.installing);}else{checking=false;say('You are up to date.');}}
    catch(e){checking=false;say('Could not check for updates. Please retry.');console.warn('Update check failed:',e);}
    render();
  }
  async function installUpdate(){
    if(!registration?.waiting||installing)return;
    installing=true;say('Installing update…');render();
    // Reader page turns are saved locally before cloud sync is queued.
    try{await Promise.race([window.gesPascoReaderSync?.flush(),new Promise(resolve=>setTimeout(resolve,1500))]);}catch{}
    if(!registration.waiting){installing=false;say('Update state changed. Check for updates again.');render();return;}
    registration.waiting.postMessage('SKIP_WAITING');
    setTimeout(()=>{if(!reloadRequested){installing=false;say('Reopen the app to finish updating, or try again.');render();}},15000);
  }
  check.addEventListener('click',checkUpdates);install.addEventListener('click',installUpdate);
  if(!('serviceWorker' in navigator)){say('App updates are not supported in this browser.');check.disabled=true;return;}
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(installing&&!reloadRequested){reloadRequested=true;location.reload();}
    else if(registration){say('App files updated. Reopen the app to use the latest release.');render();}
  });
  check.disabled=true;
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(value=>{
    registration=value;
    registration.addEventListener('updatefound',()=>{say('Downloading update…');watch(registration.installing);});
    if(registration.waiting)ready();else if(registration.installing){say('Preparing app files…');watch(registration.installing);}else say('Check for a newer release.');
    render();
  }).catch(e=>{say('Update service unavailable. Reopen the app online and retry.');console.warn('Service worker registration failed:',e);});
})();
