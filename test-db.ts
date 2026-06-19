import { restSetDoc } from "./src/lib/firestore-rest.js";

async function run() {
  await restSetDoc("files", "test1234", {
    fileName: 'TestFileAdCheck.txt',
    mimeType: 'text/plain',
    fileSize: 1024,
    downloads: 0,
    telegramFileId: 'fakeid'
  });
  console.log("File created!");
  process.exit(0);
}
run();




