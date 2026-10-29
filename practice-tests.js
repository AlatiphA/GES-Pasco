/* Practice uses the book's answer markings; attempts remain account-scoped on this browser. */
(() => {
 const revisionCore=window.GESPascoRevisionCore;
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
 function finish(){if(!attempt)return;core.finish(attempt);persist();write('history',revisionCore.rows(read('history',[]),attempt,owner,core));results();}

 function question(){
  generation++;
  if(!attempt)return;if(attempt.finishedAtMs){results();return;}
  if(attempt.deadlineMs&&Date.now()>=attempt.deadlineMs){finish();return;}
  document.getElementById("practiceTitle").textContent="Practice tests";
  resetBody();const i=attempt.index,q=attempt.questions[i];
  body.append(node('p',attempt.title,'practiceMuted'));const top=node('div',undefined,'practiceToolbar');top.append(node('strong','Question '+(i+1)+' of '+attempt.questions.length));const time=node('span',timerText());time.id='practiceTimer';top.append(time);body.append(top,node('h3',q.prompt,'practicePrompt'));
  const field=document.createElement('fieldset'),legend=node('legend','Choose one answer','practiceSrOnly');field.append(legend);
  q.options.forEach((text,value)=>{const label=node('label',undefined,'practiceOption'),radio=document.createElement('input');radio.type='radio';radio.name='practice-answer';radio.value=String(value);radio.checked=attempt.answers[i]===value;radio.onchange=()=>{if(core.answer(attempt,i,value)){persist();label.parentElement.querySelectorAll('label').forEach(el=>el.classList.remove('selected'));label.classList.add('selected');}else finish();};if(radio.checked)label.classList.add('selected');label.append(radio,node('span',text));field.append(label);});body.append(field);
  const actions=node('div',undefined,'practiceToolbar');const prev=button('Previous',()=>{attempt.index--;persist();question();});prev.disabled=i===0;const next=button(i===attempt.questions.length-1?'Finish test':'Next',()=>{if(i===attempt.questions.length-1){if(confirm('Finish this test? Unanswered questions count as incorrect.'))finish();}else{attempt.index++;persist();question();}},'profileAction profileActionPrimary');actions.append(prev,next);body.append(actions,button('Finish now',()=>{if(confirm('Finish this test? Unanswered questions count as incorrect.'))finish();}),node('p','Answers are shown after you finish. Closing the test saves your place. A timed test keeps counting while closed.','practiceMuted'));
 }
 function results(){
  generation++;
  if(!attempt)return;if(!attempt.finishedAtMs){question();return;}
  document.getElementById("practiceTitle").textContent="Practice results";
  resetBody();const score=core.score(attempt);body.append(node('h3',score.percent+'% — '+score.correct+' / '+score.total+' correct'),node('p',score.unanswered+' unanswered. Scores use the question set selected when this test started. Published reviewer corrections apply to new tests; original book answers may differ.','practiceMuted'));
  const tools=node('div',undefined,'practiceToolbar');tools.append(button('Choose another test',setup),button('Practise mistakes',()=>{const retry=core.retry(attempt);if(retry){attempt=retry;persist();question();}},'profileAction profileActionPrimary'));tools.lastChild.disabled=!score.incorrect.length;tools.append(button('Revision dashboard',()=>revision()));body.append(tools);
  attempt.questions.forEach((q,i)=>{const card=node('details',undefined,'practiceReview');card.append(node('summary',(i+1)+'. '+(attempt.answers[i]===q.answer?'Correct':'Review')+' — '+q.prompt));const content=node('div');content.append(node('p','Your answer: '+(attempt.answers[i]===null?'Unanswered':q.options[attempt.answers[i]])),node('p',(q.answerBasis==='reviewed'?'Reviewed answer: ':'Book answer: ')+q.options[q.answer]),node('p',q.explanation),node('p',q.source,'practiceMuted'));content.append(button('Report this question',()=>window.GESPascoReports.open({id:q.id,bankId:attempt.bankId,bankTitle:attempt.title,prompt:q.prompt,options:q.options,answerIndex:q.answer,source:q.source})));card.append(content);body.append(card);});
 }
 async function load(){if(!loading)loading=fetch('./practice-bank.json').then(r=>{if(!r.ok)throw Error('Question files unavailable. Use Offline reading → Download / repair while online.');return r.json();}).then(data=>{if(data.schema!==1||!Array.isArray(data.banks)||!data.banks.length||!data.banks.every(core.validBank))throw Error('Question files could not be validated.');return window.GESPascoQuestionBanks.load(data.banks).then(next=>{banks=next;});}).catch(e=>{loading=null;throw e;}).finally(()=>{loading=null;});return loading;}
 async function setup(){
  document.getElementById("practiceTitle").textContent="Practice tests";
  const epoch=++generation;resetBody();body.append(node('p','Loading question sets…'));
  try{await load();if(epoch!==generation||!dialog.open||gesPascoAuth.currentUser?.uid!==owner)return;resetBody();body.append(node('p','Questions include the bundled GES Pasco book and any published reviewer sets. Reviewed corrections may differ from the book.','practiceMuted'));if(window.GESPascoQuestionBanks.message())body.append(node('p',window.GESPascoQuestionBanks.message(),'practiceMuted'));if(!banks.length){body.append(node('p','No question sets are currently available.'));return;}body.append(button('Revision dashboard',()=>revision()));const form=document.createElement('form');form.className='practiceSetup';const select=document.createElement('select'),count=document.createElement('input'),minutes=document.createElement('input');
  for(const b of banks){const option=node('option',b.title+' ('+b.questions.length+')');option.value=b.id;select.append(option);}count.type=minutes.type='number';count.min='1';count.max='100';count.value='10';minutes.min='0';minutes.max='120';minutes.value='0';count.required=minutes.required=true;const limit=()=>{const max=banks.find(b=>b.id===select.value).questions.length;count.max=String(max);if(Number(count.value)>max)count.value=String(max);};select.onchange=limit;limit();
  for(const [name,input] of [['Question set',select],['Number of questions',count],['Time limit in minutes (0 = untimed)',minutes]]){const label=node('label',name);label.append(input);form.append(label);}const start=node('button','Start practice','profileAction profileActionPrimary');start.type='submit';form.append(start);form.onsubmit=e=>{e.preventDefault();if(gesPascoAuth.currentUser?.uid!==owner)return;if(attempt&&!attempt.finishedAtMs&&!confirm('Replace your unfinished test?'))return;try{attempt=core.create(banks.find(b=>b.id===select.value),{owner,count:Number(count.value),minutes:Number(minutes.value)});persist();question();}catch(error){status.textContent=error.message;}};body.append(form);
  if(attempt)body.append(button(attempt.finishedAtMs?'View latest result':'Resume saved test',()=>{tick();if(attempt.finishedAtMs)results();else question();}));
  const history=read('history',[]);if(history.length){body.append(node('h3','Recent results'));history.slice(0,5).forEach(h=>body.append(node('p',h.title+' · '+h.percent+'% · '+new Date(h.finishedAtMs).toLocaleDateString(),'practiceMuted')));}body.append(node('p','Attempts and results stay on this browser for this account. They do not sync between devices. Up to 20 results are retained.','practiceMuted'));
  }catch(error){if(epoch===generation)status.textContent=error.message;}
 }
 function revisionRecords(){return revisionCore.rows(read('history',[]),attempt,owner,core);}
 async function revision(filter='all'){
  const epoch=++generation,uid=owner;document.getElementById('practiceTitle').textContent='Revision dashboard';resetBody();
  const records=revisionRecords(),data=revisionCore.summarize(records,filter);
  body.append(button('Back to practice tests',setup));
  body.append(node('p','Based on up to 20 completed attempts for this account on this browser. Results do not sync between devices.','practiceMuted'));
  if(attempt&&!attempt.finishedAtMs)body.append(node('p','Your unfinished test is saved. A timed test keeps counting while you view revision.','practiceMuted'));
  if(!records.length){body.append(node('h3','Build your revision record'),node('p','Complete a practice test to see your accuracy, exam-set scores, recent results and questions to revisit.','practiceMuted'));return;}
  const allGroups=revisionCore.summarize(records).groups,label=node('label','Question set','revisionFilter'),select=document.createElement('select');select.setAttribute('aria-label','Revision question set');const all=node('option','All question sets');all.value='all';select.append(all);
  for(const g of allGroups){const option=node('option',g.title);option.value=g.id;select.append(option);}select.value=filter;select.onchange=()=>revision(select.value);label.append(select);body.append(label);
  const current=data.current;
  const stats=node('div',undefined,'revisionStats');
  for(const [name,value,hint] of [
    ['Currently correct',current.questions?current.correct+' / '+current.questions:'—','Unique questions, using your latest answer'],
    ['Questions to revisit',current.questions?String(current.missed.length):'—','Latest answer incorrect or unanswered'],
    ['Original test accuracy',data.tests.percent===null?'—':data.tests.percent+'%',data.tests.correct+' / '+data.tests.questions+' correct across '+data.tests.attempts+' original test(s)'],
    ['Mistakes corrected',current.questions?String(current.corrected):'—','Previously missed, now answered correctly']
  ]){const card=node('section',undefined,'revisionStat');card.append(node('span',name),node('strong',value),node('small',hint));stats.append(card);}body.append(stats);
  body.append(node('p','Current progress counts each question once, using its latest saved answer. Correcting a mistake improves this progress; it does not change your original test score.','revisionExplanation'));
  body.append(node('h3','Original test scores over time'));
  if(data.comparison){const c=data.comparison,change=c.latest-c.previous;body.append(node('p','Latest '+c.n+' original test(s): '+c.latest+'%. Previous '+c.n+': '+c.previous+'%. '+(change>0?'Up '+change:change<0?'Down '+Math.abs(change):'No change')+(change?' percentage points.':'.'),'practiceMuted'));}else body.append(node('p','Complete at least two original tests to compare scores. Mistake revision is shown separately.','practiceMuted'));
  const chart=node('ol',undefined,'revisionTrend');for(const r of data.tests.records.slice(0,10).reverse()){const item=node('li');item.append(node('span',Math.round(r.correct/r.total*100)+'%'));const bar=document.createElement('progress');bar.max=100;bar.value=Math.round(r.correct/r.total*100);bar.setAttribute('aria-label',r.title+' on '+new Date(r.finishedAtMs).toLocaleDateString());item.append(bar,node('small',new Date(r.finishedAtMs).toLocaleDateString()));chart.append(item);}body.append(chart);
  body.append(node('h3','Current progress by exam set'),node('p','These figures use your latest answer for each unique question with saved detail. Original test scores are kept separately underneath.','practiceMuted'));
  for(const g of data.groups){const card=node('section',undefined,'revisionGroup');card.append(node('h4',g.title));if(g.current.questions){card.append(node('p','Currently correct: '+g.current.correct+' / '+g.current.questions+' · '+g.current.percent+'%'),node('p',g.current.missed.length+' to revisit · '+g.current.corrected+' previously missed, now correct','practiceMuted'));const progress=document.createElement('progress');progress.max=100;progress.value=g.current.percent;progress.setAttribute('aria-label',g.title+' latest-answer progress');card.append(progress);}else card.append(node('p','Question-level detail is unavailable for these earlier results.','practiceMuted'));if(g.tests.attempts)card.append(node('p','Original tests: '+g.tests.correct+' / '+g.tests.questions+' correct · '+g.tests.percent+'% · '+g.tests.attempts+' test(s)','practiceMuted'));body.append(card);}
  body.append(node('h3','Practise missed questions'));
  body.append(node('p',data.missed.length+' question(s) were incorrect or unanswered the last time they appeared in a saved detailed result. Correct answers in later tests remove them from this list.','practiceMuted'));
  if(data.covered<data.attempts)body.append(node('p',(data.attempts-data.covered)+' earlier result(s) contain scores only. They remain in original-test or revision history but are excluded from unique-question progress.','practiceMuted'));
  let available=true;try{await load();}catch{available=false;}
  if(epoch!==generation||uid!==owner||!dialog.open)return;
  const tools=node('div',undefined,'practiceToolbar');
  for(const g of data.groups){const missed=data.missed.filter(q=>q.bankId===g.id);if(!missed.length)continue;const bank=banks.find(b=>b.id===g.id);const questions=bank?.questions.filter(q=>missed.some(m=>m.id===q.id))||[];const start=button('Revise '+g.title,()=>{if(gesPascoAuth.currentUser?.uid!==owner)return;if(attempt&&!attempt.finishedAtMs&&!confirm('Replace your unfinished test with mistake practice?'))return;attempt=core.create({...bank,title:bank.title+' - mistake revision',questions},{owner,count:Math.min(10,questions.length)});attempt.kind='revision';persist();question();},'profileAction profileActionPrimary');start.disabled=!available||!questions.length;tools.append(start);}
  body.append(tools);if(!available)body.append(node('p','Question files are unavailable. Your score summaries remain visible. Use Offline reading → Download / repair while online to restore mistake practice.','practiceMuted'));
  for(const [title,records] of [['Original test history',data.tests.records],['Mistake revision history',data.revisions.records]]){
    body.append(node('h3',title));if(!records.length){body.append(node('p','No completed attempts in this category.','practiceMuted'));continue;}
    const list=node('ol',undefined,'revisionHistory');for(const r of records){const row=node('li');row.append(node('strong',r.correct+' / '+r.total+' correct · '+Math.round(r.correct/r.total*100)+'%'),node('span',r.title),node('small',new Date(r.finishedAtMs).toLocaleString()));list.append(row);}body.append(list);
  }
  body.append(node('p','Original tests retain the score earned when taken. Revision history records retry sessions separately. Current progress is based on the latest answers in the saved history, not a prediction of examination results.','practiceMuted'));

 }
 function close(){persist();clearInterval(timer);generation++;dialog.close();}
 function open(view='practice'){const user=gesPascoAuth.currentUser;if(!user)return;owner=user.uid;const saved=read('attempt',null);attempt=core.validAttempt(saved,owner)?saved:null;if(attempt?.finishedAtMs)write('history',revisionRecords());dialog.showModal();if(view==='revision')revision();else setup();clearInterval(timer);timer=setInterval(tick,1000);}
 document.querySelectorAll('[data-open-practice]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!dialog.open)open();}));
 document.querySelectorAll('[data-open-revision]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!dialog.open)open('revision');}));
 document.getElementById('practiceClose').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 window.addEventListener('storage',e=>{if(owner&&e.key===key('attempt')&&dialog.open){clearInterval(timer);generation++;attempt=null;dialog.close();}});
 window.addEventListener('pagehide',persist);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick();else persist();});
 gesPascoAuth.onAuthStateChanged(user=>{if(user?.uid!==owner){if(dialog.open)close();owner=user?.uid||'';attempt=null;generation++;}});
})();
