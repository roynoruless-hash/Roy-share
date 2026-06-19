fetch("https://ais-pre-atahj527b5qohuebbpbkkt-963220536272.asia-southeast1.run.app/api/admin/audit").then(r => {
  console.log(r.status);
  console.log(r.headers.get("content-type"));
  return r.text();
}).then(console.log);
