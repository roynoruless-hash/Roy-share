import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';                
import firebaseConfig from './firebase-applet-config.json';
const app = initializeApp(firebaseConfig);
const dbId = firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId;
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, dbId);

async function run() {
  try {
     const snap = await getDoc(doc(db, 'settings', 'telegram_config'));
     console.log("Read success:", snap.data());
  } catch (e: any) {
     console.error("Firebase err:", e.message);
  }
}
run();
