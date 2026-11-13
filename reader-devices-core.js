/* Registration and one-device admission. Server rules validate these transitions. */
(function(root){
 const LEASE_MS=120000,MAX_DEVICES=2;
 const empty=()=>({slot1:'',slot2:'',revision:0});
 const ids=record=>[record?.slot1,record?.slot2].filter(Boolean);
 function register(record,deviceUid){const r={...(record||empty())};if(ids(r).includes(deviceUid))return null;if(ids(r).length>=MAX_DEVICES){const e=Error('Two browsers are already registered. Remove an unused device in Reading and devices, then retry.');e.code='devices/limit';throw e;}r[r.slot1?'slot2':'slot1']=deviceUid;r.revision++;return r;}
 function remove(record,deviceUid){if(!ids(record).includes(deviceUid))throw Error('This device was already removed. Refresh the list.');return {...record,slot1:record.slot1===deviceUid?'':record.slot1,slot2:record.slot2===deviceUid?'':record.slot2,revision:record.revision+1};}
 const millis=value=>typeof value?.toMillis==='function'?value.toMillis():Number(value)||0;
 function mayClaim(lease,record,deviceUid,now=Date.now()){if(!ids(record).includes(deviceUid)){const e=Error('This browser was removed. Register it again from Reading and devices.');e.code='devices/removed';throw e;}if(lease?.active===true&&lease.deviceUid!==deviceUid&&ids(record).includes(lease.deviceUid)&&millis(lease.updatedAt)+LEASE_MS>now){const e=Error('This account is reading on another registered device. Close that reader or release it there, then retry. An interrupted reader releases within two minutes.');e.code='devices/in-use';throw e;}return true;}
 function saved(grant,uid,deviceUid,endsAtMs,now=Date.now()){return !!uid&&grant?.schema===1&&grant.uid===uid&&grant.deviceUid===deviceUid&&Number.isFinite(grant.checkedAtMs)&&now>=grant.checkedAtMs-60000&&Number.isFinite(grant.untilMs)&&now<Math.min(grant.untilMs,endsAtMs);}
 function transient(error){return /^(unavailable|deadline-exceeded|cancelled|network-request-failed|auth\/network-request-failed)$/.test(String(error?.code||''))||/network|timed out|did not respond|failed to fetch/i.test(String(error?.message||''));}
 const api={LEASE_MS,MAX_DEVICES,empty,ids,register,remove,millis,mayClaim,saved,transient};if(typeof module==='object')module.exports=api;else root.GESPascoDeviceCore=api;
})(typeof window==='object'?window:globalThis);
