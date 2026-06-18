import fs from 'fs';

const fbConfigPath = 'firebase-applet-config.json';
if (fs.existsSync(fbConfigPath)) {
  const config = JSON.parse(fs.readFileSync(fbConfigPath, 'utf8'));
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/settings/telegram_config?key=${config.apiKey}`;
  
  fetch(url, { headers: { 'Origin': `https://${config.projectId}.web.app` } })
    .then(r => r.json())
    .then(data => {
       console.log(JSON.stringify(data.fields, null, 2));
    })
    .catch(console.error);
}
