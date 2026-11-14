const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const tick=()=>new Promise(r=>setTimeout(r,0));
async function authSetup(){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://example.com/GES-Pasco/',runScripts:'outside-only'}),w=dom.window;
 w.firebase={auth:{GoogleAuthProvider:class{setCustomParameters(){}},Auth:{Persistence:{LOCAL:'local'}}}};
 w.gesPascoAuth={setPersistence:async()=>{},onAuthStateChanged(){},signInWithEmailAndPassword:async()=>{throw {code:'auth/invalid-credential'};},sendPasswordResetEmail:async()=>{}};
 w.eval(fs.readFileSync('auth.js','utf8'));await tick();return {dom,w,d:w.document};
}
test('login failure appears directly after Log In and Create account stays ahead of Google',async()=>{
 const {dom,w,d}=await authSetup();d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 const message=d.getElementById('authMessage');assert.equal(message.textContent,'Incorrect email or password.');assert.equal(message.hidden,false);assert.equal(message.previousElementSibling.textContent,'Log In');assert.equal(message.nextElementSibling.querySelector('button').id,'showSignupBtn');assert.equal(message.nextElementSibling.nextElementSibling.className,'authDivider');dom.window.close();
});
test('shared auth feedback follows signup and password-reset forms and clears on switching',async()=>{
 const {dom,w,d}=await authSetup();d.getElementById('showSignupBtn').click();d.getElementById('signupPassword').value='example-one';d.getElementById('signupConfirm').value='example-two';d.getElementById('signupForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 const message=d.getElementById('authMessage');assert.equal(message.parentElement.id,'signupForm');assert.equal(message.textContent,'Passwords do not match.');d.querySelector('#signupForm .showLoginBtn').click();assert.equal(message.hidden,true);
 d.getElementById('showForgotBtn').click();d.getElementById('forgotEmail').value='reader@example.com';d.getElementById('forgotForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.equal(message.parentElement.id,'forgotForm');assert.equal(message.hidden,false);assert.equal(message.classList.contains('success'),true);dom.window.close();
});
test('account password eyes toggle only their own field, do not submit, and clear/remask on close',async()=>{
 const {dom,w,d}=await authSetup();const user={uid:'example',email:'reader@example.com',providerData:[{providerId:'password'}]};w.gesPascoAuth.currentUser=user;w.gesPascoDb={};w.eval(fs.readFileSync('account-settings.js','utf8'));let submissions=0;d.getElementById('accountPasswordForm').addEventListener('submit',()=>submissions++);
 for(const id of ['accountCurrentPassword','accountNewPassword','accountConfirmPassword','accountEmailPassword']){
  const input=d.getElementById(id),button=d.querySelector('[data-target="'+id+'"]');input.value='example-only';button.click();assert.equal(input.type,'text');assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(d.getElementById('loginPassword').type,'password');button.click();assert.equal(input.type,'password');button.click();
 }
 assert.equal(submissions,0);d.getElementById('profileClose').click();for(const id of ['accountCurrentPassword','accountNewPassword','accountConfirmPassword','accountEmailPassword']){assert.equal(d.getElementById(id).value,'');assert.equal(d.getElementById(id).type,'password');assert.equal(d.querySelector('[data-target="'+id+'"]').getAttribute('aria-pressed'),'false');}d.getElementById('accountEmailPassword').value='example-only';d.querySelector('[data-target="accountEmailPassword"]').click();d.getElementById('profileBtn').click();assert.equal(d.getElementById('accountEmailPassword').value,'');assert.equal(d.getElementById('accountEmailPassword').type,'password');dom.window.close();
});
test('subscription card follows actual grants, blocked paid devices, expiry, suspension and sign-out',()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{runScripts:'outside-only'}),w=dom.window;let state={kind:'administrator'},full=true;w.GESPascoAccess={state:()=>state,fullAccess:()=>full};w.eval(fs.readFileSync('sidebar-subscription.js','utf8'));const status=()=>w.document.getElementById('sidebarSubscriptionStatus').textContent,hint=()=>w.document.getElementById('sidebarSubscriptionHint').textContent;
 assert.equal(status(),'Administrator access');function set(next){state=next;w.dispatchEvent(new w.Event('ges-pasco-access-updated'));}
 set({kind:'full-grant',fullAccess:true});assert.equal(status(),'Complimentary full access');assert.ok(!hint().includes('local only'));
 full=false;set({kind:'subscription',expiresAtMs:Date.now()+100000});assert.equal(status(),'Active subscription');assert.match(hint(),/Manage devices/);full=true;set(state);assert.match(hint(),/Ends/);
 set({kind:'free'});assert.equal(status(),'Free sample access');set({kind:'suspended'});assert.equal(status(),'Account suspended');set({kind:'unverified'});assert.equal(status(),'Checking account access…');dom.window.close();
});
test('FAQ follows the saved interface setting and cross-tab appearance without changing book preferences',()=>{
 const dom=new JSDOM(fs.readFileSync('faq.html','utf8'),{url:'https://example.com/faq.html',runScripts:'outside-only'}),w=dom.window;w.localStorage.setItem('theme-v2','night');w.localStorage.setItem('ges-pasco-ui-theme','light');w.eval(fs.readFileSync('ui-theme.js','utf8'));for(const script of w.document.querySelectorAll('script:not([src])'))w.eval(script.textContent);assert.equal(w.document.documentElement.dataset.uiTheme,'light');w.dispatchEvent(new w.StorageEvent('storage',{key:'ges-pasco-ui-theme',newValue:'dark'}));assert.equal(w.document.documentElement.dataset.uiTheme,'dark');w.dispatchEvent(new w.MessageEvent('message',{origin:'https://untrusted.example',data:{type:'ges-pasco-ui-theme',theme:'light'}}));assert.equal(w.document.documentElement.dataset.uiTheme,'dark');assert.equal(w.localStorage.getItem('theme-v2'),'night');dom.window.close();
});
