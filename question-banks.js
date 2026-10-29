/* Online published banks plus account-scoped offline copies; no draft data reaches practice. */
(()=>{
 const core=window.GESPascoQuizAdminCore;let lastMessage='';
 function cached(uid){try{const rows=JSON.parse(localStorage.getItem('ges-pasco-published-quizzes-'+uid)||'[]');if(!Array.isArray(rows)||rows.length>100)throw Error();return rows;}catch{return [];}}
 async function load(builtin){const uid=gesPascoAuth.currentUser?.uid;if(!uid)throw Error('Sign in to load practice questions.');let rows=cached(uid);lastMessage='';
  if(navigator.onLine){let timer;try{const snap=await Promise.race([firebase.firestore().collection('quizBanks').limit(101).get({source:'server'}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timed out')),8000);})]);if(gesPascoAuth.currentUser?.uid!==uid)throw Error('Account changed.');if(snap.size>100)throw Error('Too many published sets.');const next=snap.docs.map(d=>d.data());core.merge(builtin,next);rows=next;try{localStorage.setItem('ges-pasco-published-quizzes-'+uid,JSON.stringify(rows));}catch{lastMessage='Published questions loaded, but cannot be saved offline on this device.';}}catch{lastMessage='Published sets could not be refreshed. Using saved sets and the bundled book questions.';}finally{clearTimeout(timer);}}
  else lastMessage='Offline: using saved published sets and bundled book questions.';
  if(gesPascoAuth.currentUser?.uid!==uid)throw Error('Account changed.');try{return core.merge(builtin,rows);}catch{lastMessage='Saved published sets are invalid. Using bundled book questions; reconnect to refresh.';return builtin;}
 }
 window.GESPascoQuestionBanks={load,message:()=>lastMessage};
})();
