// Client-Side Local Database Engine (SQLite / File-based REST proxy)
// Emulates Firebase Firestore and Auth SDKs locally on your PC.

import { toast } from 'sonner';

// Custom Timestamp implementation to replicate Firebase Timestamp behavior
export class Timestamp {
  seconds: number;
  nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now() {
    return new Timestamp(Math.floor(Date.now() / 1000), 0);
  }

  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }

  static fromMillis(milliseconds: number) {
    return new Timestamp(Math.floor(milliseconds / 1000), 0);
  }

  toDate() {
    return new Date(this.seconds * 1000);
  }

  toMillis() {
    return this.seconds * 1000;
  }
}

export function serverTimestamp() {
  return Timestamp.now();
}

// Serialization & Deserialization Helpers for Timestamp instances across the REST API
export function serialize(val: any): any {
  if (val === undefined) return null;
  if (val instanceof Timestamp) {
    return { seconds: val.seconds, nanoseconds: val.nanoseconds, __type: 'Timestamp' };
  }
  if (val instanceof Date) {
    return { seconds: Math.floor(val.getTime() / 1000), nanoseconds: 0, __type: 'Timestamp' };
  }
  if (Array.isArray(val)) {
    return val.map(serialize);
  }
  if (val !== null && typeof val === 'object') {
    const res: any = {};
    for (const key of Object.keys(val)) {
      res[key] = serialize(val[key]);
    }
    return res;
  }
  return val;
}

export function deserialize(val: any): any {
  if (val !== null && typeof val === 'object') {
    if (val.__type === 'Timestamp' || (typeof val.seconds === 'number' && typeof val.nanoseconds === 'number')) {
      return new Timestamp(val.seconds, val.nanoseconds);
    }
    if (Array.isArray(val)) {
      return val.map(deserialize);
    }
    const res: any = {};
    for (const key of Object.keys(val)) {
      res[key] = deserialize(val[key]);
    }
    return res;
  }
  return val;
}

// Client-side Database Reference
export const localDb = {
  type: 'localdb'
};

export interface CollectionRef {
  path: string;
}

export interface DocRef {
  path: string;
  id: string;
}

export interface Constraint {
  type: 'where' | 'orderBy' | 'limit';
  field?: string;
  op?: string;
  value?: any;
  direction?: 'asc' | 'desc';
}

export interface Query {
  path: string;
  constraints: Constraint[];
}

// Support multiple parameters (just like Firestore)
export function collection(db: any, path: string, ...pathSegments: string[]): CollectionRef {
  const fullPath = [path, ...pathSegments].filter(Boolean).join('/');
  return { path: fullPath };
}

export function doc(dbOrCol: any, pathOrId?: string, ...pathSegments: string[]): DocRef {
  if (typeof dbOrCol === 'string') {
    return { path: dbOrCol, id: pathOrId || '' };
  }
  
  let baseColPath = '';
  if (dbOrCol && (dbOrCol as CollectionRef).path) {
    baseColPath = (dbOrCol as CollectionRef).path;
  }

  let fullPath = pathOrId || '';
  if (pathSegments.length > 0) {
    fullPath += '/' + pathSegments.join('/');
  }

  if (baseColPath) {
    return { path: baseColPath, id: fullPath };
  }
  
  const lastSlashIndex = fullPath.lastIndexOf('/');
  if (lastSlashIndex >= 0) {
    return {
      path: fullPath.substring(0, lastSlashIndex),
      id: fullPath.substring(lastSlashIndex + 1)
    };
  }
  return { path: '', id: fullPath };
}

export function query(colRef: CollectionRef, ...constraints: Constraint[]): Query {
  return {
    path: colRef.path,
    constraints
  };
}

export function where(field: string, op: string, value: any): Constraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Constraint {
  return { type: 'orderBy', field, direction };
}

export function limit(value: number): Constraint {
  return { type: 'limit', value };
}

export class DocumentSnapshot {
  id: string;
  _data: any;

