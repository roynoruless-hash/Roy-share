const fs = require("fs");

let content = fs.readFileSync("server.ts", "utf8");

// 1. Hook background processing in download route
const downloadPatchBefore = `    if (uploaderId && verified && token) {
      setTimeout(async () => {
         try {
            const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "unknown";`;

const downloadPatchAfter = `    if (uploaderId && verified && token) {
      setTimeout(async () => {
         try {
            const clientIpRaw = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "unknown";
            const userAgentRaw = req.headers["user-agent"] || "";
            const crypto = require("crypto");
            const ipHash = crypto.createHash("sha256").update(clientIpRaw).digest("hex");
            const fpHash = crypto.createHash("sha256").update(clientIpRaw + userAgentRaw).digest("hex");
            
            let isFraud = false;
            let fraudReason = "";
            const userAgentLower = userAgentRaw.toLowerCase();
            if (userAgentLower.includes("bot") || userAgentLower.includes("spider") || userAgentLower.includes("headless") || userAgentLower.includes("http")) {
                isFraud = true;
                fraudReason = "Known bot traffic";
            }
            
            const dsRef = \`dl_\${Date.now()}_\${Math.random().toString(36).substring(2)}\`;
            const dlLog = {
                id: dsRef, fileId, uploaderId, ipHash, fpHash, timestamp: Date.now(),
                status: isFraud ? "rejected" : "pending", reason: fraudReason, amount: 0.05
            };
            
            if (!isFraud) {
                const pastLogs = await restQueryUserId("download_logs", uploaderId, "uploaderId");
                const recentSameFP = pastLogs.filter((d) => d.fpHash === fpHash || d.ipHash === ipHash).sort((a, b) => b.timestamp - a.timestamp);
                
                if (recentSameFP.length > 0) {
                    const lastDl = recentSameFP[0];
                    if (Date.now() - lastDl.timestamp < 1000 * 60 * 60) {
                        dlLog.status = "rejected"; dlLog.reason = "Cooldown violation (Under 1 hour)";
                    }
                    if (recentSameFP.filter((d) => d.fileId === fileId).length >= 1) {
                        dlLog.status = "rejected"; dlLog.reason = "Same user repeatedly downloading";
                    }
                    if (dlLog.status === "rejected") { isFraud = true; }
                }
            }
            await restSetDoc("download_logs", dsRef, dlLog);

            if (dlLog.status === "pending") {
                const userMeta = await restGetDoc("users_meta", uploaderId) || {};
                userMeta.pendingBalance = (userMeta.pendingBalance || 0) + 0.05;
                await restSetDoc("users_meta", uploaderId, userMeta);
            }

            const clientIp = clientIpRaw;`;

content = content.replace(downloadPatchBefore, downloadPatchAfter);

// 2. Override earningsAmt behavior in the second try/catch of setTimeout
const fileEarningsBefore = `         try {
             const downloadsCount = (data.downloads !== undefined ? data.downloads : data.downloadCount || 0) + 1;
             const earningsAmt = (data.earnings || 0) + 0.05;
             await restSetDoc("files", fileId, { ...data, downloads: downloadsCount, earnings: earningsAmt });`;

const fileEarningsAfter = `         try {
             const downloadsCount = (data.downloads !== undefined ? data.downloads : data.downloadCount || 0) + 1;
             await restSetDoc("files", fileId, { ...data, downloads: downloadsCount });`;

content = content.replace(fileEarningsBefore, fileEarningsAfter);

