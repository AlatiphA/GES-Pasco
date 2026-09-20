/* =====================================================
   GES Pasco v1.0.0 - Firebase Configuration
===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyA8-HR1P34BSf86IUcJamwxNsdf3vmkaMo",
  authDomain: "alatipha-ges-pasco.firebaseapp.com",
  projectId: "alatipha-ges-pasco",
  storageBucket: "alatipha-ges-pasco.firebasestorage.app",
  messagingSenderId: "816273425750",
  appId: "1:816273425750:web:95a34c17bfd371561702f7",
  measurementId: "G-1QJH86Z8Y7"
};

// Firebase Storage is intentionally not initialized in v1.0.0.
firebase.initializeApp(firebaseConfig);

const gesPascoAuth = firebase.auth();
const gesPascoDb = firebase.firestore();
