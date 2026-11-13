const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../admin-users-core.js');
test('name and email search supports partial case-insensitive names, accents and field selection',()=>{
 const p={displayName:'Ábdul Latif',email:'Teacher@Example.com'};
 assert.equal(core.matches(p,'LATIF'),true);assert.equal(core.matches(p,'abdul','name'),true);assert.equal(core.matches(p,'TEACHER@','email'),true);assert.equal(core.matches(p,'teacher','name'),false);assert.equal(core.matches(p,'latif','email'),false);assert.equal(core.matches({},'missing'),false);
});
test('search scans beyond the first batch and paginates matching profiles without omissions',async()=>{
 const rows=Array.from({length:340},(_,i)=>({id:String(i).padStart(3,'0'),data:()=>({displayName:i>=210?'Teacher '+i:'Other'})})),calls=[];
 const fetch=async(after,size)=>{calls.push(after?.id);const start=after?rows.findIndex(r=>r.id===after.id)+1:0;return rows.slice(start,start+size);};
 let cursor=null,ids=[];do{const result=await core.page(fetch,{text:'teacher',cursor});ids.push(...result.docs.map(d=>d.id));cursor=result.next;}while(cursor);
 assert.equal(ids.length,130);assert.equal(new Set(ids).size,130);assert.equal(ids[0],'210');assert.equal(ids.at(-1),'339');assert.ok(calls.includes('199'));
});
test('a changed account or search cancels an in-flight directory scan',async()=>{
 let live=true;await assert.rejects(core.page(async()=>{live=false;return [];},{current:()=>{if(!live)throw Error('Account changed');}}),/Account changed/);
});
test('paid removal eligibility is separate from effective access and never consumes a reading grant',()=>{
 const now=Date.now(),record={profile:{},admin:false,control:{status:'active',accessMode:'full-access'},subscription:{endsAtMs:now+1000}};
 let d=core.describe(record,now);assert.equal(d.paidActive,true);assert.equal(d.state.fullAccess,true);assert.equal(d.policy,'full-access');
 record.subscription.endsAtMs=0;d=core.describe(record,now);assert.equal(d.paidActive,false);assert.equal(d.state.fullAccess,true);assert.equal(d.source,'Full-access grant');
 record.control={status:'active',accessMode:'automatic'};assert.equal(core.describe(record,now).state.fullAccess,false);
 record.subscription.endsAtMs=now;assert.equal(core.describe(record,now).paidActive,false);
 record.control={status:'suspended',accessMode:'full-access'};assert.equal(core.describe(record,now).active,false);
});
