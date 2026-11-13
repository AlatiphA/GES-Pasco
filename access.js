(()=>{
 const core=window.GESPascoAccessCore,gate=document.getElementById('accessGate'),label=document.getElementById('accessMessage'),retry=document.getElementById('accessRetry');
 let owner='',epoch=0,state={allowed:false,fullAccess:false,isAdmin:false,kind:'unverified',expiresAtMs:0},busy=false,stopControl=null,source=null;
 const key=uid=>'ges-pasco-access-'+uid;
 function cached(uid){try{return JSON.parse(localStorage.getItem(key(uid)));}catch{return null;}}
 function remember(){if(!owner)return;try{localStorage.setItem(key(owner),JSON.stringify({...state,uid:owner,accessModelVersion:2,checkedAtMs:Date.now()}));}catch{}}
 function render(){
  const locked=!!owner&&!state.allowed;gate.hidden=!locked;document.documentElement.toggleAttribute('data-access-locked',locked);document.getElementById('viewer').inert=locked;
  if(locked)label.textContent=state.kind==='suspended'?'Your app access has been suspended. Contact support using your account settings.':'Connect to verify your account access. Sample chapters remain available after verification.';
  const detail=document.getElementById('accountAccessStatus');
  if(detail)detail.textContent=state.fullAccess?(state.kind==='administrator'?'Administrator access':state.kind==='full-grant'?'Full access granted':'Active subscription · ends '+new Date(state.expiresAtMs).toLocaleString()):(state.kind==='trial'?'Three-day sample trial · ends '+new Date(state.expiresAtMs).toLocaleString():state.kind==='suspended'?'Access suspended':'Free sample access');
  window.dispatchEvent(new CustomEvent('ges-pasco-access-updated',{detail:{uid:owner,allowed:state.allowed,fullAccess:state.fullAccess===true,isAdmin:state.isAdmin===true,kind:state.kind,expiresAtMs:state.expiresAtMs}}));
 }
 async function prepare(user){
  const token=++epoch;stopControl?.();stopControl=null;source=null;owner=user?.uid||'';state=owner?core.offline(cached(owner),owner):{allowed:false,fullAccess:false,isAdmin:false,kind:'unverified',expiresAtMs:0};render();
  if(!owner||navigator.onLine===false)return state.allowed;
  let timer;
  try{
   const result=await Promise.race([Promise.all([gesPascoDb.collection('users').doc(owner).get({source:'server'}),gesPascoDb.collection('subscriptions').doc(owner).get({source:'server'}),gesPascoDb.collection('paymentAdmins').doc(owner).get({source:'server'}),gesPascoDb.collection('reportAdmins').doc(owner).get({source:'server'}),gesPascoDb.collection('accountControls').doc(owner).get({source:'server'})]),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Access check timed out')),15000);})]);
   if(token!==epoch||gesPascoAuth.currentUser?.uid!==owner)return false;
   const [profile,subscription,admin,reviewAdmin,control]=result;source={createdAtMs:profile.data()?.createdAt?.toMillis?.(),authCreatedAtMs:Date.parse(user.metadata?.creationTime),endsAtMs:subscription.data()?.endsAtMs,admin:(admin.exists&&admin.data().active===true)||(reviewAdmin.exists&&reviewAdmin.data().active===true),control:control.data()||{}};state=core.evaluate(source);remember();
   const stopControls=gesPascoDb.collection('accountControls').doc(owner).onSnapshot(snapshot=>{if(token!==epoch||snapshot.metadata?.fromCache)return;source.control=snapshot.data()||{};state=core.evaluate(source);remember();render();},()=>{});
   const stopSubscription=gesPascoDb.collection('subscriptions').doc(owner).onSnapshot(snapshot=>{if(token!==epoch||snapshot.metadata?.fromCache)return;source.endsAtMs=snapshot.data()?.endsAtMs;state=core.evaluate(source);remember();render();},()=>{});
   stopControl=()=>{stopControls();stopSubscription();};
  }catch{if(token===epoch){state=core.offline(cached(owner),owner);}}
  finally{clearTimeout(timer);}
  if(token!==epoch)return false;render();return state.allowed;
 }
 async function refresh(){if(busy||!gesPascoAuth.currentUser)return;busy=true;retry.disabled=true;label.textContent='Checking your account access…';try{if(await prepare(gesPascoAuth.currentUser))location.reload();}finally{busy=false;retry.disabled=false;}}
 retry.onclick=refresh;
 document.getElementById('accessPlans').onclick=()=>{const openPayments=window.GESPascoMomo?.openForRenewal;if(typeof openPayments!=='function'){label.textContent='Payment options are still loading. Please try again in a moment.';return;}Promise.resolve(openPayments()).catch(()=>{label.textContent='Payment options could not be opened. Please try again.';});};
 document.getElementById('accessAccount').onclick=()=>document.getElementById('profileBtn').click();document.getElementById('accessSignOut').onclick=()=>gesPascoAuth.signOut();
 function refreshExpiry(){if(!owner||Date.now()<state.expiresAtMs||(!state.fullAccess&&state.kind!=='trial'))return;state=source?core.evaluate(source):{allowed:true,fullAccess:false,isAdmin:false,kind:'free',expiresAtMs:Date.now()+core.offlineMs};remember();render();}
 setInterval(refreshExpiry,1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshExpiry();});
 gesPascoAuth.onAuthStateChanged(user=>{if(!user||user.uid!==owner){epoch++;stopControl?.();stopControl=null;owner='';source=null;state={allowed:false,fullAccess:false,isAdmin:false,kind:'unverified',expiresAtMs:0};render();}});
 function openCached(user){const token=++epoch;stopControl?.();stopControl=null;source=null;owner=user?.uid||'';state=owner?core.offline(cached(owner),owner):{allowed:false,fullAccess:false,isAdmin:false,kind:'unverified',expiresAtMs:0};render();return token===epoch&&state.allowed;}
 function lockForDeletion(){state={allowed:false,fullAccess:false,isAdmin:false,kind:'suspended',expiresAtMs:0};render();}
 window.GESPascoAccess={prepare,openCached,lockForDeletion,allowed:()=>!!owner&&owner===gesPascoAuth.currentUser?.uid&&state.allowed&&Date.now()<state.expiresAtMs,fullAccess:()=>!!owner&&owner===gesPascoAuth.currentUser?.uid&&state.allowed&&state.fullAccess===true&&Date.now()<state.expiresAtMs,isAdmin:()=>!!owner&&owner===gesPascoAuth.currentUser?.uid&&state.isAdmin===true,state:()=>({...state}),refresh};
})();