  constructor(id: string, data: any) {
    this.id = id;
    this._data = data;
  }

  // Changed from getter property to method to align perfectly with Firebase's exists() signature!
  exists(): boolean {
    return this._data !== undefined && this._data !== null;
  }

  data() {
    return this._data;
  }
}

export class QuerySnapshot {
  docs: DocumentSnapshot[];

  constructor(docs: DocumentSnapshot[]) {
    this.docs = docs;
  }

  get empty() {
    return this.docs.length === 0;
  }

  get size() {
    return this.docs.length;
  }

  forEach(callback: (doc: DocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// Local Database Cache Manager with aggressive optimistic updates
class LocalDatabaseCache {
  private cache: { [collection: string]: any[] } = {};
  private listeners: { [collection: string]: (() => void)[] } = {};
  private activeFetches: { [collection: string]: Promise<any[]> | null } = {};

  async getCollection(collectionName: string): Promise<any[]> {
    if (this.cache[collectionName]) {
      return this.cache[collectionName];
    }
    return this.fetchCollection(collectionName);
  }

  async fetchCollection(collectionName: string): Promise<any[]> {
    if (this.activeFetches[collectionName]) {
      return this.activeFetches[collectionName]!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/localdb/${encodeURIComponent(collectionName)}`);
        if (res.ok) {
          const data = await res.json();
          const deserializedData = deserialize(data);
          
          // Deep compare to avoid unnecessary re-triggers
          const cachedStr = JSON.stringify(this.cache[collectionName]);
          const newStr = JSON.stringify(deserializedData);
          if (cachedStr !== newStr) {
            this.cache[collectionName] = deserializedData;
            this.triggerListeners(collectionName);
          }
          return deserializedData;
        }
      } catch (err) {
        console.error(`LocalDB fetch error ${collectionName}:`, err);
      } finally {
        this.activeFetches[collectionName] = null;
      }
      return this.cache[collectionName] || [];
    })();

    this.activeFetches[collectionName] = fetchPromise;
    return fetchPromise;
  }

  subscribe(collectionName: string, callback: () => void): () => void {
    if (!this.listeners[collectionName]) {
      this.listeners[collectionName] = [];
    }
    this.listeners[collectionName].push(callback);
    
    // Fetch initially
    this.fetchCollection(collectionName);

    return () => {
      this.listeners[collectionName] = this.listeners[collectionName].filter(cb => cb !== callback);
    };
  }

  triggerListeners(collectionName: string) {
    if (this.listeners[collectionName]) {
      this.listeners[collectionName].forEach(cb => cb());
    }
  }

  updateLocalCache(collectionName: string, items: any[]) {
    this.cache[collectionName] = items;
    this.triggerListeners(collectionName);
  }

  startPolling() {
    setInterval(() => {
      const activeCollections = Object.keys(this.listeners).filter(col => this.listeners[col].length > 0);
      for (const col of activeCollections) {
        this.fetchCollection(col);
      }
    }, 4000);
  }
}

export const localDbCache = new LocalDatabaseCache();
localDbCache.startPolling();

// Evaluates standard Firestore-like query filters on the local in-memory dataset
export function evaluateQuery(docs: any[], constraints: Constraint[]): any[] {
  let result = [...docs];
  
  for (const c of constraints) {
    if (c.type === 'where' && c.field && c.op) {
      const field = c.field;
      const op = c.op;
      const val = c.value;
      
      result = result.filter(doc => {
        const itemVal = doc[field];
        if (op === '==') return itemVal === val;
        if (op === '!=') return itemVal !== val;
        if (op === '>') return itemVal > val;
        if (op === '>=') return itemVal >= val;
        if (op === '<') return itemVal < val;
        if (op === '<=') return itemVal <= val;
        if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(val);
        if (op === 'in') return Array.isArray(val) && val.includes(itemVal);
        return true;
      });
    }
  }

  // Handle Ordering
  const orderByConstraint = constraints.find(c => c.type === 'orderBy');
  if (orderByConstraint && orderByConstraint.field) {
    const field = orderByConstraint.field;
    const direction = orderByConstraint.direction || 'asc';
    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];
      if (valA && typeof valA === 'object' && valA.seconds) valA = valA.seconds;
      if (valB && typeof valB === 'object' && valB.seconds) valB = valB.seconds;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Handle Limit
  const limitConstraint = constraints.find(c => c.type === 'limit');
  if (limitConstraint && limitConstraint.value !== undefined) {
    result = result.slice(0, limitConstraint.value);
  }

  return result;
}

// Firestore operations mapping to REST endpoints
export function onSnapshot(q: any, callback: any, errorCallback?: (error: any) => void) {
  const path = q.path;

  if (q.id) {
    // Single document snapshot
    const updateSnapshot = async () => {
      try {
        const items = await localDbCache.getCollection(path);
        const found = items.find(item => item.id === q.id);
        callback(new DocumentSnapshot(q.id, found));
      } catch (err) {
        if (errorCallback) errorCallback(err);
      }
    };

    const unsubscribe = localDbCache.subscribe(path, updateSnapshot);
    updateSnapshot();

    return unsubscribe;
  } else {
    // Collection or Query snapshot
    const constraints = q.constraints || [];
    const updateSnapshot = async () => {
      try {
        const items = await localDbCache.getCollection(path);
        const filtered = evaluateQuery(items, constraints);
        const docs = filtered.map(item => new DocumentSnapshot(item.id, item));
        callback(new QuerySnapshot(docs));
      } catch (err) {
        if (errorCallback) errorCallback(err);
      }
    };

    const unsubscribe = localDbCache.subscribe(path, updateSnapshot);
    updateSnapshot();

    return unsubscribe;
  }
}

export async function getDocs(q: any): Promise<QuerySnapshot> {
  const path = q.path;
  const constraints = q.constraints || [];
  const items = await localDbCache.getCollection(path);
  const filtered = evaluateQuery(items, constraints);
  const docs = filtered.map(item => new DocumentSnapshot(item.id, item));
  return new QuerySnapshot(docs);
}

export async function getDoc(docRef: any): Promise<DocumentSnapshot> {
  const { path, id } = docRef;
  const items = await localDbCache.getCollection(path);
  const found = items.find(item => item.id === id);
  return new DocumentSnapshot(id, found);
}

export async function getDocFromServer(docRef: any): Promise<DocumentSnapshot> {
  return getDoc(docRef);
}

export async function addDoc(collectionRef: any, data: any): Promise<any> {
  const path = collectionRef.path;
  const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const docData = { ...data, id };

  const response = await fetch(`/api/localdb/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serialize(docData))
  });

  if (!response.ok) {
    throw new Error(`Failed to add doc to collection ${path}`);
  }

  const saved = deserialize(await response.json());
  const cachedItems = await localDbCache.getCollection(path);
  localDbCache.updateLocalCache(path, [...cachedItems, saved]);

  return { id, path };
}

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  const { path, id } = docRef;
  const docData = { ...data, id };

  const response = await fetch(`/api/localdb/${encodeURIComponent(path)}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serialize(docData))
  });

  if (!response.ok) {
    throw new Error(`Failed to set doc ${id} in ${path}`);
  }

  const saved = deserialize(await response.json());
  const cachedItems = await localDbCache.getCollection(path);
  const itemIndex = cachedItems.findIndex(item => item.id === id);
  let newItems = [...cachedItems];
  if (itemIndex >= 0) {
    newItems[itemIndex] = saved;
  } else {
    newItems.push(saved);
  }
  localDbCache.updateLocalCache(path, newItems);
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  const { path, id } = docRef;

  const response = await fetch(`/api/localdb/${encodeURIComponent(path)}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serialize(data))
  });

  if (!response.ok) {
    throw new Error(`Failed to update doc ${id} in ${path}`);
  }

  const saved = deserialize(await response.json());
  const cachedItems = await localDbCache.getCollection(path);
  const newItems = cachedItems.map(item => item.id === id ? saved : item);
  localDbCache.updateLocalCache(path, newItems);
}

