import { initializeApp as realInitializeApp, deleteApp as realDeleteApp } from 'firebase/app';
import { 
  getAuth as realGetAuth, 
  signInWithPopup as realSignInWithPopup, 
  GoogleAuthProvider as realGoogleAuthProvider,
  onAuthStateChanged as realOnAuthStateChanged,
  signOut as realSignOut,
  signInWithEmailAndPassword as realSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as realCreateUserWithEmailAndPassword,
  updateProfile as realUpdateProfile,
  updatePassword as realUpdatePassword,
  sendPasswordResetEmail as realSendPasswordResetEmail,
  signInWithCustomToken as realSignInWithCustomToken,
  User as RealFirebaseUser
} from 'firebase/auth';
import { 
  getFirestore as realGetFirestore, 
  doc as realDoc, 
  getDocFromServer as realGetDocFromServer,
  collection as realCollection,
  onSnapshot as realOnSnapshot,
  addDoc as realAddDoc,
  updateDoc as realUpdateDoc,
  deleteDoc as realDeleteDoc,
  query as realQuery,
  orderBy as realOrderBy,
  where as realWhere,
  getDocs as realGetDocs,
  limit as realLimit,
  setDoc as realSetDoc,
  getDoc as realGetDoc,
  serverTimestamp as realServerTimestamp,
  Timestamp as RealTimestamp
} from 'firebase/firestore';

import firebaseConfig from '../firebase-applet-config.json';
import * as localDb from './lib/localFirebase';

export { firebaseConfig };

// Dynamic mode toggle
export const isLocalDb = (() => {
  if (typeof window !== 'undefined') {
    const isHostLocal = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname);
    
    // On Localhost / LAN hosts, we strictly run in Local DB mode to satisfy the localhost requirement.
    if (isHostLocal) {
      return true;
    }

    // On Cloud / Web environment, we MUST operate in Web/Online/Hybrid mode. Never force Local DB unless mock auth fallback is active.
    if (localStorage.getItem('MOCK_AUTH_ACTIVE') === 'true') {
      return true;
    }
    return false;
  }
  
  // Default to VITE_LOCAL_DB environment variable or standard host detection
  return true;
})();
console.log(`[Database Initialization] Local DB Mode: ${isLocalDb}`);

// Cloud Firebase initialization
let realApp: any = null;
let realDb: any = null;
let realAuthInst: any = null;

if (!isLocalDb) {
  try {
    realApp = realInitializeApp(firebaseConfig);
    realDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
      ? realGetFirestore(realApp, firebaseConfig.firestoreDatabaseId) 
      : realGetFirestore(realApp);
    realAuthInst = realGetAuth(realApp);
  } catch (err) {
    console.error("Failed to initialize standard Firebase Cloud services:", err);
  }
}

// Export database/auth instances
export const db = isLocalDb ? localDb.localDb : realDb;
export const auth = isLocalDb ? localDb.localAuth : realAuthInst;

export type FirebaseUser = RealFirebaseUser | any;

// Wrapper methods for standard client-side usage

export const collection = (dbInstance: any, path: string, ...pathSegments: string[]) => {
  return isLocalDb 
    ? localDb.collection(dbInstance, path, ...pathSegments) 
    : realCollection(dbInstance, path, ...pathSegments);
};

export const doc = (dbOrCol: any, pathOrId?: string, ...pathSegments: string[]) => {
  if (isLocalDb) {
    return localDb.doc(dbOrCol, pathOrId, ...pathSegments);
  }
  if (pathOrId === undefined) {
    return realDoc(dbOrCol);
  }
  return realDoc(dbOrCol, pathOrId, ...pathSegments);
};

export const onSnapshot = (q: any, callback: any, errorCallback?: any) => {
  if (isLocalDb) {
    return localDb.onSnapshot(q, callback, errorCallback);
  }
  return realOnSnapshot(q, callback, (err: any) => {
    handleCloudFirestoreFailure(err);
    const errStr = String(err?.message || err?.code || err || "").toLowerCase();
    if (errStr.includes("permission") || errStr.includes("insufficient") || err?.code === 'permission-denied') {
      console.log(`[Firebase onSnapshot] Gracefully suppressed permission denied error for query.`);
      if (errorCallback) {
        errorCallback(err);
      }
    } else {
      if (errorCallback) {
        errorCallback(err);
      } else {
        console.error("onSnapshot cloud database error:", err);
      }
    }
  });
};

