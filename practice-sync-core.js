/* Completed results are immutable; device histories merge by attempt ID. */
(function(root){
 'use strict';
 function valid(r,uid){return !!(r&&r.owner===uid&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=400&&typeof r.title==='string'&&r.title.length<=500&&Number.isSafeInteger(r.finishedAtMs)&&r.finishedAtMs>0&&Number.isInteger(r.total)&&r.total>0&&r.total<=100&&Number.isInteger(r.correct)&&r.correct>=0&&r.correct<=r.total&&Number.isInteger(r.unanswered)&&r.unanswered>=0&&r.unanswered<=r.total-r.correct&&(!r.detail||(Array.isArray(r.detail)&&r.detail.length===r.total&&r.detail.every(q=>q&&typeof q.id==='string'&&q.id.length<=500&&typeof q.correct==='boolean'&&typeof q.unanswered==='boolean'))));}
 function merge(local,remote,uid){const rows=new Map();for(const r of [...(Array.isArray(local)?local:[]),...(Array.isArray(remote)?remote:[])]){const row={...r,owner:r.owner||uid};if(valid(row,uid)&&!rows.has(row.id))rows.set(row.id,row);}return [...rows.values()].sort((a,b)=>b.finishedAtMs-a.finishedAtMs||a.id.localeCompare(b.id)).slice(0,20);}
 function encode(row){return {recordId:row.id,finishedAtMs:row.finishedAtMs,payload:JSON.stringify(row)};}
 function decode(d,uid){try{const row=JSON.parse(d.payload);return valid(row,uid)&&row.id===d.recordId&&row.finishedAtMs===d.finishedAtMs?row:null;}catch{return null;}}
 const api={valid,merge,encode,decode};if(typeof module==='object')module.exports=api;else root.GESPascoPracticeSyncCore=api;
})(typeof window==='object'?window:globalThis);
