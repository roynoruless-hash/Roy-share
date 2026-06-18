import "dotenv/config";
import fs from "fs";

async function run() {
  const fbConfig = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
  const url = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/${fbConfig.firestoreDatabaseId || "(default)"}/documents/settings/telegram_config?key=${fbConfig.apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const token = data.fields?.botToken?.stringValue || process.env.TELEGRAM_BOT_TOKEN;
  
  console.log("Token length:", token.length);
}
run();
