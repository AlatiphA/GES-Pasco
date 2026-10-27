(function(root){
 'use strict';
 function validBank(b){
  if(!b||b.schema!==1||!/^[-a-z0-9]{1,60}$/.test(b.id)||typeof b.title!=='string'||!b.title.trim()||!Array.isArray(b.questions)||!b.questions.length||b.questions.length>100)return false;
  const ids=new Set();return b.questions.every(q=>{if(!q||typeof q.id!=='string'||ids.has(q.id)||!q.id||typeof q.topic!=='string'||!q.topic.trim()||typeof q.prompt!=='string'||!q.prompt.trim()||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some(v=>typeof v!=='string'||!v.trim())||new Set(q.options.map(v=>v.trim().toLowerCase())).size!==q.options.length||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||typeof q.explanation!=='string'||!q.explanation.trim()||typeof q.source!=='string'||!q.source.trim())return false;ids.add(q.id);return true;});
 }
 function shuffle(a,random=Math.random){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
 function create(bank,{owner='',topic='all',count=10,minutes=0,now=Date.now(),random=Math.random}={}){
  if(!validBank(bank))throw new Error('Invalid question bank.');
  const pool=bank.questions.filter(q=>topic==='all'||q.topic===topic);if(!pool.length)throw new Error('No questions match this topic.');
  if(!Number.isInteger(count)||count<1||count>100||!Number.isInteger(minutes)||minutes<0||minutes>120)throw new Error('Invalid quiz settings.');
  const questions=shuffle(pool,random).slice(0,count).map(q=>{const options=shuffle(q.options.map((text,i)=>({text,i})),random);return {...q,options:options.map(v=>v.text),answer:options.findIndex(v=>v.i===q.answer)};});
  return {schema:1,owner,bankId:bank.id,bankVersion:bank.version||1,title:bank.title,startedAtMs:now,deadlineMs:minutes?now+minutes*60000:0,questions,answers:Array(questions.length).fill(null),index:0,finishedAtMs:0};
 }
 function validAttempt(a,owner){return !!(a&&a.schema===1&&a.owner===owner&&validBank({schema:1,id:a.bankId,title:a.title,questions:a.questions})&&Array.isArray(a.answers)&&a.answers.length===a.questions.length&&a.answers.every((v,i)=>v===null||Number.isInteger(v)&&v>=0&&v<a.questions[i].options.length)&&Number.isFinite(a.startedAtMs)&&a.startedAtMs>0&&Number.isFinite(a.deadlineMs)&&a.deadlineMs>=0&&(!a.deadlineMs||a.deadlineMs>=a.startedAtMs&&a.deadlineMs<=a.startedAtMs+7200000)&&Number.isInteger(a.index)&&a.index>=0&&a.index<a.questions.length&&Number.isFinite(a.finishedAtMs)&&a.finishedAtMs>=0);}
 function score(a){const correct=a.questions.filter((q,i)=>a.answers[i]===q.answer).length,unanswered=a.answers.filter(v=>v===null).length;return {correct,total:a.questions.length,unanswered,percent:Math.round(correct/a.questions.length*100),incorrect:a.questions.map((q,i)=>a.answers[i]!==q.answer?i:null).filter(v=>v!==null)};}
 function finish(a,now=Date.now()){if(!a.finishedAtMs)a.finishedAtMs=now;return score(a);}
 function answer(a,index,value,now=Date.now()){if(a.finishedAtMs||a.deadlineMs&&now>=a.deadlineMs){if(!a.finishedAtMs)finish(a,now);return false;}if(!Number.isInteger(index)||index<0||index>=a.questions.length||!Number.isInteger(value)||value<0||value>=a.questions[index].options.length)return false;a.answers[index]=value;return true;}
 function retry(a,now=Date.now()){const questions=score(a).incorrect.map(i=>a.questions[i]);if(!questions.length)return null;return create({schema:1,id:a.bankId,title:a.title+' - mistake revision',version:a.bankVersion,questions},{owner:a.owner,count:questions.length,now});}
 const api={validBank,validAttempt,shuffle,create,score,finish,answer,retry};if(typeof module==='object'&&module.exports)module.exports=api;root.GESPascoQuizCore=api;
})(typeof window==='object'?window:globalThis);