export async function deleteDoc(docRef: any): Promise<void> {
  const { path, id } = docRef;

  const response = await fetch(`/api/localdb/${encodeURIComponent(path)}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`Failed to delete doc ${id} in ${path}`);
  }

  const cachedItems = await localDbCache.getCollection(path);
  const newItems = cachedItems.filter(item => item.id !== id);
  localDbCache.updateLocalCache(path, newItems);
}

// Authentication Implementation for Local Database Engine
export class LocalAuth {
  private listeners: ((user: any) => void)[] = [];
  public currentUser: any = null;

  constructor() {
    try {
      const stored = localStorage.getItem('local_db_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    } catch (e) {
      console.error("LocalAuth init error:", e);
    }
  }

  subscribe(callback: (user: any) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  setCurrentUser(user: any) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('local_db_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('local_db_user');
    }
    this.notify();
  }

  // Implementation of direct signOut method on the Auth instance to satisfy secondaryAuth.signOut()!
  async signOut() {
    this.setCurrentUser(null);
  }
}

export const localAuth = new LocalAuth();

export function getAuth(app?: any) {
  return localAuth;
}

export function onAuthStateChanged(authInst: any, callback: (user: any) => void) {
  return localAuth.subscribe(callback);
}

export async function signInWithEmailAndPassword(authInst: any, emailInput: string, passwordInput: string): Promise<any> {
  const email = emailInput.trim().toLowerCase();
  
  const response = await fetch('/api/localdb/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: passwordInput })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Erro ao efetuar login local.');
  }

  const user = await response.json();
  localAuth.setCurrentUser(user);
  return { user };
}

export async function createUserWithEmailAndPassword(authInst: any, emailInput: string, passwordInput: string): Promise<any> {
  const email = emailInput.trim().toLowerCase();

  const response = await fetch('/api/localdb/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: passwordInput, displayName: email.split('@')[0] })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Erro ao cadastrar funcionário local.');
  }

  const user = await response.json();
  localAuth.setCurrentUser(user);
  return { user };
}

export async function signOut(authInst: any): Promise<void> {
  localAuth.setCurrentUser(null);
}

export async function updateProfile(userRef: any, updateData: { displayName?: string, photoURL?: string }): Promise<void> {
  if (localAuth.currentUser) {
    const updatedUser = { ...localAuth.currentUser, ...updateData };
    localAuth.setCurrentUser(updatedUser);

    await fetch(`/api/localdb/users/${encodeURIComponent(localAuth.currentUser.uid)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: updateData.displayName })
    });
  }
}

export async function updatePassword(userRef: any, newPasswordStr: string): Promise<void> {
  if (localAuth.currentUser) {
    const response = await fetch('/api/admin/update-user-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: localAuth.currentUser.uid, newPassword: newPasswordStr })
    });
    if (!response.ok) {
      throw new Error('Falha ao atualizar senha no servidor local.');
    }
  }
}

export async function sendPasswordResetEmail(authInst: any, email: string): Promise<void> {
  toast.info(`E-mail de recuperação simulado para: ${email}`);
}

export async function signInWithPopup(authInst: any, provider: any): Promise<any> {
  toast.success("Login com conta administradora master simulado.");
  const adminUser = {
    uid: 'emailparasiteslixo-id',
    email: 'emailparasiteslixo@gmail.com',
    displayName: 'Andre Fonseca',
    photoURL: null,
    emailVerified: true
  };
  localAuth.setCurrentUser(adminUser);
  return { user: adminUser };
}

export class GoogleAuthProvider {}

export function initializeApp() {
  return {};
}

export function deleteApp() {
  return Promise.resolve();
}
