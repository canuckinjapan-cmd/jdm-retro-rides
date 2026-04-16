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
  setDoc,
  writeBatch,
  disableNetwork,
  enableNetwork,
  terminate,
  enableIndexedDbPersistence
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';
import firebaseConfig from './firebase-config.js';
export { firebaseConfig };

const app = initializeApp(firebaseConfig);

// Initialize Firestore using getFirestore for standard behavior
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Export Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Export Storage
export const storage = getStorage(app);

// Enable Persistence for better iframe/offline support
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Firestore Persistence Error:", err.code);
});

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
  writeBatch,
  onAuthStateChanged,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  initializeFirestore,
  getApp,
  disableNetwork,
  enableNetwork,
  terminate
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
    message: error.message || String(error),
    operation,
    path,
    auth: auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email } : 'not authenticated'
  };
  console.error('Firestore Error:', errInfo);
  throw new Error(JSON.stringify(errInfo));
}
