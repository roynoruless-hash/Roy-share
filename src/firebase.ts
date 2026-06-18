import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

// Enable Firestore logging
setLogLevel('debug');

// Allow environment variables to override the default config for production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId);

// Enable persistent storage
// import { enableIndexedDbPersistence, enableNetwork } from 'firebase/firestore';

// enableIndexedDbPersistence(db).catch((err) => {
//     if (err.code == 'failed-precondition') {
//         // Multiple tabs open, persistence can only be enabled in one tab at a time.
//         console.warn('Firestore persistence failed: Multiple tabs open');
//     } else if (err.code == 'unimplemented') {
//         // The current browser doesn't support all of the features required to enable persistence
//         console.warn('Firestore persistence failed: Not supported in this browser');
//     }
// });

// enableNetwork(db).catch((err) => {
//     console.warn('Firestore enableNetwork failed:', err);
// });


export { firebaseConfig };
export default app;
