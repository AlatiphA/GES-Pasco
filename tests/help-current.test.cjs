const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('current help keeps sample access, update and bookmark guidance consistent',()=>{
 const faq=new JSDOM(fs.readFileSync('faq.html','utf8'));
 const guide=fs.readFileSync('user-guide.js','utf8');
 for(const text of [faq.window.document.body.textContent,guide]){
  for(const term of ['MoE/GES/DD/2020','MoE/GES/AD I/2020','MoE/GES/AD II/2020','three-day','refreshes automatically','not automatically rewritten','sample book and reader files','unfinished premium test'])assert.ok(text.includes(term),term);
  assert.match(text,/sample[s\s\S]*remain[s\s\S]*free/i);
 }
 const recovery=faq.window.document.querySelector('a[href="./update.html"]');assert.ok(recovery,'a stuck older tab has an update recovery link');
 assert.ok(!faq.window.document.querySelector('.faqFooter').textContent.match(/\d{4}/),'copyright has no year');
 faq.window.close();
});
test('new FAQ entries expand with the existing accordion without changing the reader theme',()=>{
 const dom=new JSDOM(fs.readFileSync('faq.html','utf8'),{url:'https://example.com/GES-Pasco/faq.html',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('theme-v2','sepia');w.localStorage.setItem('ges-pasco-ui-theme','light');w.eval(fs.readFileSync('ui-theme.js','utf8'));
 for(const script of w.document.querySelectorAll('script:not([src])'))w.eval(script.textContent);
 const questions=[...w.document.querySelectorAll('.faqQuestion')];
 for(const title of ['How do I install an app update?','Why did an older bookmark show 0%?','Why does the Users page show an access error?']){
  const button=questions.find(b=>b.textContent.trim()===title);assert.ok(button,title);button.click();
  assert.ok(button.closest('.faqItem').classList.contains('open'));assert.equal(w.document.querySelectorAll('.faqItem.open').length,1);
  assert.equal(w.document.documentElement.dataset.uiTheme,'light');assert.equal(w.localStorage.getItem('theme-v2'),'sepia');
 }
 dom.window.close();
});
test('FAQ and guide explain active account-age trials, payment review, backups and administrator permissions',()=>{const faq=fs.readFileSync('faq.html','utf8'),guide=fs.readFileSync('user-guide.js','utf8');for(const s of [faq,guide]){for(const term of ['original account creation','paymentAdmins','Check access after approval','0243443688','GH₵20','GH₵100','Users'])assert.ok(s.includes(term),term);}assert.ok(!faq.includes('completely free'));assert.ok(!faq.includes('You have to donate a tip again'));assert.ok(!guide.includes('not activated in this release'));});
