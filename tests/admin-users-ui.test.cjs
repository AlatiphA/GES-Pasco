const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,20));
async function setup({financial=true,reviewer=false,failWrite=false}={}){
 const dom=new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://example.com/GES-Pasco/admin.html#users',runScripts:'outside-only'}),w=dom.window,auth=[],records=new Map(),writes=[];let throwOnWrite=failWrite;
 await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
 const date={toMillis:()=>Date.now()-20*86400000};
 for(const [id,name]of [['payer','Abdul Latif'],['expired','Ibrahim Haruna'],['admin','Administrator']])records.set('users/'+id,{displayName:name,email:id+'@example.com',createdAt:date});
 records.set('subscriptions/payer',{uid:'payer',endsAtMs:Date.now()+86400000,planId:'m1',requestId:'receipt-one'});records.set('accountControls/payer',{uid:'payer',status:'active',accessMode:'full-access'});
 records.set('subscriptions/expired',{uid:'expired',endsAtMs:Date.now()-1000});
 if(financial)records.set('paymentAdmins/admin',{active:true});if(reviewer)records.set('reportAdmins/admin',{active:true});
 const ref=(path,after=null,size=100)=>({path,id:path.split('/').at(-1),doc:id=>ref(path+'/'+(id||'audit-'+writes.length)),collection:id=>ref(path+'/'+id),orderBy(){return this;},startAfter(doc){return ref(path,doc.id,size);},limit(n){return ref(path,after,n);},async get(){if(path.includes('/'))return {exists:records.has(path),data:()=>records.get(path)};const docs=[...records].filter(([key])=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')).sort(([a],[b])=>a.localeCompare(b)).filter(([key])=>!after||key.split('/')[1]>after).slice(0,size).map(([key,value])=>({id:key.split('/')[1],data:()=>value}));return {docs,size:docs.length};}});
 const db={collection:ref,async runTransaction(fn){const changes=[];await fn({get:r=>r.get(),set:(r,data)=>changes.push([r.path,data]),update:(r,data)=>changes.push([r.path,{...records.get(r.path),...data}])});if(throwOnWrite)throw Error('Write denied');for(const [path,data]of changes){writes.push(path);records.set(path,data);}}};
 w.gesPascoDb=db;w.gesPascoAuth={currentUser:{uid:'admin',email:'admin@example.com'},onAuthStateChanged:fn=>auth.push(fn)};w.firebase={firestore:()=>db};w.firebase.firestore.FieldPath={documentId:()=> '__name__'};w.firebase.firestore.FieldValue={serverTimestamp:()=>123};w.confirm=()=>true;
 w.HTMLDialogElement.prototype.show=function(){this.open=true;};w.HTMLDialogElement.prototype.showModal=function(){throw Error('Administration should not be modal');};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const file of ['admin-page.js','access-core.js','admin-users-core.js','momo-core.js','admin-reports-core.js','momo.js'])w.eval(fs.readFileSync(file,'utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await Promise.all(auth.map(fn=>fn(w.gesPascoAuth.currentUser)));await tick();
 const card=id=>w.document.querySelector('[data-user-id="'+id+'"]');const action=(id,text)=>{const button=[...card(id).querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click();return button;};
 return {dom,w,records,writes,card,action,async account(uid){w.gesPascoAuth.currentUser=uid?{uid}:null;await Promise.all(auth.map(fn=>fn(w.gesPascoAuth.currentUser)));await tick();},setFail:value=>throwOnWrite=value};
}
test('Users is a full-page view with current entitlements and one Suspend/Activate action',async()=>{
 const a=await setup();assert.equal(a.w.document.getElementById('adminWorkspace').hidden,false);assert.equal(a.w.document.getElementById('momoDialog').open,true);
 const card=a.card('payer');assert.match(card.textContent,/Full library access/);assert.equal(card.querySelectorAll('[role=switch]').length,0);assert.equal(card.querySelector('[data-account-action]').textContent,'Suspend');assert.equal(a.card('admin').querySelector('[role=switch]'),null);
 a.action('payer','Suspend');await tick();assert.equal(a.records.get('accountControls/payer').status,'suspended');assert.match(a.card('payer').textContent,/App access suspended/);assert.equal(a.card('payer').querySelector('[data-account-action]').textContent,'Activate');
 a.action('payer','Activate');await tick();assert.equal(a.records.get('accountControls/payer').status,'active');assert.equal(a.records.get('accountControls/payer').accessMode,'full-access');assert.match(a.card('payer').textContent,/Full library access/);a.dom.window.close();
});
test('Remove paid access appears only for an unexpired subscription and preserves free-reading grants',async()=>{
 const a=await setup(),grant={...a.records.get('accountControls/payer')};assert.equal([...a.card('expired').querySelectorAll('button')].some(b=>b.textContent==='Remove paid access'),false);
 a.action('payer','Remove paid access');await tick();assert.equal(a.records.get('subscriptions/payer').endsAtMs,0);assert.deepEqual(a.records.get('accountControls/payer'),grant);assert.deepEqual(a.writes.filter(p=>!p.startsWith('adminAudit/')),['subscriptions/payer']);assert.equal(a.records.get(a.writes.find(p=>p.startsWith('adminAudit/'))).action,'subscription.removed');assert.equal(a.records.get('subscriptions/payer').requestId,'receipt-one');assert.match(a.card('payer').textContent,/Full library access/);assert.equal([...a.card('payer').querySelectorAll('button')].some(b=>b.textContent==='Remove paid access'),false);a.dom.window.close();
});
test('failed or stale updates do not flip a switch or overwrite another administrator',async()=>{
 const a=await setup({failWrite:true});a.action('payer','Suspend');await tick();assert.equal(a.card('payer').querySelector('[data-account-action]').textContent,'Suspend');assert.equal(a.card('payer').querySelector('[data-account-action]').disabled,false);assert.match(a.w.document.getElementById('momoStatus').textContent,/Write denied/);
 a.setFail(false);a.records.set('accountControls/payer',{status:'active',accessMode:'trial-only'});a.action('payer','Suspend');await tick();assert.deepEqual(a.writes,[]);assert.match(a.w.document.getElementById('momoStatus').textContent,/Another administrator/);a.dom.window.close();
});
test('name search is usable and changing policy refreshes access without losing an unsent message',async()=>{
 const a=await setup(),input=a.w.document.querySelector('input[type=search]');input.value='LATIF';a.w.document.querySelector('.userSearch').dispatchEvent(new a.w.Event('submit',{cancelable:true}));await tick();assert.equal(a.w.document.querySelectorAll('.userCard').length,1);
 const message=a.card('payer').querySelector('[data-private-message]');message.value='Unsent draft';a.action('payer','Grant sample-only access');await tick();assert.match(a.card('payer').textContent,/Sample chapters only/);assert.equal(a.card('payer').querySelector('[data-private-message]').value,'Unsent draft');assert.equal([...a.card('payer').querySelectorAll('button')].find(b=>b.textContent==='Grant sample-only access').getAttribute('aria-pressed'),'true');a.dom.window.close();
});
test('ordinary users cannot open administration and sign-out clears previously loaded profiles',async()=>{
 const denied=await setup({financial:false});assert.equal(denied.w.document.getElementById('adminWorkspace').hidden,true);assert.equal(denied.w.document.querySelectorAll('.userCard').length,0);denied.dom.window.close();
 const a=await setup();await a.account(null);assert.equal(a.w.document.getElementById('adminWorkspace').hidden,true);assert.equal(a.w.document.querySelectorAll('.userCard').length,0);a.dom.window.close();
});


test('user status and entitlement filters apply across records and export only matching profiles',async()=>{
 const a=await setup(),select=a.w.document.querySelectorAll('.userSearch select');select[2].value='paid';select[2].dispatchEvent(new a.w.Event('change'));await tick();assert.equal(a.w.document.querySelectorAll('.userCard').length,1);assert.ok(a.card('payer'));
 let csvRows;a.w.GESPascoAdminReportsCore.download=(name,rows)=>{csvRows=rows;};[...a.w.document.querySelectorAll('.userSearch button')].find(b=>b.textContent==='Export users CSV').click();await tick();assert.equal(csvRows.length,2);assert.equal(csvRows[1][1],'payer@example.com');a.dom.window.close();
});