export const addDoc = async (collectionRef: any, data: any) => {
  if (isLocalDb) return localDb.addDoc(collectionRef, data);
  try {
    return await realAddDoc(collectionRef, data);
  } catch (err) {
    handleCloudFirestoreFailure(err);
    throw err;
  }
};

export const updateDoc = async (docRef: any, data: any) => {
  if (isLocalDb) return localDb.updateDoc(docRef, data);
  try {
    return await realUpdateDoc(docRef, data);
  } catch (err) {
    handleCloudFirestoreFailure(err);
    throw err;
  }
};

export const deleteDoc = async (docRef: any) => {
  if (isLocalDb) return localDb.deleteDoc(docRef);
  try {
    return await realDeleteDoc(docRef);
  } catch (err) {
    handleCloudFirestoreFailure(err);
    throw err;
  }
};

export const query = (colRef: any, ...constraints: any[]) => {
  return isLocalDb ? localDb.query(colRef, ...constraints) : realQuery(colRef, ...constraints);
};

export const orderBy = (field: string, direction?: 'asc' | 'desc') => {
  return isLocalDb ? localDb.orderBy(field, direction) : realOrderBy(field, direction);
};

export const where = (field: string, op: any, value: any) => {
  return isLocalDb ? localDb.where(field, op, value) : realWhere(field, op, value);
};

export const getDocs = async (q: any) => {
  if (isLocalDb) return localDb.getDocs(q);
  try {
    return await realGetDocs(q);
  } catch (err) {
    handleCloudFirestoreFailure(err);
    throw err;
  }
};

export const limit = (value: number) => {
  return isLocalDb ? localDb.limit(value) : realLimit(value);
};

// Satisfies TS both as a static values constructor AND type
export type Timestamp = RealTimestamp;
export const Timestamp = (isLocalDb ? localDb.Timestamp : RealTimestamp) as unknown as typeof RealTimestamp;

export const setDoc = async (docRef: any, data: any, options?: any) => {
  if (isLocalDb) return localDb.setDoc(docRef, data, options);
  try {
    return await realSetDoc(docRef, data, options);
  } catch (err) {
    handleCloudFirestoreFailure(err);
    throw err;
  }
};

export const getDoc = async (docRef: any) => {
  if (isLocalDb) return localDb.getDoc(docRef);
  try {
    return await realGetDoc(docRef);
  } catch (err) {
    handleCloudFirestoreFailure(err);
    throw err;
  }
};

export const getDocFromServer = async (docRef: any) => {
  if (isLocalDb) return localDb.getDocFromServer(docRef);
  try {
    return await realGetDocFromServer(docRef);
  } catch (err) {
    handleCloudFirestoreFailure(err);
    throw err;
  }
};

export const serverTimestamp = () => {
  return isLocalDb ? localDb.serverTimestamp() : realServerTimestamp();
};

export const signInWithPopup = (authInstance: any, provider: any) => {
  return isLocalDb ? localDb.signInWithPopup(authInstance, provider) : realSignInWithPopup(authInstance, provider);
};

class MockGoogleAuthProvider {
  setCustomParameters(params: any) {
    return this;
  }
}

export const GoogleAuthProvider = new Proxy(class {}, {
  construct(target, args) {
    if (isLocalDb) {
      return new MockGoogleAuthProvider();
    } else {
      const inst = new realGoogleAuthProvider();
      if (typeof inst.setCustomParameters !== 'function') {
        (inst as any).setCustomParameters = function(params: any) { return this; };
      }
      return inst;
    }
  }
}) as any;

export const onAuthStateChanged = (authInstance: any, callback: any) => {
  return isLocalDb ? localDb.onAuthStateChanged(authInstance, callback) : realOnAuthStateChanged(authInstance, callback);
};

