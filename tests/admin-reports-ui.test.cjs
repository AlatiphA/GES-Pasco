const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,30));
async function setup({financial=true,deny=false,hold=false}={}){
 const dom=new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://example.com/admin.html',runScripts:'outside-only'}),w=dom.window,callbacks=[],records=new Map(),now=Date.now();let release;
 await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 if(financial)records.set('paymentAdmins/admin',{active:true});records.set('users/payer',{displayName:'Teacher',email:'teacher@example.com'});records.set('subscriptions/payer',{planId:'m1',endsAtMs:now+86400000});records.set('momoReceipts/RECEIPT123',{reference:'RECEIPT123',requestId:'one',uid:'payer',kind:'subscription',planId:'m1',amountPesewas:2000,approvedBy:'admin',approvedAt:now-1000});
 const ref=(path,after=null,size=100)=>({doc:id=>ref(path+'/'+id),orderBy(){return this;},startAfter(doc){return ref(path,doc.id,size);},limit(n){return ref(path,after,n);},async get(){if(path.includes('/'))return {exists:records.has(path),data:()=>records.get(path)};if(deny)throw {code:'permission-denied'};if(hold&&path==='users')await new Promise(r=>release=r);const docs=[...records].filter(([key])=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')).filter(([key])=>!after||key.split('/')[1]>after).slice(0,size).map(([key,data])=>({id:key.split('/')[1],data:()=>data}));return {docs};}});
 w.gesPascoDb={collection:ref};w.gesPascoAuth={currentUser:{uid:'admin'},onAuthStateChanged:fn=>callbacks.push(fn)};w.firebase={firestore:{FieldPath:{documentId:()=> '__name__'}}};w.HTMLDialogElement.prototype.show=function(){this.open=true;};w.confirm=()=>true;
 for(const f of ['admin-page.js','access-core.js','admin-users-core.js','momo-core.js','admin-reports-core.js','admin-reports.js'])w.eval(fs.readFileSync(f,'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await Promise.all(callbacks.map(fn=>fn(w.gesPascoAuth.currentUser)));await tick();
 return {dom,w,records,release:()=>release?.(),async signout(){w.gesPascoAuth.currentUser=null;await Promise.all(callbacks.map(fn=>fn(null)));await tick();}};
}
test('overview is the default full-page view, with ledger totals, exports and empty audit',async()=>{
 const a=await setup(),w=a.w;assert.equal(w.document.getElementById('adminReportsPanel').hidden,false);assert.match(w.document.getElementById('adminReportsBody').textContent,/GH₵ 20.00/,w.document.getElementById('adminReportsStatus').textContent);assert.equal(w.document.querySelectorAll('.overviewCard').length,7);
 let result;w.GESPascoAdminReportsCore.download=(name,rows)=>result={name,rows};[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Verified payments').click();assert.equal(result.rows.length,2);assert.equal(result.rows[1][0],'Teacher');
 w.document.getElementById('auditAdminEntry').click();await tick();assert.match(w.document.getElementById('adminReportsBody').textContent,/No administration activity/);assert.match(w.document.getElementById('adminReportsStatus').textContent,/earlier actions/);a.dom.window.close();
});
test('ordinary users cannot load reports, and server errors never present zero totals as success',async()=>{
 const a=await setup({financial:false});assert.equal(a.w.document.getElementById('adminWorkspace').hidden,true);assert.equal(a.w.document.querySelectorAll('.overviewCard').length,0);a.dom.window.close();
 const b=await setup({deny:true});assert.match(b.w.document.getElementById('adminReportsStatus').textContent,/Access unavailable/);assert.equal(b.w.document.querySelectorAll('.overviewCard').length,0);b.dom.window.close();
});
test('sign-out cancels pending reads and clears sensitive reporting data',async()=>{
 const a=await setup({hold:true});await a.signout();a.release();await tick();assert.equal(a.w.document.querySelectorAll('.overviewCard').length,0);assert.equal(a.w.document.getElementById('adminReportsBody').textContent,'');a.dom.window.close();
});


test('changing a read-only report filter does not prompt about unsaved edits when leaving',async()=>{
 const a=await setup();let prompts=0;a.w.confirm=()=>{prompts++;return true;};const select=a.w.document.querySelector('#adminReportsBody select');select.value='all';select.dispatchEvent(new a.w.Event('input',{bubbles:true}));a.w.document.getElementById('auditAdminEntry').click();await tick();assert.equal(prompts,0);assert.equal(a.w.document.getElementById('adminReportsTitle').textContent,'Recent audit');a.dom.window.close();
});
