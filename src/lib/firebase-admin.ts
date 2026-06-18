import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp({
  projectId: firebaseConfig.projectId,
});

export const auth = getAuth(app);

