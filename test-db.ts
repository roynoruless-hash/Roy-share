import { restGetDoc } from "./src/lib/firestore-rest.js";

async function run() {
  const d = await restGetDoc("settings", "telegram_config");
  console.log("Config is:", d);
}
run();
