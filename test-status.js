fetch('http://localhost:3000/api/admin/withdrawals/test/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'approved' })
}).then(r => r.json()).then(console.log).catch(console.error);
