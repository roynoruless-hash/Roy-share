import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const app = initializeApp({ projectId: "ai-studio-e3d1e932-af10-4028-bf8d-450c6872bc12" });
const db = getFirestore(app);

async function run() {
  const d = await getDoc(doc(db, "settings", "telegram_config"));
  console.log(d.data());
}

run();
