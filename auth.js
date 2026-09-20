/* =====================================================
   GES Pasco v1.0.0 - Authentication
===================================================== */
(() => {
  "use strict";

  const startupGate = document.getElementById("startupGate");
  const authGate = document.getElementById("authGate");
  const readerApp = document.getElementById("readerApp");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const forgotForm = document.getElementById("forgotForm");
  const authMessage = document.getElementById("authMessage");
  const logoutBtn = document.getElementById("logoutBtn");
  const profileBtn = document.getElementById("profileBtn");
  const profileMenu = document.getElementById("profileMenu");
  const profileBackdrop = document.getElementById("profileBackdrop");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileAccountType = document.getElementById("profileAccountType");
  const profileInitials = document.getElementById("profileInitials");
  const profileMenuInitials = document.getElementById("profileMenuInitials");
  const profileAvatarImage = document.getElementById("profileAvatarImage");
  const profileMenuAvatarImage = document.getElementById("profileMenuAvatarImage");
  let readerLoaded = false;
  let signupInProgress = false;
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });


  function getInitials(name, email) {
    const cleanName = (name || "").trim();
    if (cleanName) {
      const parts = cleanName.split(/\s+/).filter(Boolean);
      return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "U";
    }
    return ((email || "U").trim()[0] || "U").toUpperCase();
  }

  function setProfileMenu(open) {
    profileMenu.hidden = !open;
    profileBackdrop.hidden = !open;
    profileBtn.setAttribute("aria-expanded", String(open));
  }

  function renderProfile(profile, user) {
    const name = (profile && profile.displayName) || user.displayName || "GES Pasco User";
    const email = (profile && profile.email) || user.email || "";
    const initials = getInitials(name, email);
    const photoURL = user.photoURL || "";
    const providerIds = (user.providerData || []).map(item => item.providerId);

    profileName.textContent = name;
    profileEmail.textContent = email;
    profileAccountType.textContent = providerIds.includes("google.com") ? "Google account" : "Email account";
    profileInitials.textContent = initials;
    profileMenuInitials.textContent = initials;

    [profileAvatarImage, profileMenuAvatarImage].forEach(img => {
      if (photoURL) {
        img.src = photoURL;
        img.hidden = false;
      } else {
        img.removeAttribute("src");
        img.hidden = true;
      }
    });
    profileInitials.hidden = Boolean(photoURL);
    profileMenuInitials.hidden = Boolean(photoURL);
  }

  async function loadUserProfile(user) {
    const ref = gesPascoDb.collection("users").doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      const profile = {
        displayName: user.displayName || "",
        email: user.email || "",
        role: "user",
        accountStatus: "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: null
      };
      await ref.set(profile);
      renderProfile(profile, user);
      return;
    }
    renderProfile(snap.data() || {}, user);
  }

  profileBtn.addEventListener("click", event => {
    event.stopPropagation();
    setProfileMenu(profileMenu.hidden);
  });
  profileBackdrop.addEventListener("click", () => setProfileMenu(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setProfileMenu(false);
  });

  function showMessage(message, type = "error") {
    authMessage.textContent = message;
    authMessage.className = `authMessage ${type}`;
    authMessage.hidden = false;
  }

  function clearMessage() {
    authMessage.hidden = true;
    authMessage.textContent = "";
  }

  function showForm(form) {
    clearMessage();
    [loginForm, signupForm, forgotForm].forEach(f => f.hidden = f !== form);
  }

  function friendlyError(error) {
    const code = error && error.code ? error.code : "";
    const messages = {
      "auth/invalid-email": "Enter a valid email address.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/user-not-found": "No account was found for this email.",
      "auth/wrong-password": "Incorrect email or password.",
      "auth/email-already-in-use": "An account already exists for this email.",
      "auth/weak-password": "Password must contain at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/network-request-failed": "Network error. Check your connection and try again.",
      "auth/popup-blocked": "Google sign-in was blocked by the browser. Allow pop-ups and try again.",
      "auth/account-exists-with-different-credential": "An account already exists with this email using another sign-in method."
    };
    return messages[code] || (error && error.message) || "Something went wrong. Please try again.";
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? "Please wait..." : button.dataset.label;
  }

  function loadReaderOnce() {
    if (readerLoaded) return;
    readerLoaded = true;
    const script = document.createElement("script");
    script.src = "./app.js";
    script.defer = true;
    script.onerror = () => showMessage("The reader could not be loaded. Please refresh and try again.");
    document.body.appendChild(script);
  }

  document.getElementById("showSignupBtn").addEventListener("click", () => showForm(signupForm));
  document.getElementById("showForgotBtn").addEventListener("click", () => {
    document.getElementById("forgotEmail").value = document.getElementById("loginEmail").value.trim();
    showForm(forgotForm);
  });
  document.querySelectorAll(".showLoginBtn").forEach(btn => btn.addEventListener("click", () => showForm(loginForm)));

  document.querySelectorAll(".passwordToggle").forEach(button => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      button.innerHTML = showing ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
    });
  });

  async function signInWithGoogle(button) {
    clearMessage();
    const oldText = button.innerHTML;
    button.disabled = true;
    button.textContent = "Please wait...";
    try {
      const credential = await gesPascoAuth.signInWithPopup(googleProvider);
      const user = credential.user;
      await loadUserProfile(user);
      await gesPascoDb.collection("users").doc(user.uid).update({
        displayName: user.displayName || "",
        email: user.email || "",
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") showMessage(friendlyError(error));
    } finally {
      button.disabled = false;
      button.innerHTML = oldText;
    }
  }

  document.querySelectorAll("#googleSignInBtn, .googleSignInBtn").forEach(button =>
    button.addEventListener("click", () => signInWithGoogle(button))
  );

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    setBusy(loginForm, true);
    try {
      const credential = await gesPascoAuth.signInWithEmailAndPassword(
        document.getElementById("loginEmail").value.trim(),
        document.getElementById("loginPassword").value
      );
      await gesPascoDb.collection("users").doc(credential.user.uid).set({
        displayName: credential.user.displayName || "",
        email: credential.user.email || "",
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      showMessage(friendlyError(error));
    } finally {
      setBusy(loginForm, false);
    }
  });

  signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirm").value;

    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }

    setBusy(signupForm, true);
    signupInProgress = true;
    try {
      const credential = await gesPascoAuth.createUserWithEmailAndPassword(email, password);
      await credential.user.updateProfile({ displayName: name });
      await gesPascoDb.collection("users").doc(credential.user.uid).set({
        displayName: name,
        email: email,
        role: "user",
        accountStatus: "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: null
      }, { merge: true });

      await gesPascoAuth.signOut();
      signupForm.reset();
      showForm(loginForm);
      showMessage("Account created successfully. Please log in.", "success");
    } catch (error) {
      showMessage(friendlyError(error));
    } finally {
      signupInProgress = false;
      setBusy(signupForm, false);
    }
  });

  forgotForm.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();
    setBusy(forgotForm, true);
    try {
      await gesPascoAuth.sendPasswordResetEmail(document.getElementById("forgotEmail").value.trim());
      showMessage("Password reset link sent. Check your email.", "success");
    } catch (error) {
      showMessage(friendlyError(error));
    } finally {
      setBusy(forgotForm, false);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    setProfileMenu(false);
    try {
      await gesPascoAuth.signOut();
      location.reload();
    } catch (error) {
      alert(friendlyError(error));
    }
  });

  function startAuthObserver() {
    let initialAuthResolved = false;

    gesPascoAuth.onAuthStateChanged(async user => {
      // Firebase calls this observer only after it has restored the persisted
      // session. Until this first callback, show only the neutral startup gate.
      if (!initialAuthResolved) {
        initialAuthResolved = true;
        startupGate.hidden = true;
      }

      // createUserWithEmailAndPassword signs a new account in automatically.
      // During registration we deliberately keep the reader closed, create
      // the profile, sign the account out, then return to Login.
      if (signupInProgress) {
        readerApp.hidden = true;
        authGate.hidden = false;
        return;
      }

      if (user) {
        authGate.hidden = true;
        readerApp.hidden = false;
        try {
          await loadUserProfile(user);
        } catch (error) {
          console.error("Could not load user profile:", error);
          renderProfile({}, user);
        }
        loadReaderOnce();
      } else {
        readerApp.hidden = true;
        authGate.hidden = false;
        showForm(loginForm);
      }
    }, error => {
      console.error("Authentication state check failed:", error);
      startupGate.hidden = true;
      readerApp.hidden = true;
      authGate.hidden = false;
      showForm(loginForm);
      showMessage("We could not check your sign-in session. Check your connection and try again.");
    });
  }

  // Explicit LOCAL persistence keeps the user signed in across refreshes,
  // browser restarts and installed-PWA launches until Logout is selected.
  gesPascoAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(startAuthObserver)
    .catch(error => {
      console.error("Could not enable local authentication persistence:", error);
      showMessage("Sign-in persistence could not be enabled. Please refresh and try again.");
      startAuthObserver();
    });

})();
