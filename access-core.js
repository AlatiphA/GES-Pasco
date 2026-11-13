/* Trial age is the original account age; free accounts keep the sample library. */
(function(root){
 const trialMs=3*86400000,offlineMs=7*86400000;
 function evaluate({createdAtMs,authCreatedAtMs,endsAtMs=0,admin=false,control={}},now=Date.now()){
  const dates=[createdAtMs,authCreatedAtMs].filter(n=>Number.isFinite(n)&&n>0),created=dates.length?Math.min(...dates):0;
  if(admin)return {allowed:true,fullAccess:true,isAdmin:true,kind:'administrator',expiresAtMs:now+offlineMs};
  if(control?.status==='suspended')return {allowed:false,fullAccess:false,isAdmin:false,kind:'suspended',expiresAtMs:0};
  if((control?.accessMode==='full-access'||control?.accessMode==='free'))return {allowed:true,fullAccess:true,isAdmin:false,kind:'full-grant',expiresAtMs:now+offlineMs};
  if(control?.accessMode!=='trial-only'&&Number.isFinite(endsAtMs)&&endsAtMs>now)return {allowed:true,fullAccess:true,isAdmin:false,kind:'subscription',expiresAtMs:endsAtMs};
  const end=created?created+trialMs:0;
  if(created&&now>=created-60000&&now<end)return {allowed:true,fullAccess:false,isAdmin:false,kind:'trial',expiresAtMs:end};
  return {allowed:true,fullAccess:false,isAdmin:false,kind:'free',expiresAtMs:now+offlineMs};
 }
 function offline(record,uid,now=Date.now()){
  if(!uid)return {allowed:false,fullAccess:false,isAdmin:false,kind:'unverified',expiresAtMs:0};
  if(record?.uid===uid&&record.kind==='suspended')return {allowed:false,fullAccess:false,isAdmin:false,kind:'suspended',expiresAtMs:0};
  if(!record||record.uid!==uid||record.accessModelVersion!==2||!Number.isFinite(record.checkedAtMs)||now<record.checkedAtMs-60000)return {allowed:true,fullAccess:false,isAdmin:false,kind:'free',expiresAtMs:now+offlineMs};
  if(!Number.isFinite(record.expiresAtMs)||now>=record.expiresAtMs){
   return {allowed:true,fullAccess:false,isAdmin:false,kind:'free',expiresAtMs:now+offlineMs};
  }
  return {allowed:record.allowed===true,fullAccess:record.allowed===true&&record.fullAccess===true,isAdmin:record.allowed===true&&record.isAdmin===true,kind:record.kind||'free',expiresAtMs:record.expiresAtMs};
 }
 const api={evaluate,offline,trialMs,offlineMs};if(typeof module==='object')module.exports=api;else root.GESPascoAccessCore=api;
})(typeof window==='object'?window:globalThis);
