const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
async function setup(grant=false){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.com/GES-Pasco/',runScripts:'outside-only'}),w=dom.window,listeners=[],stops=[];
 const data=new Map([['users/reader',{createdAt:{toMillis:()=>Date.now()-86400000*20}}],['subscriptions/reader',{endsAtMs:Date.now()+86400000}],['accountControls/reader',{status:'active',accessMode:grant?'full-access':'automatic'}]]);
 const ref=path=>({async get(){return {exists:data.has(path),data:()=>data.get(path)};},onSnapshot(callback){listeners.push({path,callback});return ()=>stops.push(path);}});
 w.gesPascoDb={collection:name=>({doc:id=>ref(name+'/'+id)})};w.gesPascoAuth={currentUser:{uid:'reader'},onAuthStateChanged(){},signOut(){}};
 for(const file of ['access-core.js','access.js'])w.eval(fs.readFileSync(file,'utf8'));
 await w.GESPascoAccess.prepare(w.gesPascoAuth.currentUser);
 return {w,dom,stops,emit(path,value,fromCache=false){listeners.filter(l=>l.path===path).at(-1).callback({data:()=>value,metadata:{fromCache}});}};
}
test('connected readers lose paid full access when the server removes the entitlement, retaining samples',async()=>{
 const a=await setup();assert.equal(a.w.GESPascoAccess.fullAccess(),true);a.emit('subscriptions/reader',{endsAtMs:0});assert.equal(a.w.GESPascoAccess.fullAccess(),false);assert.equal(a.w.GESPascoAccess.allowed(),true);assert.equal(a.w.GESPascoAccess.state().kind,'free');a.dom.window.close();
});
test('a subscription removal preserves a full-reading grant and cached snapshots cannot restore revoked paid access',async()=>{
 const granted=await setup(true);granted.emit('subscriptions/reader',{endsAtMs:0});assert.equal(granted.w.GESPascoAccess.fullAccess(),true);assert.equal(granted.w.GESPascoAccess.state().kind,'full-grant');granted.dom.window.close();
 const a=await setup();a.emit('subscriptions/reader',{endsAtMs:0});a.emit('subscriptions/reader',{endsAtMs:Date.now()+86400000},true);assert.equal(a.w.GESPascoAccess.fullAccess(),false);a.w.GESPascoAccess.openCached({uid:'different'});assert.deepEqual(a.stops.sort(),['accountControls/reader','subscriptions/reader']);a.dom.window.close();
});
