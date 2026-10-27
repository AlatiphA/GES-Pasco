/* PromoHub-style interface appearance, independent of EPUB themes. */
(() => {
  const key='ges-pasco-ui-theme',modes=['system','light','dark'];
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');
  let choice='system';try{const saved=localStorage.getItem(key);if(modes.includes(saved))choice=saved;}catch{}
  function apply(){
    const theme=choice==='system'?(media?.matches?'dark':'light'):choice;
    document.documentElement.dataset.uiTheme=theme;
    document.documentElement.style.colorScheme=theme;
    document.querySelectorAll('[data-ui-theme-choice]').forEach(select=>select.value=choice);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#151a1c':'#f4f2ed');
  }
  function set(mode){if(!modes.includes(mode))return;choice=mode;try{localStorage.setItem(key,choice);}catch{}apply();}
  apply();
  document.addEventListener('DOMContentLoaded',()=>{apply();document.querySelectorAll('[data-ui-theme-choice]').forEach(select=>select.addEventListener('change',()=>set(select.value)));},{once:true});
  media?.addEventListener?.('change',()=>{if(choice==='system')apply();});
  window.addEventListener('storage',e=>{if(e.key===key){choice=modes.includes(e.newValue)?e.newValue:'system';apply();}});
})();
