/* Compare the running page, active worker and a fresh published release before reporting current. */
(() => {
 'use strict';
 const running=globalThis.GES_PASCO_VERSION,check=document.getElementById('checkUpdatesBtn'),install=document.getElementById('installUpdateBtn'),status=document.getElementById('updateStatus');
 document.querySelectorAll('[data-profile-version]').forEach(el=>el.textContent='v'+running);
 let registration=null,checking=false,installing=false,reloadRequested=false,latest=null,active=null,changed=false,activationCheck=null;
 const say=text=>status.textContent=text;
 function newer(a,b){const parse=v=>String(v||'').replace(/^v/,'').split('.').map(Number);if(!/^v?\d+\.\d+\.\d+$/.test(a||''))return false;const x=parse(a),y=parse(b);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
 const reloadNeeded=()=>changed||newer(active,running)||newer(latest,running);
 function render(){check.disabled=checking||installing||!registration;install.hidden=!registration?.waiting&&!reloadNeeded();install.disabled=checking||installing||!!registration?.installing;install.textContent=installing?'Installing...':registration?.waiting?'Install update':'Reload app';}
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
  if(registration?.installing){say('Downloading update...');render();return;}
  if(reloadNeeded()){say('A newer release is available. Reload the app to finish updating.');render();return;}
  if(verified&&latest===running&&active?.replace(/^v/,'')===running)say('You are up to date.');
  else say(verified?'The app cache is not yet verified. Check again before going offline.':'Check for a newer release.');
  render();
 }
 function waitForInstall(worker){return new Promise((resolve,reject)=>{
  let done=false;const timer=setTimeout(()=>finish(Error('Update download timed out.')),60000);
  function finish(error){if(done)return;done=true;clearTimeout(timer);worker.removeEventListener?.('statechange',change);error?reject(error):resolve();}
  function change(){if(['installed','activated'].includes(worker.state))finish();else if(worker.state==='redundant')finish(Error('Update download failed.'));}
  worker.addEventListener?.('statechange',change);change();
 });}
 function activateUpdate(worker){return new Promise((resolve,reject)=>{
  let done=false;const channel=new MessageChannel();const timer=setTimeout(()=>finish(Error('Update activation timed out.')),30000);
  const poll=setInterval(change,250);
  function finish(error){if(done)return;done=true;clearTimeout(timer);clearInterval(poll);channel.port1.close();worker.removeEventListener?.('statechange',change);if(activationCheck===change)activationCheck=null;error?reject(error):resolve();}
  function change(){if(navigator.serviceWorker.controller===worker||(['activating','activated'].includes(worker.state)&&registration.active===worker))finish();else if(worker.state==='redundant')finish(Error('Update activation failed.'));}
  activationCheck=change;worker.addEventListener?.('statechange',change);
  // Navigation after this worker's acknowledgement releases old live requests that can block activation.
  channel.port1.onmessage=e=>{const version=String(e.data?.version||'').replace(/^v/,'');if(e.data?.activationRequested===true&&/^\d+\.\d+\.\d+$/.test(version)&&!newer(running,version))finish();};
  try{change();if(!done)worker.postMessage('SKIP_WAITING',[channel.port2]);}catch(error){finish(error);}
 });}
 function watch(worker){if(!worker)return;worker.addEventListener('statechange',async()=>{if(worker.state==='installed'){if(installing)return;checking=false;active=await workerVersion(registration.active||navigator.serviceWorker.controller);describe();}else if(worker.state==='redundant'){checking=false;say('Update could not be prepared. Check your connection and retry.');render();}});}
 async function checkUpdates(){
  if(!registration||checking||installing)return;
  if(!navigator.onLine){say('Connect to the internet to check the latest release.');render();return;}
  checking=true;say('Checking latest release...');render();let verified=false;
  try{
   latest=await publishedVersion();verified=true;
   await registration.update();active=await workerVersion(registration.active||navigator.serviceWorker.controller);
   if(registration.installing){watch(registration.installing);say('Downloading update...');await waitForInstall(registration.installing);}
   describe(verified);
  }catch(e){active=await workerVersion(registration.active||navigator.serviceWorker.controller);if(registration.waiting||reloadNeeded())describe();else say('Could not verify the latest release. Please retry.');console.warn('Update check failed:',e);}
  finally{checking=false;render();}
 }
 async function installUpdate(){
  if(installing||reloadRequested||(!registration?.waiting&&!reloadNeeded()))return;
  installing=true;say('Installing update...');render();
  try{
   try{await Promise.race([window.gesPascoReaderSync?.flush(),new Promise(resolve=>setTimeout(resolve,1500))]);}catch{}
   if(registration.installing)await waitForInstall(registration.installing);
   if(!registration.waiting&&newer(latest,running)&&!newer(active,running)&&!changed){
    await registration.update();if(registration.installing)await waitForInstall(registration.installing);
    active=await workerVersion(registration.active||navigator.serviceWorker.controller);
    if(!registration.waiting&&!newer(active,running))throw Error('The new app cache is not ready yet.');
   }
   const worker=registration.waiting;if(worker)await activateUpdate(worker);
   if(!reloadRequested){reloadRequested=true;say('Finishing update. Refreshing...');location.reload();}
  }catch(error){installing=false;say('Could not finish the update. Check your connection and retry Install update.');render();console.warn('Update installation failed:',error);}
 }
 check.addEventListener('click',checkUpdates);install.addEventListener('click',installUpdate);
 if(!('serviceWorker' in navigator)){say('App updates are not supported in this browser.');check.disabled=true;return;}
 navigator.serviceWorker.addEventListener('controllerchange',async()=>{if(installing){activationCheck?.();return;}active=await workerVersion(navigator.serviceWorker.controller);changed=newer(active,running);describe();});
 check.disabled=true;
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async value=>{registration=value;registration.addEventListener('updatefound',()=>{say('Downloading update...');watch(registration.installing);});active=await workerVersion(registration.active||navigator.serviceWorker.controller);if(registration.installing)watch(registration.installing);describe();}).catch(e=>{say('Update service unavailable. Reopen the app online and retry.');console.warn('Service worker registration failed:',e);});
})();