export const signOut = (authInstance: any) => {
  if (typeof window !== 'undefined') {
    const wasMockActive = localStorage.getItem('MOCK_AUTH_ACTIVE') === 'true';
    localStorage.removeItem('MOCK_AUTH_ACTIVE');
    const result = isLocalDb ? localDb.signOut(authInstance) : realSignOut(authInstance);
    if (wasMockActive) {
      window.location.reload();
    }
    return result;
  }
  return isLocalDb ? localDb.signOut(authInstance) : realSignOut(authInstance);
};

export const signInWithEmailAndPassword = (authInstance: any, email: string, pass: string) => {
  return isLocalDb ? localDb.signInWithEmailAndPassword(authInstance, email, pass) : realSignInWithEmailAndPassword(authInstance, email, pass);
};

export const signInWithCustomToken = (authInstance: any, token: string) => {
  return isLocalDb ? Promise.resolve({ user: { uid: 'local-admin', email: 'admin@local.com' } }) : realSignInWithCustomToken(authInstance, token);
};

export const createUserWithEmailAndPassword = (authInstance: any, email: string, pass: string) => {
  return isLocalDb ? localDb.createUserWithEmailAndPassword(authInstance, email, pass) : realCreateUserWithEmailAndPassword(authInstance, email, pass);
};

export const updateProfile = (userRef: any, data: any) => {
  return isLocalDb ? localDb.updateProfile(userRef, data) : realUpdateProfile(userRef, data);
};

export const updatePassword = (userRef: any, pass: string) => {
  return isLocalDb ? localDb.updatePassword(userRef, pass) : realUpdatePassword(userRef, pass);
};

export const sendPasswordResetEmail = (authInstance: any, email: string) => {
  return isLocalDb ? localDb.sendPasswordResetEmail(authInstance, email) : realSendPasswordResetEmail(authInstance, email);
};

export const getAuth = (appInstance?: any): any => {
  return isLocalDb ? localDb.getAuth(appInstance) : realGetAuth(appInstance || realApp);
};

export const initializeApp = (config?: any, name?: string) => {
  if (isLocalDb) return { name: name || '[LocalApp]' };
  return realInitializeApp(config || firebaseConfig, name);
};

export const deleteApp = (appInstance: any) => {
  if (isLocalDb) return Promise.resolve();
  return realDeleteApp(appInstance);
};

// Error utilities

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleCloudFirestoreFailure(err: any): void {
  const errMsg = String(err?.message || err?.code || err || "").toLowerCase();
  
  // Guard check: On Cloud / Web environment, we never dynamically override/switch to Local Database offline mode.
  if (typeof window !== 'undefined') {
    const isHostLocal = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname);
    if (!isHostLocal) {
      console.warn("[Firebase Resilient Handler] Firestore error occurred on cloud host, ignoring dynamic switch to local state:", err);
      return;
    }
  }

  if (
    errMsg.includes("permission-denied") || 
    errMsg.includes("permission_denied") ||
    errMsg.includes("cloud firestore api") || 
    errMsg.includes("firestore.googleapis.com") ||
    errMsg.includes("disabled") ||
    errMsg.includes("7 permission_denied")
  ) {
    if (localStorage.getItem('DB_MODE_OVERRIDE') !== 'local' || localStorage.getItem('FIRESTORE_DISABLED') !== 'true') {
      console.warn("[Firebase Resilient Handler] GCP Cloud Firestore is unconfigured or disabled for this project. Automatically switching to Local Database Mode to prevent crash.");
      localStorage.setItem('FIRESTORE_DISABLED', 'true');
      localStorage.setItem('DB_MODE_OVERRIDE', 'local');
      window.location.reload();
    }
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  handleCloudFirestoreFailure(error);
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('[Firestore Error Overlay]: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Basic Cloud Connectivity Check
async function testConnection() {
  if (isLocalDb || !realDb) return;
  try {
    await realGetDocFromServer(realDoc(realDb, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration to ensure cloud connectivity.");
    }
  }
}
testConnection();
