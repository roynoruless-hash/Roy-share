const token = "8960284435:AAED41SczzuXtqK3zm7JJKL0V7uopQUL-MI";

async function run() {
  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json());
  console.log("getMe:", JSON.stringify(me, null, 2));

  const webhook = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then(r => r.json());
  console.log("getWebhookInfo:", JSON.stringify(webhook, null, 2));
}

run();
