/* Full-page host for the existing, permission-checked administration tools. */
(()=>{
 const workspace=document.getElementById('adminWorkspace'),notice=document.getElementById('adminAccess'),identity=document.getElementById('adminIdentity');
 const entries=[...document.querySelectorAll('[data-admin-view]')],panels=[...document.querySelectorAll('.adminPanel')],guards=[];
 let verified=false,financial=false,reviewer=false,epoch=0,selected=null,requested=location.hash.slice(1)||'users';
 function mayLeave(){
  if(guards.some(check=>!check())){notice.textContent='Please wait for the current action to finish.';return false;}
  const dirty=panels.find(panel=>!panel.hidden&&panel.dataset.dirty==='true');
  if(dirty&&!confirm('Leave this view? Unsaved edits or an unsent message will be lost.'))return false;
  if(dirty)delete dirty.dataset.dirty;return true;
 }
 function open(panel){
  if(!verified)throw Error('Administrator access has not been verified.');
  for(const other of panels)other.hidden=other!==panel;
  panel.hidden=false;if(!panel.open)panel.show();
  for(const entry of entries)entry.setAttribute('aria-pressed',String(entry===selected));
  if(selected)history.replaceState(null,'','#'+selected.dataset.adminView);
 }
 function firstView(){if(!verified||selected)return;const wanted=entries.find(entry=>entry.dataset.adminView===requested),fallback=entries.find(entry=>!entry.hidden),entry=wanted&&!wanted.hidden?wanted:requested==='users'&&!financial?fallback:null;if(entry)entry.click();}
 window.GESPascoAdminPage={open,registerGuard:check=>guards.push(check),saved:panel=>{delete panel.dataset.dirty;}};
 // Quiz administration uses the protected library only after the server verifies a role.
 window.GESPascoAccess={fullAccess:()=>verified&&(financial||reviewer)};
 window.GESPascoInbox={saveReview:async(reportId,reporterUid,review)=>{
  if(!verified||!reviewer||!reporterUid)throw Error('Reviewer access is required.');
  const batch=gesPascoDb.batch();batch.update(gesPascoDb.collection('questionReports').doc(reportId),review);
  batch.set(gesPascoDb.collection('users').doc(reporterUid).collection('notifications').doc(reportId),{reportId,body:review.reviewNote,status:review.status,updatedAt:review.updatedAt});await batch.commit();
 }};
 for(const entry of entries){entry.addEventListener('click',event=>{if(!verified||!mayLeave()){event.preventDefault();event.stopImmediatePropagation();return;}selected=entry;},true);new MutationObserver(firstView).observe(entry,{attributes:true,attributeFilter:['hidden']});}
 document.getElementById('adminBack').addEventListener('click',event=>{if(!mayLeave())event.preventDefault();});
 document.addEventListener('input',event=>{const panel=event.target.closest('.adminPanel');if(panel&&!event.target.closest('.userSearch'))panel.dataset.dirty='true';});
 window.addEventListener('beforeunload',event=>{if(guards.some(check=>!check())||panels.some(panel=>panel.dataset.dirty==='true')){event.preventDefault();event.returnValue='';}});
 document.getElementById('adminRetry').onclick=()=>{if(mayLeave())location.reload();};
 document.addEventListener('DOMContentLoaded',()=>{
  gesPascoAuth.onAuthStateChanged(async user=>{
   const token=++epoch;verified=financial=reviewer=false;selected=null;workspace.hidden=true;for(const panel of panels){panel.hidden=true;delete panel.dataset.dirty;}
   identity.textContent=user?'Signed in as '+(user.email||'your GES Pasco account'):'';
   if(!user){notice.textContent='Sign in through the reader with an administrator account, then return here.';return;}
   notice.textContent='Checking administrator access…';let timer;
   try{
    const [payment,report,deleting]=await Promise.race([Promise.all(['paymentAdmins','reportAdmins','accountDeletions'].map(collection=>gesPascoDb.collection(collection).doc(user.uid).get({source:'server'}))),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The access check timed out. Connect and retry.')),15000);})]);
    if(token!==epoch||gesPascoAuth.currentUser?.uid!==user.uid)return;
    if(deleting.exists||localStorage.getItem('ges-pasco-deleting-'+user.uid)==='true')throw Error('Account deletion is in progress. Return to the reader to finish.');
    financial=payment.exists&&payment.data().active===true;reviewer=report.exists&&report.data().active===true;
    if(!financial&&!reviewer)throw Error('This account does not have administrator access.');
    verified=true;workspace.hidden=false;notice.textContent='Administrator access verified. Only your permitted tools are shown.';
    const wanted=entries.find(entry=>entry.dataset.adminView===requested);if(!wanted||(wanted.dataset.role==='payment'&&!financial)||(wanted.dataset.role==='review'&&!reviewer))requested=financial?'users':'reports';firstView();
   }catch(error){if(token===epoch)notice.textContent=error.message||'Connect to verify administrator access.';}finally{clearTimeout(timer);}
  });
 });
})();
