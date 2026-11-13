const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../admin-reports-core.js');
const now=Date.UTC(2026,10,13,20),DAY=86400000;
const receipt=(id,change={})=>({id,reference:id,requestId:id,uid:'paid',kind:'subscription',planId:'m1',amountPesewas:2000,approvedBy:'admin',approvedAt:now-DAY,...change});
test('overview counts actual eligible paid accounts separately from samples, overrides and administrators',()=>{
 const ids=['paid','expired','suspended','sample','grant','admin','deleted'];
 const report=core.report({profiles:ids.filter(id=>id!=='deleted').map(id=>({id,displayName:id,admin:id==='admin'})),subscriptions:ids.map(id=>({id,planId:'m1',endsAtMs:id==='expired'?now-1:now+DAY})),controls:[{id:'suspended',status:'suspended'},{id:'sample',accessMode:'trial-only'},{id:'grant',accessMode:'full-access'}]},now);
 assert.deepEqual(report.active.map(r=>r.uid),['paid','grant']);assert.equal(report.summary.expiring,2);assert.equal(report.summary.users,6);
});
test('ledger totals include historical renewals and deleted accounts, with optional support separate',()=>{
 const data={receipts:[receipt('FIRST123',{approvedAt:Date.UTC(2026,9,31)}),receipt('SECOND123'),receipt('DELETED123',{uid:'deleted',amountPesewas:5000,planId:'m3'}),receipt('SUPPORT123',{kind:'support',planId:'',amountPesewas:1234}),receipt('FUTURE123',{approvedAt:now+1}),receipt('BAD123',{amountPesewas:1}),receipt('MISMATCH123',{reference:'OTHER123'})],requests:[{id:'one',status:'pending',kind:'subscription',uid:'paid',createdAt:now-DAY},{id:'two',status:'rejected',uid:'paid'}]};
 const r=core.report(data,now);assert.equal(r.summary.verifiedTotal,9000);assert.equal(r.summary.monthTotal,7000);assert.equal(r.summary.supportTotal,1234);assert.equal(r.summary.invalid,3);assert.equal(r.summary.pending,1);assert.equal(r.verified.find(r=>r.uid==='deleted').name,'Account unavailable');
});
test('CSV preserves quotes and newlines, and neutralizes spreadsheet formulas from user fields',()=>{
 const csv=core.csv([['Name','Amount'],[' =HYPERLINK("x")',-1],['line\nbreak','@SUM(A1)'],['plain','"quoted"']]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\' =HYPERLINK(""x"")"'));assert.ok(csv.includes('"-1"'));assert.ok(csv.includes('"\'@SUM(A1)"'));assert.ok(csv.includes('"line\nbreak"'));assert.ok(csv.includes('"""quoted"""'));
});
test('filters reflect current entitlement and paid access remains distinct from reading grants',()=>{
 const r={profile:{},control:{status:'active',accessMode:'full-access'},subscription:{endsAtMs:now-1}};assert.equal(core.matches(r,{entitlement:'grant'},now),true);assert.equal(core.matches(r,{entitlement:'paid'},now),false);assert.equal(core.matches(r,{entitlement:'full'},now),true);r.control.status='suspended';assert.equal(core.matches(r,{status:'active'},now),false);assert.equal(core.matches(r,{status:'suspended'},now),true);assert.equal(core.matches(r,{entitlement:'full'},now),false);
});
