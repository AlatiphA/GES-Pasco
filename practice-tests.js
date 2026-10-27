/* Practice uses the book's answer markings; attempts remain account-scoped on this browser. */
(() => {
 const core=window.GESPascoQuizCore,dialog=document.getElementById('practiceDialog'),body=document.getElementById('practiceBody'),status=document.getElementById('practiceStatus');
 let owner='',attempt=null,banks=[],loading=null,timer=null,generation=0,storageProblem=false;
 const key=type=>'ges-pasco-practice-'+owner+'-'+type;
 function read(type,fallback){try{return JSON.parse(localStorage.getItem(key(type)))??fallback;}catch{return fallback;}}
 function write(type,value){try{localStorage.setItem(key(type),JSON.stringify(value));return true;}catch{storageProblem=true;status.textContent='Device storage is full or unavailable. This attempt cannot be saved until space is available.';return false;}}
 function persist(){if(attempt&&owner&&gesPascoAuth.currentUser?.uid===owner)write('attempt',attempt);}
 function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function button(text,action,cls='profileAction'){const b=node('button',text,cls);b.type='button';b.onclick=action;return b;}
 function resetBody(){body.replaceChildren();status.textContent=storageProblem?'Device storage is unavailable. This attempt is not saved.':'';}
 function timerText(){if(!attempt||attempt.finishedAtMs)return '';if(!attempt.deadlineMs)return 'Untimed practice';const seconds=Math.max(0,Math.ceil((attempt.deadlineMs-Date.now())/1000));return 'Time left '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
 function tick(){if(!attempt||attempt.finishedAtMs)return;if(attempt.deadlineMs&&Date.now()>=attempt.deadlineMs){finish();return;}const label=document.getElementById('practiceTimer');if(label)label.textContent=timerText();}
 function finish(){if(!attempt)return;core.finish(attempt);persist();const history=read('history',[]);const id=attempt.startedAtMs+'|'+attempt.bankId;if(!history.some(v=>v.id===id)){history.unshift({id,title:attempt.title,finishedAtMs:attempt.finishedAtMs,...core.score(attempt)});write('history',history.slice(0,20));}results();}
 function question(){
  if(!attempt)return;if(attempt.finishedAtMs){results();return;}
  if(attempt.deadlineMs&&Date.now()>=attempt.deadlineMs){finish();return;}
  resetBody();const i=attempt.index,q=attempt.questions[i];
  body.append(node('p',attempt.title,'practiceMuted'));const top=node('div',undefined,'practiceToolbar');top.append(node('strong','Question '+(i+1)+' of '+attempt.questions.length));const time=node('span',timerText());time.id='practiceTimer';top.append(time);body.append(top,node('h3',q.prompt,'practicePrompt'));
  const field=document.createElement('fieldset'),legend=node('legend','Choose one answer','practiceSrOnly');field.append(legend);
  q.options.forEach((text,value)=>{const label=node('label',undefined,'practiceOption'),radio=document.createElement('input');radio.type='radio';radio.name='practice-answer';radio.value=String(value);radio.checked=attempt.answers[i]===value;radio.onchange=()=>{if(core.answer(attempt,i,value)){persist();label.parentElement.querySelectorAll('label').forEach(el=>el.classList.remove('selected'));label.classList.add('selected');}else finish();};if(radio.checked)label.classList.add('selected');label.append(radio,node('span',text));field.append(label);});body.append(field);
  const actions=node('div',undefined,'practiceToolbar');const prev=button('Previous',()=>{attempt.index--;persist();question();});prev.disabled=i===0;const next=button(i===attempt.questions.length-1?'Finish test':'Next',()=>{if(i===attempt.questions.length-1){if(confirm('Finish this test? Unanswered questions count as incorrect.'))finish();}else{attempt.index++;persist();question();}},'profileAction profileActionPrimary');actions.append(prev,next);body.append(actions,button('Finish now',()=>{if(confirm('Finish this test? Unanswered questions count as incorrect.'))finish();}),node('p','Answers are shown after you finish. Closing the test saves your place. A timed test keeps counting while closed.','practiceMuted'));
 }
 function results(){
  if(!attempt)return;if(!attempt.finishedAtMs){question();return;}
  resetBody();const score=core.score(attempt);body.append(node('h3',score.percent+'% — '+score.correct+' / '+score.total+' correct'),node('p',score.unanswered+' unanswered. Scores follow the answer markings in the GES Pasco book. Historical questions have not been independently updated.','practiceMuted'));
  const tools=node('div',undefined,'practiceToolbar');tools.append(button('Choose another test',setup),button('Practise mistakes',()=>{const retry=core.retry(attempt);if(retry){attempt=retry;persist();question();}},'profileAction profileActionPrimary'));tools.lastChild.disabled=!score.incorrect.length;body.append(tools);
  attempt.questions.forEach((q,i)=>{const card=node('details',undefined,'practiceReview');card.append(node('summary',(i+1)+'. '+(attempt.answers[i]===q.answer?'Correct':'Review')+' — '+q.prompt));const content=node('div');content.append(node('p','Your answer: '+(attempt.answers[i]===null?'Unanswered':q.options[attempt.answers[i]])),node('p','Book answer: '+q.options[q.answer]),node('p',q.explanation),node('p',q.source,'practiceMuted'));card.append(content);body.append(card);});
 }
 async function load(){if(!loading)loading=fetch('./practice-bank.json').then(r=>{if(!r.ok)throw Error('Question files unavailable. Use Offline reading → Download / repair while online.');return r.json();}).then(data=>{if(data.schema!==1||!Array.isArray(data.banks)||!data.banks.length||!data.banks.every(core.validBank))throw Error('Question files could not be validated.');banks=data.banks;}).catch(e=>{loading=null;throw e;});return loading;}
 async function setup(){
  const epoch=++generation;resetBody();body.append(node('p','Loading question sets…'));
  try{await load();if(epoch!==generation||!dialog.open||gesPascoAuth.currentUser?.uid!==owner)return;resetBody();body.append(node('p','Questions are taken from the bundled GES Pasco book. Only multiple-choice questions with one clear bold answer are included.','practiceMuted'));const form=document.createElement('form');form.className='practiceSetup';const select=document.createElement('select'),count=document.createElement('input'),minutes=document.createElement('input');
  for(const b of banks){const option=node('option',b.title+' ('+b.questions.length+')');option.value=b.id;select.append(option);}count.type=minutes.type='number';count.min='1';count.max='100';count.value='10';minutes.min='0';minutes.max='120';minutes.value='0';count.required=minutes.required=true;const limit=()=>{const max=banks.find(b=>b.id===select.value).questions.length;count.max=String(max);if(Number(count.value)>max)count.value=String(max);};select.onchange=limit;limit();
  for(const [name,input] of [['Question set',select],['Number of questions',count],['Time limit in minutes (0 = untimed)',minutes]]){const label=node('label',name);label.append(input);form.append(label);}const start=node('button','Start practice','profileAction profileActionPrimary');start.type='submit';form.append(start);form.onsubmit=e=>{e.preventDefault();if(gesPascoAuth.currentUser?.uid!==owner)return;if(attempt&&!attempt.finishedAtMs&&!confirm('Replace your unfinished test?'))return;try{attempt=core.create(banks.find(b=>b.id===select.value),{owner,count:Number(count.value),minutes:Number(minutes.value)});persist();question();}catch(error){status.textContent=error.message;}};body.append(form);
  if(attempt)body.append(button(attempt.finishedAtMs?'View latest result':'Resume saved test',()=>{tick();if(attempt.finishedAtMs)results();else question();}));
  const history=read('history',[]);if(history.length){body.append(node('h3','Recent results'));history.slice(0,5).forEach(h=>body.append(node('p',h.title+' · '+h.percent+'% · '+new Date(h.finishedAtMs).toLocaleDateString(),'practiceMuted')));}body.append(node('p','Attempts and results stay on this browser for this account. They do not sync between devices. Up to 20 results are retained.','practiceMuted'));
  }catch(error){if(epoch===generation)status.textContent=error.message;}
 }
 function close(){persist();clearInterval(timer);generation++;dialog.close();}
 function open(){const user=gesPascoAuth.currentUser;if(!user)return;owner=user.uid;const saved=read('attempt',null);attempt=core.validAttempt(saved,owner)?saved:null;dialog.showModal();setup();clearInterval(timer);timer=setInterval(tick,1000);}
 document.querySelectorAll('[data-open-practice]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!dialog.open)open();}));
 document.getElementById('practiceClose').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 window.addEventListener('storage',e=>{if(owner&&e.key===key('attempt')&&dialog.open){clearInterval(timer);generation++;attempt=null;dialog.close();}});
 window.addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick();else persist();});
 gesPascoAuth.onAuthStateChanged(user=>{if(user?.uid!==owner){if(dialog.open)close();owner=user?.uid||'';attempt=null;generation++;}});
})();
