import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
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
  memoryLocalCache
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);

// Use memory-only cache to avoid IndexedDB issues in iframes (AI Studio)
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Test connection
(async () => {
  try {
    if (window.logDebug) window.logDebug("🔥 Testing Firestore connection...");
    const testDoc = await getDoc(doc(db, 'settings', 'landingPage'));
    const msg = `🔥 Firestore connection test success: ${testDoc.exists() ? "Config found" : "Config missing"}`;
    if (window.logDebug) window.logDebug(msg);
  } catch (e) {
    console.error("🔥 Firestore connection test failed:", e);
    if (window.logDebug) window.logDebug(`🔥 Firestore connection test failed: ${e.message}`, true);
  }
})();

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Auth helpers
export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Check if user is admin
export async function checkIsAdmin(user) {
  if (!user) return false;
  // Bootstrap admin
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
