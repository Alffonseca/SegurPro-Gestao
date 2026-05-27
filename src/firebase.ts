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
  const override = localStorage.getItem('DB_MODE_OVERRIDE');
  if (override === 'local') return true;
  if (override === 'online') return false;
  return (import.meta as any).env.VITE_LOCAL_DB === 'true';
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
  return isLocalDb 
    ? localDb.onSnapshot(q, callback, errorCallback) 
    : realOnSnapshot(q, callback, errorCallback);
};

export const addDoc = (collectionRef: any, data: any) => {
  return isLocalDb ? localDb.addDoc(collectionRef, data) : realAddDoc(collectionRef, data);
};

export const updateDoc = (docRef: any, data: any) => {
  return isLocalDb ? localDb.updateDoc(docRef, data) : realUpdateDoc(docRef, data);
};

export const deleteDoc = (docRef: any) => {
  return isLocalDb ? localDb.deleteDoc(docRef) : realDeleteDoc(docRef);
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

export const getDocs = (q: any) => {
  return isLocalDb ? localDb.getDocs(q) : realGetDocs(q);
};

export const limit = (value: number) => {
  return isLocalDb ? localDb.limit(value) : realLimit(value);
};

// Satisfies TS both as a static values constructor AND type
export type Timestamp = RealTimestamp;
export const Timestamp = (isLocalDb ? localDb.Timestamp : RealTimestamp) as unknown as typeof RealTimestamp;

export const setDoc = (docRef: any, data: any, options?: any) => {
  return isLocalDb ? localDb.setDoc(docRef, data, options) : realSetDoc(docRef, data, options);
};

export const getDoc = (docRef: any) => {
  return isLocalDb ? localDb.getDoc(docRef) : realGetDoc(docRef);
};

export const getDocFromServer = (docRef: any) => {
  return isLocalDb ? localDb.getDocFromServer(docRef) : realGetDocFromServer(docRef);
};

export const serverTimestamp = () => {
  return isLocalDb ? localDb.serverTimestamp() : realServerTimestamp();
};

export const signInWithPopup = (authInstance: any, provider: any) => {
  return isLocalDb ? localDb.signInWithPopup(authInstance, provider) : realSignInWithPopup(authInstance, provider);
};

export const GoogleAuthProvider = (isLocalDb ? localDb.GoogleAuthProvider : realGoogleAuthProvider) as any;

export const onAuthStateChanged = (authInstance: any, callback: any) => {
  return isLocalDb ? localDb.onAuthStateChanged(authInstance, callback) : realOnAuthStateChanged(authInstance, callback);
};

export const signOut = (authInstance: any) => {
  return isLocalDb ? localDb.signOut(authInstance) : realSignOut(authInstance);
};

export const signInWithEmailAndPassword = (authInstance: any, email: string, pass: string) => {
  return isLocalDb ? localDb.signInWithEmailAndPassword(authInstance, email, pass) : realSignInWithEmailAndPassword(authInstance, email, pass);
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  if (isLocalDb) return;
  try {
    await realGetDocFromServer(realDoc(realDb, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration to ensure cloud connectivity.");
    }
  }
}
testConnection();
