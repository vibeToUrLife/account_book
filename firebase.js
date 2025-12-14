import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let firebaseConfig = null;
let app = null;
let auth = null;
let db = null;

export async function initFirebase() {
  try {
    // Optional file the user will create.
    const mod = await import("./firebase-config.js");
    firebaseConfig = mod.firebaseConfig;
  } catch {
    return {
      ok: false,
      reason:
        "Missing Firebase config. Create firebase-config.js (copy from firebase-config.example.js) and fill in your keys.",
    };
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  return { ok: true };
}

export function watchAuth(callback) {
  if (!auth) throw new Error("Firebase not initialized");
  return onAuthStateChanged(auth, callback);
}

export async function signUpWithEmailPassword(email, password) {
  if (!auth) throw new Error("Firebase not initialized");
  await createUserWithEmailAndPassword(auth, email, password);
  return auth.currentUser;
}

export async function signInWithEmailPassword(email, password) {
  if (!auth) throw new Error("Firebase not initialized");
  await signInWithEmailAndPassword(auth, email, password);
  return auth.currentUser;
}

export async function signInWithGooglePopup() {
  if (!auth) throw new Error("Firebase not initialized");
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  return auth.currentUser;
}

export async function signOutUser() {
  if (!auth) throw new Error("Firebase not initialized");
  await signOut(auth);
}

export function userCollections(uid) {
  if (!db) throw new Error("Firebase not initialized");
  const userDoc = doc(db, "users", uid);
  return {
    userDoc,
    categories: collection(userDoc, "categories"),
    transactions: collection(userDoc, "transactions"),
  };
}

export function firestoreApi() {
  return {
    collection,
    doc,
    addDoc,
    deleteDoc,
    setDoc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
  };
}
