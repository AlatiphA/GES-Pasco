/* =====================================================
   GES Promotion Aptitude Test Pasco — PWA Install Prompt
   install.js
   ─────────────────────────────────────────────────
   Handles install prompt for Android/Chrome
   and install instructions for iOS/Safari.
   Loaded as a separate script after app.js.
===================================================== */
/* =========================
   PWA INSTALL PROMPT
========================= */

(function() {

  /* Inject styles */
  const style = document.createElement("style");
  style.textContent = `
    #installBanner {
      position: fixed;
      bottom: -120px;
      left: 50%;
      transform: translateX(-50%);
      width: min(360px, 92vw);
      background: #1e1e2e;
      color: #eee;
      border: 1px solid #3a3a5a;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      z-index: 99999;
      transition: bottom 0.4s cubic-bezier(0.4,0,0.2,1);
      font-family: Arial, sans-serif;
    }
    #installBanner.show {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
    }
    #installBanner img {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      flex-shrink: 0;
    }
    #installBanner .ib-text {
      flex: 1;
      min-width: 0;
    }
    #installBanner .ib-title {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #installBanner .ib-sub {
      font-size: 11px;
      color: #aaa;
      margin-top: 2px;
    }
    #installBanner .ib-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    #installBanner .ib-install {
      background: #4aa3ff;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    #installBanner .ib-dismiss {
      background: none;
      color: #888;
      border: none;
      border-radius: 8px;
      padding: 7px 10px;
      font-size: 12px;
      cursor: pointer;
    }
    #installBanner .ib-install:hover { background: #3a93ef; }
    #installBanner .ib-dismiss:hover { color: #ccc; }

    /* iOS-specific instruction banner */
    #iosBanner {
      position: fixed;
      bottom: -140px;
      left: 50%;
      transform: translateX(-50%);
      width: min(340px, 92vw);
      background: #1e1e2e;
      color: #eee;
      border: 1px solid #3a3a5a;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      padding: 14px 16px;
      z-index: 99999;
      transition: bottom 0.4s cubic-bezier(0.4,0,0.2,1);
      font-family: Arial, sans-serif;
      text-align: center;
    }
    #iosBanner.show {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
    }
    #iosBanner .ios-title {
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 6px;
    }
    #iosBanner .ios-steps {
      font-size: 12px;
      color: #bbb;
      line-height: 1.7;
    }
    #iosBanner .ios-close {
      margin-top: 10px;
      background: none;
      border: 1px solid #555;
      color: #aaa;
      border-radius: 8px;
      padding: 6px 20px;
      font-size: 12px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const INSTALL_KEY = "gespasco_install_dismissed";
  const aboutButton=document.getElementById('aboutInstallApp');
  const aboutStatus=document.getElementById('appInstallStatus');
  let installingApp=false,installedThisSession=false;
  function dismissed(){try{return localStorage.getItem(INSTALL_KEY)==='1';}catch{return false;}}
  function rememberDismissal(){try{localStorage.setItem(INSTALL_KEY,'1');}catch{}}
  function standalone(){return navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches===true;}
  function renderAbout(message){if(!aboutButton)return;const installed=standalone()||installedThisSession;aboutButton.disabled=installingApp||installed;aboutButton.textContent=installed?'App installed':installingApp?'Opening installer...':'Install app';aboutStatus.textContent=message||(installed?'GES Pasco is installed. Open it from your home screen or app launcher.':deferredPrompt?'Install GES Pasco on this device for quick access.':'Add GES Pasco to your home screen or app launcher.');}
  async function installApp(){
    if(installingApp||standalone()||installedThisSession)return;
    if(!deferredPrompt){
      const apple=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
      renderAbout(apple?'In Safari, tap Share, then Add to Home Screen and Add. If offered, leave Open as Web App on.':/android/i.test(navigator.userAgent)?'Open the browser menu and choose Install app or Add to Home screen. If unavailable here, open GES Pasco in Chrome.':/Chrome|Edg/i.test(navigator.userAgent)?'Use the install icon in the address bar, or the browser menu. In Chrome: Cast, save, and share → Install page as app.':'Open GES Pasco in Chrome or Edge to install it, or use your browser’s Add to Home Screen option.');return;
    }
    const prompt=deferredPrompt;deferredPrompt=null;installingApp=true;renderAbout('Choose Install in your browser’s confirmation.');
    document.getElementById('installBanner')?.remove();
    try{await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==='accepted'){rememberDismissal();renderAbout('Installation accepted. Complete any remaining browser steps.');}else renderAbout('Installation cancelled. You can use Install app again when ready.');}
    catch{renderAbout('The browser could not open the installer. Use its menu to install GES Pasco.');}
    finally{installingApp=false;const message=aboutStatus?.textContent;renderAbout(message);}
  }
  aboutButton?.addEventListener('click',installApp);
  window.addEventListener('appinstalled',()=>{installedThisSession=true;deferredPrompt=null;rememberDismissal();document.getElementById('installBanner')?.remove();document.getElementById('iosBanner')?.remove();renderAbout();});

  /* ── ANDROID / DESKTOP (Chrome) ── */
  let deferredPrompt = null;

  window.addEventListener(
    "beforeinstallprompt",
    e => {
      e.preventDefault();
      deferredPrompt = e;

      renderAbout();
      /* Dismissing the banner does not disable installation from About. */
      if(!dismissed()&&!standalone())setTimeout(() => showInstallBanner(), 4000);
    }
  );

  function showInstallBanner() {
    if(!deferredPrompt||dismissed()||standalone()||document.getElementById("installBanner"))return;

    const banner =
      document.createElement("div");
    banner.id = "installBanner";
    banner.innerHTML = `
      <img src="icon-192.png" alt="icon" />
      <div class="ib-text">
        <div class="ib-title">GES Pasco</div>
        <div class="ib-sub">Add to Home Screen for offline reading</div>
      </div>
      <div class="ib-actions">
        <button class="ib-install" id="ibInstall">Install</button>
        <button class="ib-dismiss" id="ibDismiss">✕</button>
      </div>
    `;
    document.body.appendChild(banner);

    /* Slide up */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.classList.add("show");
      });
    });

    document.getElementById("ibInstall")
      .addEventListener("click", installApp);

    document.getElementById("ibDismiss")
      .addEventListener("click", () => {
        banner.classList.remove("show");
        rememberDismissal();
        setTimeout(() => banner.remove(), 400);
      });

  }

  /* ── iOS (Safari) ── */
  const isIOS =
    /iphone|ipad|ipod/i.test(
      navigator.userAgent
    );

  const isInStandalone =
    window.navigator.standalone === true ||
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

  if (isIOS && !isInStandalone && !dismissed()) {

    setTimeout(() => {

      const banner =
        document.createElement("div");
      banner.id = "iosBanner";
      banner.innerHTML = `
        <div class="ios-title">
          📖 Install GES Pasco
        </div>
        <div class="ios-steps">
          Tap <strong>Share</strong> (□↑) at the bottom of Safari<br>
          then tap <strong>"Add to Home Screen"</strong>
        </div>
        <button class="ios-close" id="iosClose">Got it</button>
      `;
      document.body.appendChild(banner);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          banner.classList.add("show");
        });
      });

      document.getElementById("iosClose")
        .addEventListener("click", () => {
          banner.classList.remove("show");
          rememberDismissal();
          setTimeout(() => banner.remove(), 400);
        });

    }, 4000);

  }

  renderAbout();
  window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change",()=>renderAbout());
})();
