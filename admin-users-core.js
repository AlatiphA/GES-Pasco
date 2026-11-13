/* Search every profile without requiring a new index or changing profile permissions. */
(function(root){
 const access=typeof module==='object'?require('./access-core.js'):root.GESPascoAccessCore;
 const key=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().trim();
 function matches(profile,text,field='all'){
  const term=key(text);if(!term)return true;
  return (field!=='email'&&key(profile.displayName).includes(term))||(field!=='name'&&key(profile.email).includes(term));
 }
 async function page(fetchBatch,{text='',field='all',cursor=null,current=()=>{}}={}){
  const found=[],size=text.trim()?100:26;let after=cursor;
  while(true){
   current();const docs=await fetchBatch(after,size);current();
   for(const doc of docs){if(matches(doc.data(),text,field))found.push(doc);if(found.length===26)break;}
   if(found.length===26||docs.length<size)break;
   after=docs.at(-1);if(!after)break;
  }
  const docs=found.slice(0,25);return {docs,next:found.length>25?docs.at(-1):null};
 }
 function describe(record,now=Date.now()){
  const state=access.evaluate({createdAtMs:record.profile.createdAt?.toMillis?.(),endsAtMs:record.subscription?.endsAtMs,admin:record.admin,control:record.control},now);
  const mode=record.control?.accessMode||'automatic',policy=['free','full-access'].includes(mode)?'full-access':mode;
  const source={administrator:'Administrator',subscription:'Active subscription','full-grant':'Full-access grant',trial:'Three-day sample trial',free:'Free sample access',suspended:'Suspended'}[state.kind];
  return {state,policy,active:state.allowed,paidActive:Number.isFinite(record.subscription?.endsAtMs)&&record.subscription.endsAtMs>now,source,access:!state.allowed?'App access suspended':state.fullAccess?'Full library access':'Sample chapters only'};
 }
 const api={key,matches,page,describe};if(typeof module==='object')module.exports=api;else root.GESPascoAdminUsers=api;
})(typeof window==='object'?window:globalThis);
