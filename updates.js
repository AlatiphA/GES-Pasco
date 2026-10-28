/* Compare the running page, active worker and a fresh published release before reporting current. */
(() => {
 'use strict';
 const running=globalThis.GES_PASCO_VERSION,check=document.getElementById('checkUpdatesBtn'),install=document.getElementById('installUpdateBtn'),status=document.getElementById('updateStatus');
 document.querySelectorAll('[data-profile-version]').forEach(el=>el.textContent='v'+running);
 let registration=null,checking=false,installing=false,reloadRequested=false,latest=null,active=null,changed=false;
 const say=text=>status.textContent=text;
 function newer(a,b){const parse=v=>String(v||'').replace(/^v/,'').split('.').map(Number);if(!/^v?\d+\.\d+\.\d+$/.test(a||''))return false;const x=parse(a),y=parse(b);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
 const reloadNeeded=()=>changed||newer(active,running)||newer(latest,running);
 function render(){check.disabled=checking||installing||!registration;install.hidden=!registration?.waiting&&!reloadNeeded();install.disabled=checking||installing||!!registration?.installing;install.textContent=registration?.waiting?'Install update':'Reload app';}
 function ready(){say('Update ready to install.');render();}
 function workerVersion(worker){return new Promise(resolve=>{if(!worker){resolve(null);return;}const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(null);},2500);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(typeof e.data==='string'?e.data:null);};worker.postMessage('GET_VERSION',[channel.port2]);});}
 async function publishedVersion(){
  const url=new URL('./version.js',location.href);url.searchParams.set('release-check',Date.now()+'-'+Math.random());
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(url.href,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Release check unavailable');
   const match=(await response.text()).match(/GES_PASCO_VERSION\s*=\s*["'](\d+\.\d+\.\d+)["']/);if(!match)throw Error('Release metadata unavailable');return match[1];
  }finally{clearTimeout(timer);}
 }
 function describe(verified=false){
  if(registration?.waiting){ready();return;}
  if(registration?.installing){say('Downloading update…');render();return;}
  if(reloadNeeded()){say('A newer release is available. Reload the app to finish updating.');render();return;}
  if(verified&&latest===running&&active?.replace(/^v/,'')===running)say('You are up to date.');
  else say(verified?'The app cache is not yet verified. Check again before going offline.':'Check for a newer release.');
  render();
 }
 function watch(worker){if(!worker)return;worker.addEventListener('statechange',async()=>{if(worker.state==='installed'){checking=false;active=await workerVersion(registration.active||navigator.serviceWorker.controller);describe();}else if(worker.state==='redundant'){checking=false;say('Update could not be prepared. Check your connection and retry.');render();}});}
 async function checkUpdates(){
  if(!registration||checking||installing)return;
  if(!navigator.onLine){say('Connect to the internet to check the latest release.');render();return;}
  checking=true;say('Checking latest release…');render();let verified=false;
  try{
   latest=await publishedVersion();verified=true;
   await registration.update();active=await workerVersion(registration.active||navigator.serviceWorker.controller);
   if(registration.installing)watch(registration.installing);
   describe(verified);
  }catch(e){active=await workerVersion(registration.active||navigator.serviceWorker.controller);if(registration.waiting||reloadNeeded())describe();else say('Could not verify the latest release. Please retry.');console.warn('Update check failed:',e);}
  finally{checking=false;render();}
 }
 async function installUpdate(){
  if(installing||(!registration?.waiting&&!reloadNeeded()))return;
  installing=true;say(registration.waiting?'Installing update…':'Reloading the latest app…');render();
  try{await Promise.race([window.gesPascoReaderSync?.flush(),new Promise(resolve=>setTimeout(resolve,1500))]);}catch{}
  if(registration.waiting){registration.waiting.postMessage('SKIP_WAITING');setTimeout(()=>{if(!reloadRequested){installing=false;changed=true;say('Reload the app to finish updating.');render();}},15000);}
  else{reloadRequested=true;location.reload();}
 }
 check.addEventListener('click',checkUpdates);install.addEventListener('click',installUpdate);
 if(!('serviceWorker' in navigator)){say('App updates are not supported in this browser.');check.disabled=true;return;}
 navigator.serviceWorker.addEventListener('controllerchange',async()=>{if(installing&&!reloadRequested){reloadRequested=true;location.reload();return;}active=await workerVersion(navigator.serviceWorker.controller);changed=newer(active,running);describe();});
 check.disabled=true;
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async value=>{registration=value;registration.addEventListener('updatefound',()=>{say('Downloading update…');watch(registration.installing);});active=await workerVersion(registration.active||navigator.serviceWorker.controller);if(registration.installing)watch(registration.installing);describe();}).catch(e=>{say('Update service unavailable. Reopen the app online and retry.');console.warn('Service worker registration failed:',e);});
})();
