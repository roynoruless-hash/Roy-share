import { restQueryAll } from './src/lib/firestore-rest.js';

async function test() {
  try {
    const res = await restQueryAll("withdraw_requests");
    console.log(res);
  } catch (err) {
    console.log(err.message);
  }
}

test();
