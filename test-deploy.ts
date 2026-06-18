import config from './firebase-applet-config.json';
import { readFileSync } from 'fs';

async function deploy() {
  const sourceCode = readFileSync('firestore.rules', 'utf8');
  const token = process.env.GOOGLE_OAUTH_ACCESS_TOKEN || ''; // We don't have this.
  console.log("No token");
}
deploy();
