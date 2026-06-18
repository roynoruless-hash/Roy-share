import 'dotenv/config';

async function run() {
  const token = "8960284435:AAED41SczzuXtqK3zm7JJKL0V7uopQUL-MI";
  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  console.log(await res.json());
}
run();
