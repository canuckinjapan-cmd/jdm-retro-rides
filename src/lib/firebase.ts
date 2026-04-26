import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific options for better iframe/long-running session support
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const login = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

export const storage = getStorage(app);

export { 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  onAuthStateChanged,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};

export type VehicleStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface Vehicle {
  id: string;
  img: string; // The URL to the main photo
  name: string;
  chassis: string;
  year: number;
  priceJPY: number;
  mileage: string;
  mileageKm: number;
  grade: string;
  transmission: string;
  displacementCc: number;
  displacementLabel: string;
  status: VehicleStatus;
  featured?: boolean;
  featuredOrder?: number;
  stockNumber?: string;
  dateAdded?: string;
  images?: string[];
  description?: string;
  color?: string;
  repaired?: string;
  seatingCapacity?: number;
  driveSystem?: string;
  updatedAt?: any;
}

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const q = query(collection(db, "vehicles"), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Vehicle));
};

export async function checkIsAdmin(user: any) {
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
