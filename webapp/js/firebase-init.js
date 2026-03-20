// ═══════════════════════════════════════════════════
// FIREBASE INIT — cocktail-legend
// ═══════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkIK5KD-LHCdAhxHVS-bbnwP9Qak2vTxc",
  authDomain: "cocktail-legend.firebaseapp.com",
  projectId: "cocktail-legend",
  storageBucket: "cocktail-legend.firebasestorage.app",
  messagingSenderId: "237023162237",
  appId: "1:237023162237:web:8a35e5421521171e2fa614"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Esponi globalmente per js.js ──────────────────
window._fbAuth = auth;
window._fbDb = db;
window._fbFunctions = {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
};

// ── Variabile globale utente corrente ─────────────
window._currentUser = null;

onAuthStateChanged(auth, function(user) {
  window._currentUser = user;
  // Dispatch evento custom così js.js sa quando l'utente è pronto
  window.dispatchEvent(new CustomEvent('fb-auth-ready', { detail: { user: user } }));
});
