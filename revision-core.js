/* Revision summaries use account-local practice records, including legacy score summaries. */
(function(root){
 'use strict';
 function bankId(row){if(typeof row.bankId==='string')return row.bankId;return typeof row.id==='string'&&row.id.includes('|')?row.id.split('|')[1]:'';}
 function validRow(r,owner){return !!(r&&(!r.owner||r.owner===owner)&&typeof r.title==='string'&&Number.isFinite(r.finishedAtMs)&&r.finishedAtMs>0&&Number.isInteger(r.total)&&r.total>0&&r.total<=100&&Number.isInteger(r.correct)&&r.correct>=0&&r.correct<=r.total&&Number.isInteger(r.unanswered)&&r.unanswered>=0&&r.unanswered<=r.total-r.correct);}
 function isRevision(row){return row.kind==='revision'||(row.kind!=='practice'&&/ - mistake revision/.test(row.title));}
 function currentStats(questions,everMissed){const values=[...questions.values()],correct=values.filter(q=>q.correct).length;return {questions:values.length,correct,percent:values.length?Math.round(correct/values.length*100):null,corrected:values.filter(q=>q.correct&&everMissed.has(q.bankId+'|'+q.id)).length,missed:values.filter(q=>!q.correct)};}
 function record(a,owner,core){
  if(!core.validAttempt(a,owner)||!a.finishedAtMs)return null;
  return {id:a.startedAtMs+'|'+a.bankId,kind:isRevision(a)?'revision':'practice',owner,bankId:a.bankId,title:a.title,finishedAtMs:a.finishedAtMs,...core.score(a),detail:a.questions.map((q,i)=>({id:q.id,correct:a.answers[i]===q.answer,unanswered:a.answers[i]===null}))};
 }
 function rows(history,attempt,owner,core){
  const map=new Map();for(const row of Array.isArray(history)?history:[]){if(!validRow(row,owner)||typeof row.id!=='string')continue;if(!map.has(row.id))map.set(row.id,{...row,bankId:bankId(row)});}
  const latest=record(attempt,owner,core);if(latest)map.set(latest.id,latest);
  return [...map.values()].sort((a,b)=>b.finishedAtMs-a.finishedAtMs).slice(0,20);
 }
 function total(rows){const n=rows.reduce((s,r)=>s+r.total,0),correct=rows.reduce((s,r)=>s+r.correct,0),unanswered=rows.reduce((s,r)=>s+r.unanswered,0);return {questions:n,correct,unanswered,percent:n?Math.round(correct/n*100):null};}
 function summarize(rows,filter='all'){
  const records=rows.filter(r=>filter==='all'||r.bankId===filter),stats=total(records),sets=new Map(),questions=new Map(),everMissed=new Set();let covered=0;
  for(const r of records){let set=sets.get(r.bankId);if(!set){set={id:r.bankId,title:r.title.replace(/ - mistake revision.*$/,''),rows:[]};sets.set(r.bankId,set);}set.rows.push(r);
   const detail=Array.isArray(r.detail)&&r.detail.length===r.total&&r.detail.every(q=>q&&typeof q.id==='string'&&typeof q.correct==='boolean'&&typeof q.unanswered==='boolean')?r.detail:null;
   if(detail){covered++;for(const q of detail){const key=r.bankId+'|'+q.id;if(!q.correct)everMissed.add(key);if(!questions.has(key))questions.set(key,{...q,bankId:r.bankId});}}
  }
  const groups=[...sets.values()].map(s=>{const stats=total(s.rows);const current=currentStats(new Map([...questions].filter(([,q])=>q.bankId===s.id)),everMissed),tests=s.rows.filter(r=>!isRevision(r));return {id:s.id,title:s.title,attempts:s.rows.length,...stats,current,tests:{...total(tests),attempts:tests.length,records:tests},weak:current.questions>=3&&current.percent<70};}).sort((a,b)=>(a.current.percent??100)-(b.current.percent??100));
  const testRows=records.filter(r=>!isRevision(r)),revisionRows=records.filter(isRevision);const n=Math.min(3,Math.floor(testRows.length/2)),comparison=n?{n,latest:total(testRows.slice(0,n)).percent,previous:total(testRows.slice(n,n*2)).percent}:null;
  const current=currentStats(questions,everMissed);return {...stats,attempts:records.length,records,groups,covered,comparison,current,tests:{...total(testRows),attempts:testRows.length,records:testRows},revisions:{...total(revisionRows),attempts:revisionRows.length,records:revisionRows},missed:current.missed};
 }
 const api={record,rows,summarize};if(typeof module==='object'&&module.exports)module.exports=api;root.GESPascoRevisionCore=api;
})(typeof window==='object'?window:globalThis);