// 3. Inject Verification Processor right above getUserFinancials
const getUserFinBefore = `    async function getUserFinancials(userIdStr: string) {`;
const getUserFinAfter = `    async function processHoldEarnings(userId: string) {
       try {
           const logs = await restQueryUserId("download_logs", userId, "uploaderId");
           let newlyVerifiedAmount = 0;
           let pendingReduced = 0;
           const now = Date.now();
           const twentyFourHrs = 24 * 60 * 60 * 1000;
           
           let changedLogs = [];
           let filesMap = new Map();
           
           for (const log of logs) {
               if (log.status === "pending" && (now - log.timestamp) >= twentyFourHrs) {
                   log.status = "verified";
                   changedLogs.push(log);
                   newlyVerifiedAmount += log.amount;
                   pendingReduced += log.amount;
                   filesMap.set(log.fileId, (filesMap.get(log.fileId) || 0) + log.amount);
               }
           }
           
           if (changedLogs.length > 0) {
               for (const log of changedLogs) { await restSetDoc("download_logs", log.id, log); }
               for (const [fId, amt] of Array.from(filesMap.entries())) {
                   const fData = await restGetDoc("files", fId);
                   if (fData) {
                       fData.earnings = (fData.earnings || 0) + amt;
                       await restSetDoc("files", fId, fData);
                   }
               }
               const uMeta = await restGetDoc("users_meta", userId) || {};
               uMeta.pendingBalance = Math.max(0, (uMeta.pendingBalance || 0) - pendingReduced);
               await restSetDoc("users_meta", userId, uMeta);
               finCache.delete(userId);
           }
       } catch(e) {}
    }

    async function getUserFinancials(userIdStr: string) {
      await processHoldEarnings(userIdStr);`;

content = content.replace(getUserFinBefore, getUserFinAfter);

// 4. Update getUserFinancials return with pendingBalance
const finResultBefore = `      const balance = totalEarnings - withdrawn - pendingWithdraw;
      const result = {
        fileEarnings,
        referralEarnings,
        manualAdjustments,
        totalEarnings,
        withdrawn,
        pendingWithdraw,
        balance,
        withdrawals,
        files,
        userDoc
      };`;

// Also count downloads
const finResultAfter = `      const balance = totalEarnings - withdrawn - pendingWithdraw;
      let pendingBalance = 0;
      if (userDoc && userDoc.pendingBalance) pendingBalance = userDoc.pendingBalance;
      const result = {
        fileEarnings,
        referralEarnings,
        manualAdjustments,
        totalEarnings,
        withdrawn,
        pendingWithdraw,
        balance,
        pendingBalance,
        withdrawals,
        files,
        userDoc
      };`;

content = content.replace(finResultBefore, finResultAfter);

// 5. Add to Admin dashboard endpoint
const userListBefore = `    const usersList = Array.from(usersMap.values()).map(u => {
      u.totalEarnings = u.fileEarnings + u.referralEarnings + u.balanceAdjustment;
      u.currentBalance = u.totalEarnings - u.withdrawn - u.pendingWithdraw;
      return u;
    });`;

const userListAfter = `    const usersList = Array.from(usersMap.values()).map(u => {
      u.totalEarnings = u.fileEarnings + u.referralEarnings + u.balanceAdjustment;
      u.currentBalance = u.totalEarnings - u.withdrawn - u.pendingWithdraw;
      u.pendingBalance = u.pendingBalance || 0;
      return u;
    });`;
content = content.replace(userListBefore, userListAfter);

// users map override mapping 
const overrideBefore = `      u.balanceAdjustment = m.balanceAdjustment || 0;
      if (m.username) u.username = m.username;`;
const overrideAfter = `      u.balanceAdjustment = m.balanceAdjustment || 0;
      u.pendingBalance = m.pendingBalance || 0;
      if (m.username) u.username = m.username;`;
content = content.replace(overrideBefore, overrideAfter);

// Add to Admin status fetch
const adminStatusBefore = `    res.json({
      activeWebhookUrl,
      webhookHitCount,
      usersCount,
      filesCount,
      totalDownloads,
      latestErrors,
      latestWebhookRequests
    });`;

const adminStatusAfter = `    const allLogs = await restQuery("download_logs") || [];
    let fraudAttempts = 0;
    let totalVerifiedDls = 0;
    let totalRejectedDls = 0;
    let pendingEarningsTotal = 0;
    allLogs.forEach((l) => {
        if (l.status === 'rejected') { totalRejectedDls++; fraudAttempts++; }
        if (l.status === 'verified') totalVerifiedDls++;
        if (l.status === 'pending') pendingEarningsTotal += l.amount;
    });

    res.json({
      activeWebhookUrl,
      webhookHitCount,
      usersCount,
      filesCount,
      totalDownloads,
      latestErrors,
      latestWebhookRequests,
      fraudAttempts,
      totalVerifiedDls,
      totalRejectedDls,
      pendingEarningsTotal
    });`;
content = content.replace(adminStatusBefore, adminStatusAfter);

fs.writeFileSync("server.ts", content);
console.log("server.ts patched");
