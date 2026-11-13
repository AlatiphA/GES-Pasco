/* Group existing reviewer actions without introducing a second permission check. */
(()=>{
 const group=document.getElementById('profileAdministration'),entries=['reviewReportsEntry','quizAdminEntry','paymentAdminEntry','usersAdminEntry','protectedContentAdminEntry'].map(id=>document.getElementById(id));
 function update(){const visible=entries.some(entry=>entry&&!entry.hidden);group.hidden=!visible;if(!visible)group.open=false;}
 const observer=new MutationObserver(update);for(const entry of entries)if(entry)observer.observe(entry,{attributes:true,attributeFilter:['hidden']});update();
})();
