/* Published overrides retain stable bank/question IDs; saved attempts remain snapshots. */
(function(root){
 const quiz=typeof module==='object'?require('./quiz-core'):root.GESPascoQuizCore;
 function valid(bank){return quiz.validBank(bank)&&bank.id.length<=60&&bank.title.length<=200&&bank.questions.every(q=>q.id.length<=180&&q.topic.length<=200&&q.prompt.length<=6000&&q.options.every(o=>o.length<=1500)&&q.explanation.length<=4000&&q.source.length<=1000)&&JSON.stringify(bank).length<=350000;}
 function merge(builtin,published){const banks=new Map(builtin.map(b=>[b.id,b]));for(const row of published){if(!row||!valid(row.bank)||!Number.isInteger(row.version)||row.version<1||typeof row.enabled!=='boolean')throw Error('Published question set is invalid.');if(!row.enabled){banks.delete(row.bank.id);continue;}banks.set(row.bank.id,{...row.bank,version:row.version,questions:row.bank.questions.map(q=>({...q,answerBasis:'reviewed'}))});}return [...banks.values()];}
 function clean(bank){return {schema:1,id:bank.id,title:bank.title,questions:JSON.parse(JSON.stringify(bank.questions))};}
 const api={valid,merge,clean};if(typeof module==='object')module.exports=api;else root.GESPascoQuizAdminCore=api;
})(typeof window==='object'?window:globalThis);
