/* The existing role checks control the single full-page administration link. */
(()=>{
 const group=document.getElementById('profileAdministration'),link=document.getElementById('openAdminPage'),entries=['reviewReportsEntry','quizAdminEntry','paymentAdminEntry','usersAdminEntry','protectedContentAdminEntry'].map(id=>document.getElementById(id));
 function update(){link.hidden=!entries.some(entry=>entry&&!entry.hidden);group.hidden=true;group.open=false;}
 const observer=new MutationObserver(update);for(const entry of entries)if(entry)observer.observe(entry,{attributes:true,attributeFilter:['hidden']});update();
})();
