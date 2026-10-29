/* Reading overview uses the reader's existing per-account stores; it writes no progress. */
(()=>{
 const dialog=document.getElementById('readingDashboard'),body=document.getElementById('readingDashboardBody'),status=document.getElementById('readingDashboardStatus');let owner='',generation=0,busy=false;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const button=(label,fn,primary=false)=>{const b=node('button',label,'profileAction'+(primary?' profileActionPrimary':''));b.type='button';b.onclick=fn;return b;};
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key+'-user-'+owner))??fallback;}catch{return fallback;}}
 const percent=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?Math.floor(value):null;
 const valid=cfi=>typeof cfi==='string'&&cfi.startsWith('epubcfi(')&&cfi.endsWith(')');
 function chapter(value){const title=window.GESPascoReading?.chapterTitle(value);return title||'Saved reading position';}
 function close(){generation++;dialog.close();}
 async function go(cfi){if(busy||!valid(cfi)||gesPascoAuth.currentUser?.uid!==owner)return;const uid=owner,token=generation;busy=true;status.textContent='Opening your saved place…';try{if(!window.GESPascoReading)throw Error('The reader is still loading. Try again in a moment.');await window.GESPascoReading.openLocation(uid,cfi);if(owner===uid&&generation===token)close();}catch(error){if(owner===uid&&generation===token)status.textContent=error.message||'Could not open this place. Use Offline reading → Download / repair if book files are missing.';}finally{busy=false;}}
 function render(){if(!dialog.open||gesPascoAuth.currentUser?.uid!==owner)return;const saved=read('ges-pasco-data',{}),raw=read('ges-pasco-bookmarks',[]),marks=(Array.isArray(raw)?raw:[]).filter(b=>b&&!b.deleted&&valid(b.cfi)).sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));body.replaceChildren();status.textContent=navigator.onLine?'Reading progress and bookmarks use your existing account sync.':'Offline: showing reading progress and bookmarks saved on this device.';
 const card=node('section',undefined,'readingContinue');card.append(node('p','GES Promotion Aptitude Test Pasco','practiceMuted'),node('h3',valid(saved.location)?chapter(saved.chapter):'Ready when you are'));
 const progress=percent(saved.progress);if(valid(saved.location)){if(progress!==null){card.append(node('strong',progress+'% read'));const bar=document.createElement('progress');bar.max=100;bar.value=progress;bar.setAttribute('aria-label','Book reading progress');card.append(bar);}const date=Date.parse(saved.lastRead);if(Number.isFinite(date))card.append(node('p','Last read '+new Date(date).toLocaleString(),'practiceMuted'));card.append(button('Continue reading',()=>go(saved.location),true));}else{card.append(node('p','Start reading to save your place here.','practiceMuted'),button('Back to reader',()=>{window.GESPascoReading?.showReader();close();},true));}body.append(card);
 body.append(node('h3','Recent bookmarks'),node('p',marks.length+' saved bookmark'+(marks.length===1?'':'')+' · Showing up to 8 most recent','practiceMuted'));
 if(!marks.length)body.append(node('p','No bookmarks yet. Use the bookmark button while reading to save a place.','readingEmpty'));
 const list=node('ul',undefined,'readingBookmarkList');for(const mark of marks.slice(0,8)){const row=node('li');const b=button((typeof mark.chapter==='string'&&mark.chapter.trim())||'Saved bookmark',()=>go(mark.cfi));const p=percent(mark.progress);b.append(node('small',(p===null?'':p+'% read')+(Number.isFinite(Date.parse(mark.date))?' · '+new Date(mark.date).toLocaleDateString():'')));row.append(b);list.append(row);}body.append(list);
 if(marks.length>8)body.append(node('p','Open the reader’s Bookmarks tab to see all saved bookmarks.','practiceMuted'));
 }
 function open(){const uid=gesPascoAuth.currentUser?.uid;if(!uid)return;owner=uid;generation++;busy=false;if(!dialog.open)dialog.showModal();render();}
 document.querySelectorAll('[data-open-reading]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open();}));document.getElementById('readingDashboardClose').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();close();});
 gesPascoAuth.onAuthStateChanged(user=>{if(owner!==user?.uid){close();owner=user?.uid||'';busy=false;body.replaceChildren();}});
 for(const event of ['storage','ges-pasco-bookmarks-updated','ges-pasco-reading-updated','ges-pasco-reader-ready','online','offline'])window.addEventListener(event,render);
})();
