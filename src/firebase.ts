import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';                
import firebaseConfig from '../firebase-applet-config.json';

// Enable Firestore logging
setLogLevel('debug');

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
