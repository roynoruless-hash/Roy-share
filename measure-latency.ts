import "dotenv/config";
import fs from "fs";

async function run() {
  const t0 = Date.now();
  
  const rawData = fs.readFileSync("firebase-applet-config.json", "utf8");
  const fbConfig = JSON.parse(rawData);
  const apiKey = fbConfig.apiKey;
  const projectId = fbConfig.projectId;
  const dbId = fbConfig.firestoreDatabaseId || "(default)";

  // 1. Measure Firestore Read Latency
  const tFsStart = Date.now();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/settings/telegram_config?key=${apiKey}`;
  const fetchRes = await fetch(url);
  const data = await fetchRes.json();
  const tFsEnd = Date.now();
  console.log(`[TimeStamp: ${new Date().toISOString()}] Firestore Read Latency: ${tFsEnd - tFsStart} ms`);

  // Extract Token
  const token = data.fields?.botToken?.stringValue || process.env.TELEGRAM_BOT_TOKEN;

  // 2. Measure Telegram API Response Latency (getMe)
  const tApiStart = Date.now();
  const tgUrl = `https://api.telegram.org/bot${token}/getMe`;
  const tgRes = await fetch(tgUrl);
  const tgData = await tgRes.json();
  const tApiEnd = Date.now();
  console.log(`[TimeStamp: ${new Date().toISOString()}] Telegram API Response Latency: ${tApiEnd - tApiStart} ms`);

  // 3. See if long polling is actively blocked/running on telegram side by checking getWebhookInfo
  const tWhStart = Date.now();
  const whRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const whData = await whRes.json();
  const tWhEnd = Date.now();
  console.log(`[TimeStamp: ${new Date().toISOString()}] Telegram Webhook Info Latency: ${tWhEnd - tWhStart} ms`);
  console.log("Webhook Info:", whData);

}

run().catch(console.error);
