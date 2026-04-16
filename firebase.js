import { initializeApp, getApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { 
  getFirestore,
  initializeFirestore,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  getDocsFromServer, 
  setDoc 
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';
import firebaseConfig from './firebase-config.js';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with Long Polling and memory-only cache for better iframe compatibility
export const db = initializeFirestore(app, {
  databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
  experimentalForceLongPolling: true,
  localCache: {
    kind: 'memory'
  }
});

// Export Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Export Storage
export const storage = getStorage(app);

// Re-export Firestore functions
export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocsFromServer,
  setDoc,
  onAuthStateChanged,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  initializeFirestore,
  getApp
};

// Check if user is admin
export async function checkIsAdmin(user) {
  if (!user) return false;
  if (user.email === 'canuck.in.japan@gmail.com') return true;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() && userDoc.data().role === 'admin';
  } catch (e) {
    console.error("Error checking admin status:", e);
    return false;
  }
}

// Firestore error handler
export function handleFirestoreError(error, operation, path) {
  const errInfo = {
    error: error.message,
    operation,
    path,
    auth: auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : 'not authenticated'
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
