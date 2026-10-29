/* Group existing reviewer actions without introducing a second permission check or new access. */
(()=>{
 const group=document.getElementById('profileAdministration'),review=document.getElementById('reviewReportsEntry'),quiz=document.getElementById('quizAdminEntry');
 function update(){const visible=!review.hidden||!quiz.hidden;group.hidden=!visible;if(!visible)group.open=false;}
 const observer=new MutationObserver(update);for(const entry of [review,quiz])observer.observe(entry,{attributes:true,attributeFilter:['hidden']});update();
})();
