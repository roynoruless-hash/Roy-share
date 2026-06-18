import 'dotenv/config';

async function run() {
  const update = {
    update_id: 12345,
    message: {
      message_id: 1,
      from: { id: 11111, is_bot: false, first_name: "Test" },
      chat: { id: 11111, type: "private" },
      text: "/start",
      date: Math.floor(Date.now() / 1000)
    }
  };

  const res = await fetch("http://localhost:3000/api/telegram-webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update)
  });
  console.log("Local HTTP status:", res.status);
}
run();
