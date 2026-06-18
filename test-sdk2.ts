import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';                

process.env.GCE_METADATA_HOST = '127.0.0.1:9999'; 
process.env.GOOGLE_APPLICATION_CREDENTIALS = ''; 

import firebaseConfig from './firebase-applet-config.json';
const app = initializeApp(firebaseConfig);
const dbId = firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId;
const db = getFirestore(app, dbId);

async function run() {
  try {
     const snap = await getDoc(doc(db, 'settings', 'telegram_config'));
     console.log("Read success:", snap.data());
  } catch (e: any) {
     console.error("Firebase err:", e.message);
  }
}
run();
