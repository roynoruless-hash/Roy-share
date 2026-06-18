import { restQueryUserId } from './src/lib/firestore-rest';

async function run() {
    try {
        const docs = await restQueryUserId('files', 'someId'); // wait, restQueryUserId requires uploaderId
    } catch(e) {}
}
