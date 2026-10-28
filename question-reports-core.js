/* Pure report validation and an account-bound, idempotent offline outbox. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.GESPascoReportsCore=api;})(globalThis,()=>{
 const categories={wrong_answer:'Wrong answer',unclear:'Unclear question',typo:'Spelling or formatting',missing_content:'Missing content',other:'Other'};
 const statuses={new:'New',under_review:'Under review',corrected:'Corrected',closed:'Closed'};
 const text=(s,n)=>typeof s==='string'&&s.length<=n;
 function validQuestion(q){return !!q&&text(q.id,180)&&q.id.length>0&&text(q.bankId,100)&&q.bankId.length>0&&text(q.bankTitle,200)&&q.bankTitle.length>0&&text(q.prompt,6000)&&q.prompt.length>0&&text(q.source,1000)&&q.source.length>0&&Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=6&&q.options.every(s=>text(s,1500))&&Number.isInteger(q.answerIndex)&&q.answerIndex>=0&&q.answerIndex<q.options.length;}
 function create(uid,question,category,description,suggestion,version,id,now=Date.now()){
  if(!uid||!validQuestion(question)||!Object.hasOwn(categories,category)||!text(description,2000)||!description.trim()||!text(suggestion,2000)||!text(version,40)||!id||!Number.isSafeInteger(now)||now<=0)throw Error('Please check the question, category and description.');
  return {id,reporterUid:uid,question:JSON.parse(JSON.stringify(question)),category,description:description.trim(),suggestion:suggestion.trim(),appVersion:version,queuedAtMs:now};
 }
 function outbox({storage,currentUid,send}){
  const key=uid=>'ges-pasco-reports-pending-'+uid;let job=null;
  function list(uid){const raw=JSON.parse(storage.getItem(key(uid))||'[]');if(!Array.isArray(raw))throw Error('Saved reports could not be read.');return raw;}
  function save(uid,rows){storage.setItem(key(uid),JSON.stringify(rows));}
  function enqueue(row){if(currentUid()!==row.reporterUid)throw Error('Your account changed. Please reopen the report.');const rows=list(row.reporterUid);if(rows.length>=50)throw Error('You have 50 pending reports. Submit these before adding more.');if(!rows.some(r=>r.id===row.id))save(row.reporterUid,[...rows,row]);}
  async function flush(){if(job)return job;const uid=currentUid();if(!uid)return;job=(async()=>{for(const row of list(uid)){if(currentUid()!==uid)return;await send(row,()=>currentUid()===uid);if(currentUid()!==uid)return;save(uid,list(uid).filter(r=>r.id!==row.id));}})();try{await job;}finally{job=null;}}
  return {list,enqueue,flush};
 }
 return {categories,statuses,validQuestion,create,outbox};
});
