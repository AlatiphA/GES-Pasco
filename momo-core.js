/* Payment amounts are integer pesewas. Approval is a trusted administrator action. */
(function(root){
 const plans={m1:{months:1,price:2000,label:'1 month'},m3:{months:3,price:5000,label:'3 months'},m6:{months:6,price:8000,label:'6 months'},m12:{months:12,price:10000,label:'12 months'}};
 function reference(v){const s=String(v||'').trim().toUpperCase();if(!/^[A-Z0-9-]{6,80}$/.test(s))throw Error('Enter the unique MoMo transaction ID from your SMS or receipt (6–80 letters, numbers or hyphens).');return s;}
 function amount(v){const s=String(v);if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Enter an amount with up to two decimal places.');const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n)||n<100||n>1000000)throw Error('Enter an amount from GH₵1 to GH₵10,000.');return n;}
 function addMonths(ms,months){const d=new Date(ms),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const end=new Date(d);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);d.setUTCDate(Math.min(day,end.getUTCDate()));return d.getTime();}
 function request(uid,kind,planId,supportAmount,ref){if(!uid||!['support','subscription'].includes(kind))throw Error('Choose support or subscription.');if(kind==='subscription'&&!Object.hasOwn(plans,planId))throw Error('Choose a subscription plan.');return {uid,kind,planId:kind==='subscription'?planId:'',amountPesewas:kind==='subscription'?plans[planId].price:amount(supportAmount),reference:reference(ref),status:'pending'};}
 const api={plans,reference,amount,addMonths,request,trialDays:7};if(typeof module==='object')module.exports=api;else root.GESPascoMomoCore=api;
})(typeof window==='object'?window:globalThis);
