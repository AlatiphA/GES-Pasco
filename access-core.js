/* Trial age is original account age, never installation or first-visit age. */
(function(root){
 const trialMs=7*86400000;
 function evaluate({createdAtMs,authCreatedAtMs,endsAtMs=0,admin=false},now=Date.now()){
 const dates=[createdAtMs,authCreatedAtMs].filter(n=>Number.isFinite(n)&&n>0),created=dates.length?Math.min(...dates):0;
 if(admin)return {allowed:true,kind:'administrator',expiresAtMs:now+86400000};
 if(Number.isFinite(endsAtMs)&&endsAtMs>now)return {allowed:true,kind:'subscription',expiresAtMs:endsAtMs};
 const end=created?created+trialMs:0;
 return {allowed:!!created&&now>=created-60000&&now<end,kind:created?'trial':'unverified',expiresAtMs:end};
 }
 function offline(record,uid,now=Date.now()){if(!record||record.uid!==uid||!Number.isFinite(record.checkedAtMs)||now<record.checkedAtMs-60000||!Number.isFinite(record.expiresAtMs)||now>=record.expiresAtMs)return {allowed:false,kind:'unverified',expiresAtMs:0};return {allowed:record.allowed===true,kind:record.kind,expiresAtMs:record.expiresAtMs};}
 const api={evaluate,offline,trialMs};if(typeof module==='object')module.exports=api;else root.GESPascoAccessCore=api;
})(typeof window==='object'?window:globalThis);
