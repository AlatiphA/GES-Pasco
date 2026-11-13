/* Reporting over immutable approved receipts; no payment or access writes. */
(function(root){
 const plans=typeof module==='object'?require('./momo-core.js').plans:root.GESPascoMomoCore.plans;
 const access=typeof module==='object'?require('./admin-users-core.js'):root.GESPascoAdminUsers,DAY=86400000;
 const ms=value=>typeof value?.toMillis==='function'?value.toMillis():typeof value==='number'?value:0;
 const date=value=>ms(value)>0?new Date(ms(value)).toLocaleString('en-GB',{timeZone:'Africa/Accra',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Not recorded';
 const money=cents=>Number.isSafeInteger(cents)?'GH₵ '+(cents/100).toFixed(2):'Unavailable';
 function csv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let text=value==null?'':String(value);if(typeof value==='string'&&(/^[\t\r\n]/.test(text)||/^\s*[=+@-]/.test(text)))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n')+'\r\n';}
 function download(name,rows){const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function matches(record,{status='all',entitlement='all'}={},now=Date.now()){
  const d=access.describe(record,now),state=d.active?'active':'suspended';
  return (status==='all'||status===state)&&(entitlement==='all'||entitlement==='paid'&&d.paidActive||entitlement==='full'&&d.state.fullAccess||entitlement==='sample'&&d.active&&!d.state.fullAccess||entitlement==='grant'&&['free','full-access'].includes(record.control?.accessMode));
 }
 function report({profiles=[],subscriptions=[],controls=[],requests=[],receipts=[]},now=Date.now()){
  const map=rows=>new Map(rows.map(r=>[r.id,r])),people=map(profiles),paid=map(subscriptions),policies=map(controls),month=new Date(now),monthStartMs=Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1);
  const identity=uid=>{const p=people.get(uid);return {uid,name:p?.displayName||'Account unavailable',email:p?.email||''};};
  const active=profiles.flatMap(profile=>{const subscription=paid.get(profile.id),control=policies.get(profile.id),d=access.describe({profile,subscription,control,admin:profile.admin},now);return !profile.admin&&d.active&&d.paidActive&&control?.accessMode!=='trial-only'?[{...identity(profile.id),plan:plans[subscription.planId]?.label||'Unknown plan',expiresAtMs:subscription.endsAtMs,days:Math.ceil((subscription.endsAtMs-now)/DAY)}]:[];}).sort((a,b)=>a.expiresAtMs-b.expiresAtMs);
  const expiring=active.filter(r=>r.expiresAtMs<=now+7*DAY);
  const pending=requests.filter(r=>r.status==='pending').map(r=>({...identity(r.uid),plan:r.kind==='support'?'Optional support':plans[r.planId]?.label||'Unknown plan',amount:r.amountPesewas,reference:r.reference,createdAtMs:ms(r.createdAt),days:ms(r.createdAt)?Math.max(0,Math.floor((now-ms(r.createdAt))/DAY)):null})).sort((a,b)=>a.createdAtMs-b.createdAtMs);
  let invalid=0;const verified=[];
  for(const r of receipts){const amount=r.amountPesewas,time=ms(r.approvedAt),valid=typeof r.uid==='string'&&r.uid&&typeof r.approvedBy==='string'&&r.approvedBy&&typeof r.requestId==='string'&&r.requestId&&typeof r.reference==='string'&&/^[A-Z0-9-]{6,80}$/.test(r.reference)&&r.id===r.reference&&Number.isSafeInteger(amount)&&amount>=100&&amount<=1000000&&time>0&&time<=now&&((r.kind==='subscription'&&plans[r.planId]?.price===amount)||(r.kind==='support'&&r.planId===''));
   if(!valid){invalid++;continue;}verified.push({...identity(r.uid),kind:r.kind,plan:r.kind==='support'?'Optional support':plans[r.planId].label,amount,reference:r.reference,approvedAtMs:time,approvedBy:r.approvedBy,approver:identity(r.approvedBy).email||r.approvedBy});
  }
  verified.sort((a,b)=>b.approvedAtMs-a.approvedAtMs);const subscriptionsPaid=verified.filter(r=>r.kind==='subscription'),support=verified.filter(r=>r.kind==='support');
  const total=rows=>{const sum=rows.reduce((n,r)=>n+r.amount,0);if(!Number.isSafeInteger(sum))throw Error('Payment total exceeds the supported range.');return sum;};
  return {asOfMs:now,monthStartMs,active,expiring,pending,verified,summary:{users:profiles.length,active:active.length,expiring:expiring.length,pending:pending.length,verifiedCount:subscriptionsPaid.length,verifiedTotal:total(subscriptionsPaid),monthTotal:total(subscriptionsPaid.filter(r=>r.approvedAtMs>=monthStartMs)),supportTotal:total(support),invalid}};
 }
 const labels={'account.suspended':'Account suspended','account.activated':'Account activated','reading.policy':'Reading access policy changed','subscription.removed':'Paid access removed','payment.approved':'Payment approved','payment.rejected':'Payment rejected','message.sent':'Private message sent'};
 const api={ms,date,money,csv,download,matches,report,labels};if(typeof module==='object')module.exports=api;else root.GESPascoAdminReportsCore=api;
})(typeof window==='object'?window:globalThis);
