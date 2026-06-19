const fs = require("fs");

let content = fs.readFileSync("server.ts", "utf8");

const accBefore = `        const accountMsg = \`👤 *Account Page*\\n\\n*Telegram ID:* \\\`\${ctx.from.id}\\\`\\n*Username:* \${safeUsername}\\n*Join Date:* \${joinDateStr}\\n\\n*Total Uploads:* \${totalUploads}\\n*Total Downloads:* \${totalDownloads}\\n*Total Earnings:* ₹\${fin.totalEarnings.toFixed(2)}\`;`;

const accAfter = `        const logs = await restQueryUserId("download_logs", userId, "uploaderId");
        let validDls = 0;
        let rejectedDls = 0;
        logs.forEach(l => {
           if(l.status === 'verified') validDls++;
           if(l.status === 'rejected') rejectedDls++;
        });
        const accountMsg = \`👤 *Account Page*\\n\\n*Telegram ID:* \\\`\${ctx.from.id}\\\`\\n*Username:* \${safeUsername}\\n*Join Date:* \${joinDateStr}\\n\\n*Total Uploads:* \${totalUploads}\\n*Total Downloads:* \${totalDownloads}\\n*Valid Downloads:* \${validDls}\\n*Rejected Downloads:* \${rejectedDls}\\n\\n*Pending Earnings:* ₹\${(fin.pendingBalance || 0).toFixed(2)}\\n*Withdrawable Earnings:* ₹\${fin.balance.toFixed(2)}\\n*Total Lifetime Earnings:* ₹\${fin.totalEarnings.toFixed(2)}\`;`;

content = content.replace(accBefore, accAfter);

fs.writeFileSync("server.ts", content);
console.log("tg patched");
