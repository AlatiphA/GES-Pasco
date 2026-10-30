/* Versioned, account-bound study backups. Only supported study fields are restored. */
(function(root){
 'use strict';
 const MAX_BYTES=5*1024*1024;
 const fail=()=>{throw Error('This is not a valid GES Pasco study backup.');};
 const text=(v,n)=>typeof v==='string'&&v.length<=n;
 const date=v=>text(v,64)&&Number.isFinite(Date.parse(v));
 const progress=v=>Number.isFinite(v)&&v>=0&&v<=100;
 function position(p){if(p===null||p===undefined)return null;if(!p||!text(p.location,10000)||!p.location||!text(p.chapter,2000)||!progress(p.progress)||!date(p.lastRead))return fail();return {location:p.location,chapter:p.chapter,progress:p.progress,lastRead:p.lastRead};}
 function bookmarks(rows){if(!Array.isArray(rows)||rows.length>1000)return fail();return rows.map(b=>{if(!b||!text(b.cfi,10000)||!b.cfi||!text(b.chapter,2000)||!progress(b.progress)||!date(b.date)||b.deleted)return fail();return {cfi:b.cfi,chapter:b.chapter,progress:b.progress,date:b.date,deleted:false};});}
 function results(rows,uid){if(!Array.isArray(rows)||rows.length>20)return fail();return rows.map(r=>{if(!root.GESPascoPracticeSyncCore.valid(r,uid))return fail();return {id:r.id,owner:uid,bankId:typeof r.bankId==='string'?r.bankId:'',title:r.title,kind:r.kind==='revision'?'revision':'practice',finishedAtMs:r.finishedAtMs,total:r.total,correct:r.correct,unanswered:r.unanswered,percent:Math.round(r.correct/r.total*100),...(r.detail?{detail:r.detail.map(q=>({id:q.id,correct:q.correct,unanswered:q.unanswered}))}:{})};});}
 function validate(value,uid){if(!value||value.app!=='GES Pasco'||value.schema!==1||value.owner!==uid||!date(value.createdAt)||!value.data)return fail();return {app:'GES Pasco',schema:1,owner:uid,createdAt:value.createdAt,data:{position:position(value.data.position),bookmarks:bookmarks(value.data.bookmarks),results:results(value.data.results,uid)}};}
 function parse(raw,uid){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Choose a backup file smaller than 5 MB.');let value;try{value=JSON.parse(raw);}catch{return fail();}if(value?.owner&&value.owner!==uid)throw Error('Sign into the account that created this backup before restoring it.');return validate(value,uid);}
 function create(uid,data){return validate({app:'GES Pasco',schema:1,owner:uid,createdAt:new Date().toISOString(),data},uid);}
 function merge(local,backup,uid){const incoming=validate(backup,uid).data,map=new Map();for(const b of [...local.bookmarks,...incoming.bookmarks])if(!map.has(b.cfi))map.set(b.cfi,b);return {position:!local.position?incoming.position:incoming.position&&Date.parse(incoming.position.lastRead)>Date.parse(local.position.lastRead)?incoming.position:local.position,bookmarks:[...map.values()],results:root.GESPascoPracticeSyncCore.merge(local.results,incoming.results,uid)};}
 function save(storage,entries){const previous=entries.map(([k])=>[k,storage.getItem(k)]);try{for(const [k,v] of entries)storage.setItem(k,JSON.stringify(v));}catch(error){for(const [k,v] of previous){try{if(v===null)storage.removeItem(k);else storage.setItem(k,v);}catch{}}throw Error('Not enough device storage to restore this backup. Free some space and try again.');}}
 const api={MAX_BYTES,parse,create,merge,save};if(typeof module==='object'){root={GESPascoPracticeSyncCore:require('./practice-sync-core.js')};module.exports=api;}else root.GESPascoStudyBackupCore=api;
})(typeof window==='object'?window:globalThis);
