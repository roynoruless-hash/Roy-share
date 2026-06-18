import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Telegraf, Markup } from "telegraf";
import { auth } from "./src/lib/firebase-admin";
import firebaseConfig from "./firebase-applet-config.json";
import { AsyncLocalStorage } from "async_hooks";
import {
  restGetDoc,
  restSetDoc,
  restDeleteDoc,
  restQueryUserId,
  restQueryAll,
} from "./src/lib/firestore-rest";
import { Readable } from "stream";

export const perfStorage = new AsyncLocalStorage<any>();

const pendingUploads = new Map<
  number,
  {
    fileId: string;
    fileName: string;
    fileSize: number;
    messageId?: number;
    fileType?: string;
    step?: string;
  }
>();
const withdrawStates = new Map<string, any>();
const humanVerifyTokens = new Map<string, any>();

console.log("SERVER BOOT: Initializing App...");
console.log("SERVER BOOT: Firestore initialized successfully.");

// Anti-crash protection
process.on("uncaughtException", (err) => {
  console.error("CRITICAL: unhandled exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("CRITICAL: unhandled rejection:", reason);
});

process.once("SIGINT", () => {
  if (bot) bot.stop("SIGINT");
  process.exit(0);
});
process.once("SIGTERM", () => {
  if (bot) bot.stop("SIGTERM");
  process.exit(0);
});

const PORT = 3000;
const APP_URL_RAW =
  process.env.VITE_APP_URL ||
  process.env.APP_URL ||
  "https://ais-pre-atahj527b5qohuebbpbkkt-963220536272.asia-southeast1.run.app";

const APP_URL = APP_URL_RAW.replace(/\/+$/, "").replace(/^http:\/\//i, "https://");
const isDevSpace = APP_URL.includes("ais-dev-");

console.log(
  "SERVER BOOT: TELEGRAM_BOT_TOKEN defined:",
  !!process.env.TELEGRAM_BOT_TOKEN,
);
if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log(
    "SERVER BOOT: TELEGRAM_BOT_TOKEN length:",
    process.env.TELEGRAM_BOT_TOKEN.length,
  );
}

let bot: Telegraf | null = null;
let currentBotToken = "";
let ownerChatId = "";
let requiredChannel = "";
let requiredGroup = "";
let storageChannel = "";

// Live tracking data
let lastTelegramUpdate: string | null = null;
let lastTelegramError: string | null = null;
let lastBotResponse: string | null = null;
let telegramApiStatus = "unknown";
let botUsername: string | null = null;
let botId: number | null = null;
let referralCommissionRate = 10;
let adsEnabled = false;
let adsScript = "";
let adsPosition = "middle";
let adsList: any[] = [];
let popunderConfig = {
  enabled: false,
  delay: 3,
  oncePerSession: false,
  oncePer24Hours: false,
  device: "all",
};
let directLinkConfig = {
  url: "",
  trigger: "download_click",
};
let socialBarConfig = {
  enabled: false,
  script: "",
};

const activeWebhookUrl = "";
let webhookHitCount = 0;
const latestWebhookRequests: any[] = [];
const latestErrors: any[] = [];

function logError(err: Error | string) {
  const errMsg = err instanceof Error ? err.stack || err.message : String(err);
  console.error(errMsg);
  latestErrors.unshift({ time: new Date().toISOString(), error: errMsg });
  if (latestErrors.length > 20) latestErrors.pop();
}

function logWebhookRequest(req: any) {
  latestWebhookRequests.unshift({ time: new Date().toISOString(), body: req });
  if (latestWebhookRequests.length > 20) latestWebhookRequests.pop();
}

let lastCommandReceived: string | null = null;
let lastUserId: string | null = null;
let lastChatId: string | null = null;
let lastHandlerExecuted: string | null = null;
let lastReceivedUpdate: any = null;
let lastHandlerError: string | null = null;

// Robust Network Retry Fetch
async function fetchWithRetry(url: string, options: any = {}, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10s timeout
      
      const fetchOpts = { ...options, signal: abortController.signal };
      const res = await fetch(url, fetchOpts);
      clearTimeout(timeoutId);
      
      return res;
    } catch (err: any) {
      attempt++;
      console.error(`[Network] Fetch failed for ${url.substring(0, 50)}...`);
      console.error(`[Network] Error: ${err.message}. Attempt ${attempt}/${maxRetries}`);
      if (attempt >= maxRetries) throw err;
      
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error("Max retries exceeded");
}

let lastNetworkError = "None";
let lastTelegramPing = "None";
let lastTelegramResponse: any = null;

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    botLoaded: !!bot,
    webhookActive: telegramApiStatus === "online",
    firestoreConnected: true
  });
});

async function saveAdsConfigInternal() {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId === "(default)" ? "(default)" : (firebaseConfig.firestoreDatabaseId || "(default)");
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config?key=${firebaseConfig.apiKey}`;
    
    // Fetch current document first to keep existing fields safe
    let currentFields: any = {};
    try {
      const fetchRes = await fetch(url);
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        currentFields = data.fields || {};
      }
    } catch (err) {
      console.error("Error reading pre-save config:", err);
    }

    const fields = {
      ...currentFields,
      adsEnabled: { booleanValue: adsEnabled },
      adsScript: { stringValue: adsScript },
      adsPosition: { stringValue: adsPosition },
      adsListJson: { stringValue: JSON.stringify(adsList) },
      popunderConfigJson: { stringValue: JSON.stringify(popunderConfig) },
      directLinkConfigJson: { stringValue: JSON.stringify(directLinkConfig) },
      socialBarConfigJson: { stringValue: JSON.stringify(socialBarConfig) },
    };

    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config`,
        fields,
      }),
    });
  } catch (e) {
    console.error("Failed to automatically save background ads config:", e);
  }
}

app.get("/api/public-ads-config", (req, res) => {
  res.json({
    adsEnabled,
    adsScript,
    adsPosition,
    adsList,
    popunderConfig,
    directLinkConfig,
    socialBarConfig,
  });
});

app.post("/api/ads/track", async (req, res) => {
  try {
    const { adId, eventType } = req.body;
    if (!adId || !eventType) {
      return res.status(400).json({ success: false, error: "Missing adId or eventType" });
    }

    const ad = adsList.find((a: any) => a.id === adId);
    if (ad) {
      if (eventType === "impression") {
        ad.impressions = (ad.impressions || 0) + 1;
      } else if (eventType === "click") {
        ad.clicks = (ad.clicks || 0) + 1;
      }
      ad.ctr = ad.impressions > 0 ? parseFloat(((ad.clicks / ad.impressions) * 100).toFixed(2)) : 0;
      ad.lastUpdated = new Date().toISOString();
      await saveAdsConfigInternal();
      return res.json({ success: true, ad });
    }
    return res.status(404).json({ success: false, error: "Ad not found" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/debug/logs", (req, res) => {
  res.json({
    latestWebhookRequests,
    latestErrors
  });
});

// Main webhook endpoint
app.post("/api/telegram-webhook", async (req, res) => {
  console.log("WEBHOOK_RECEIVED");
  logWebhookRequest(req.body);
  try {
    webhookHitCount++;
    lastTelegramUpdate = new Date().toISOString();
    lastReceivedUpdate = req.body;

    // IMMEDIATELY return 200 OK to Telegram
    if (!res.headersSent) {
      console.log("RETURNING_200");
      res.status(200).json({ ok: true });
    }

    if (req.body?.message) {
      lastCommandReceived = req.body.message.text || "No text";
      lastUserId = req.body.message.from?.id ? String(req.body.message.from.id) : null;
      lastChatId = req.body.message.chat?.id ? String(req.body.message.chat.id) : null;
    }

    if (bot) {
      try {
        await bot.handleUpdate(req.body);
        console.log("WEBHOOK_PROCESSED");
        lastBotResponse = new Date().toISOString();
        telegramApiStatus = "online";
      } catch (err: any) {
        lastHandlerError = err.message || "Unknown error handling update";
        lastTelegramError = lastHandlerError;
        console.error("WEBHOOK_ERROR:", err);
      }
    }
  } catch (err: any) {
    console.error("WEBHOOK_ERROR:", err.message);
    if (!res.headersSent) {
      res.status(200).json({ ok: true, error: err.message });
    }
  }
});

const requireAdmin = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email;

    const adminEmails = (
      process.env.VITE_ADMIN_EMAILS || "roynoruless@gmail.com"
    )
      .split(",")
      .map((e) => e.trim().toLowerCase());
    if (!email || !adminEmails.includes(email.toLowerCase())) {
      return res.status(403).json({ error: "Forbidden" });
    }
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.get("/api/debug-status", async (req, res) => {
  try {
    let whConfig: any = "No Bot";
    if (bot) {
      whConfig = await bot.telegram.getWebhookInfo();
    }
    res.json({
      status: "ok",
      telegramApiStatus,
      webhookHitCount,
      lastTelegramError,
      whConfig
    });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

app.get("/api/debug-last-update", (req, res) => {
  res.json({
    lastReceivedUpdate,
    lastCommandReceived,
    lastHandlerError,
  });
});

app.get("/api/debug/network", requireAdmin, async (req, res) => {
  res.json({
    reachable: lastTelegramPing === "OK" ? "YES" : "NO",
    lastNetworkError: lastNetworkError,
    lastTelegramResponse: lastTelegramResponse,
  });
});

// Test command endpoint
app.post("/api/admin/test-command", requireAdmin, async (req, res) => {
  if (!bot) {
    return res.status(400).json({ error: "Bot not running" });
  }
  try {
    const { command } = req.body;
    let fallbackHit = false;
    // We send a mock webhook event to trigger the local bot handling
    const mockUpdate = {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: { id: 123456, is_bot: false, first_name: "AdminTest" },
        chat: { id: 123456, type: "private", first_name: "Admin" },
        date: Math.floor(Date.now() / 1000),
        text: command,
        entities: command.startsWith("/")
          ? [{ offset: 0, length: command.length, type: "bot_command" }]
          : [],
      },
    } as any;
    lastHandlerExecuted = null;

    // Handle the update directly
    bot.botInfo = bot.botInfo || { id: 123456, is_bot: true, first_name: "MockBot", username: "mockbot", can_join_groups: true, can_read_all_group_messages: true, supports_inline_queries: false };
    
    // Prevent network requests during test
    const originalCallApi = bot.telegram.callApi.bind(bot.telegram);
    bot.telegram.callApi = async (method: any, payload: any, options: any): Promise<any> => {
      console.log(`TEST COMMAND TRACE: intercepted ${method}`, JSON.stringify(payload));
      if (method === "getMe") {
        return bot.botInfo;
      }
      return { message_id: 1234 }; // Mock response
    };

    try {
      await bot.handleUpdate(mockUpdate);
    } finally {
      bot.telegram.callApi = originalCallApi; // Restore
    }

    res.json({ success: true, command, handlerExecuted: lastHandlerExecuted });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: err.message, handlerExecuted: lastHandlerExecuted });
  }
});

// --- Static Express Routes ---

// Add Storage Stats Endpoint
app.get("/api/admin/storage-stats", requireAdmin, async (req, res) => {
  try {
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: "files" }],
        orderBy: [
          { field: { fieldPath: "uploadDate" }, direction: "DESCENDING" },
        ],
        limit: 1,
      },
    };

    const dbId =
      firebaseConfig.firestoreDatabaseId === "(default)"
        ? "(default)"
        : firebaseConfig.firestoreDatabaseId;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents`;
    const key = `?key=${firebaseConfig.apiKey}`;

    let lastUpload = "Never";
    let totalFiles = 0;

    try {
      const resQuery = await fetch(`${baseUrl}:runQuery${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload),
      });
      if (resQuery.ok) {
        const data = await resQuery.json();
        if (data && data.length > 0 && data[0].document) {
          const latest = data[0].document.fields;
          if (latest.uploadDate) {
            lastUpload = latest.uploadDate.stringValue;
          }
        }
      }
    } catch (e) {
      console.error("Storage Stats Query error (lastUpload)", e);
    }

    try {
      const countPayload = {
        aggregationQuery: {
          structuredQuery: { from: [{ collectionId: "files" }] },
          aggregations: [{ count: { upTo: 1000000 } }],
        },
      };
      const resCount = await fetch(`${baseUrl}:runAggregationQuery${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(countPayload),
      });
      if (resCount.ok) {
        const dataCount = await resCount.json();
        if (dataCount && dataCount.length > 0) {
          const result = dataCount[0].result;
          if (
            result &&
            result.aggregateFields &&
            result.aggregateFields.aggregate_0
          ) {
            totalFiles = parseInt(
              result.aggregateFields.aggregate_0.integerValue,
              10,
            );
          }
        }
      }
    } catch (e) {
      console.error("Storage Stats Query error (count)", e);
    }

    res.json({
      storageChannelConnected: !!storageChannel,
      channelChatId: storageChannel,
      channelName: "Private Storage Channel",
      totalStoredFiles: totalFiles,
      storageHealth: "Health OK - Accessible",
      lastUpload: lastUpload,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/r/:userId", "/ref/:userId"], (req, res) => {
  const userId = req.params.userId;
  if (!botUsername) {
    return res.send("Bot offline");
  }
  res.redirect(`https://t.me/${botUsername}?start=${userId}`);
});

app.get("/api/debug/file/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const data = await restGetDoc("files", fileId);
    if (!data) {
      return res.json({ exists: false, firestoreRecordFound: false });
    }

    let downloadUrl = null;
    if (bot && data.telegramFileId) {
      downloadUrl = `https://t.me/${botUsername}?start=dl_${fileId}`;
    }

    return res.json({
      exists: true,
      filename: data.fileName,
      telegramFileId: data.telegramFileId,
      channelMessageId: data.telegramMessageId,
      downloadUrl,
      firestoreRecordFound: true,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Download Redirection
app.get("/api/file/:fileId/download", async (req, res) => {
  let isHeadersSent = false;
  try {
    const fileId = req.params.fileId;
    const token = req.query.token as string | undefined;
    const verified = req.query.verified === "true";
    
    console.log("DOWNLOAD_REQUEST");
    console.log(`fileId: ${fileId}`);
    console.log(`token: ${token || 'none'}`);
    
    const data = await restGetDoc("files", fileId);
    if (!data) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    console.log("FIRESTORE_LOOKUP_SUCCESS");
    
    const uploaderId = data.uploaderId;
    console.log(`userId: ${uploaderId || 'none'}`);

    if (!bot) {
      return res.status(500).json({ success: false, error: "Bot is currently restarting or offline" });
    }

    const now = new Date();
    const expiry = new Date(data.expiryDate);
    if (now > expiry) {
      return res.status(410).json({ success: false, error: "File link has expired" });
    }

    const telegramFileId = data.telegramFileId;

    // Start background referral and earnings processing, do not block download
    if (uploaderId && verified && token) {
      setTimeout(async () => {
         try {
            const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "unknown";
            let refDoc = (await restGetDoc("referrals", uploaderId)) || {
              totalValidDownloads: 0, totalRewardsEarned: 0, pendingVerification: 0, fraudDownloadsRemoved: 0, downloadIps: "{}"
            };

            const ipMap = JSON.parse(refDoc.downloadIps || "{}");
            if (ipMap[clientIp]) {
              refDoc.fraudDownloadsRemoved = (refDoc.fraudDownloadsRemoved || 0) + 1;
            } else {
              ipMap[clientIp] = true;
              refDoc.downloadIps = JSON.stringify(ipMap);
              refDoc.totalValidDownloads = (refDoc.totalValidDownloads || 0) + 1;
              if (refDoc.totalValidDownloads % 10 === 0) {
                refDoc.totalRewardsEarned = (refDoc.totalRewardsEarned || 0) + 1;
                try {
                  const fin = await restGetDoc("financials", uploaderId);
                  if (fin) {
                    fin.balance = (fin.balance || 0) + 1;
                    await restSetDoc("financials", uploaderId, fin);
                    if (bot && currentBotToken) {
                      try { await bot.telegram.sendMessage(uploaderId, `🎉 *Reward Credited*\n\n10 Valid Downloads Completed\nReward Added: ₹1\nCurrent Balance: ₹${fin.balance.toFixed(2)}`, { parse_mode: "Markdown" }); } catch (e) {}
                    }
                  }
                } catch (finErr) {}
              }
            }
            await restSetDoc("referrals", uploaderId, refDoc);
         } catch(e) {}
         
         try {
             const downloadsCount = (data.downloads !== undefined ? data.downloads : data.downloadCount || 0) + 1;
             const earningsAmt = (data.earnings || 0) + 0.05;
             await restSetDoc("files", fileId, { ...data, downloads: downloadsCount, earnings: earningsAmt });
             
             const referredInfo = await restGetDoc("referred_users", uploaderId);
             if (referredInfo && referredInfo.status === "verified" && referredInfo.referrerId) {
                 const referrerId = referredInfo.referrerId;
                 const referrerRefDoc = await restGetDoc("referrals", referrerId) || {};
                 referrerRefDoc.earnings = (referrerRefDoc.earnings || 0) + (0.05 * ((referralCommissionRate || 10) / 100));
                 await restSetDoc("referrals", referrerId, referrerRefDoc);
             }
         } catch(e) {}
      }, 0);
    }

    // Redirect to Telegram Bot to send the large file using telegramFileId
    return res.redirect(`https://t.me/${botUsername}?start=dl_${fileId}`);
    
  } catch (err: any) {
    if (!res.headersSent && !isHeadersSent) {
      res.status(500).json({ 
        success: false, 
        error: err.message, 
        stack: err.stack 
      });
    } else {
      res.end();
    }
  }
});

app.get("/api/debug/download-test/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const data = await restGetDoc("files", fileId);
    if (!data) {
      return res.json({ firestoreFound: false });
    }
    
    let telegramFilePath = null;
    let streamReady = false;
    let telegramFileId = data.telegramFileId;
    
    if (bot && telegramFileId) {
        telegramFilePath = `https://t.me/${botUsername}?start=dl_${fileId}`;
        streamReady = true;
    }
    
    return res.json({
      firestoreFound: true,
      telegramFileId,
      telegramFilePath,
      routeReached: true,
      canStream: streamReady
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
});

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function renderGlobalAdScripts(): string {
  let html = "";

  // 1. Social Bar Support
  if (socialBarConfig && socialBarConfig.enabled && socialBarConfig.script) {
    html += `<!-- Ads Social Bar -->\n<div class="ads-social-bar" style="display:none;">${socialBarConfig.script}</div>\n`;
  }

  // 2. Dedicated Popunder Script setup
  if (popunderConfig && popunderConfig.enabled) {
    // Find Popunder script code from premium ads list or general fallbacks
    const popunderAds = Array.isArray(adsList) ? adsList.filter(a => a.enabled && a.type.toLowerCase().includes("popunder")) : [];
    popunderAds.sort((a,b) => (b.priority || 0) - (a.priority || 0));
    const activePopunderScript = popunderAds.length > 0 ? popunderAds[0].scriptCode : "";
    const activePopId = popunderAds.length > 0 ? popunderAds[0].id : "global_popunder";

    html += `
    <!-- Popunder System -->
    <script>
      (function() {
        try {
          const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
          const deviceMode = "${popunderConfig.device || "all"}";
          
          if (deviceMode === "mobile" && !isMobile) return;
          if (deviceMode === "desktop" && isMobile) return;

          // Check frequency cap
          if (${popunderConfig.oncePerSession === true}) {
            if (sessionStorage.getItem('popunder_fired')) return;
          }
          if (${popunderConfig.oncePer24Hours === true}) {
            const lastShown = localStorage.getItem('popunder_last_shown_time');
            if (lastShown && (Date.now() - parseInt(lastShown, 10)) < 24 * 3600 * 1000) return;
          }

          // Trigger Popunder injection after delay
          const delaySecs = parseInt("${popunderConfig.delay || 3}", 10);
          setTimeout(function() {
            console.log("Popunder armed with delay of " + delaySecs + "s");
            
            // Popunder display zone or trigger script
            const injectorDiv = document.createElement("div");
            injectorDiv.id = "popunder-zone-injector";
            injectorDiv.style.display = "none";
            injectorDiv.innerHTML = \`${activePopunderScript}\`;
            document.body.appendChild(injectorDiv);

            // Re-execute scripts inside injector
            Array.from(injectorDiv.getElementsByTagName("script")).forEach(function(oldScr) {
              const newScr = document.createElement("script");
              Array.from(oldScr.attributes).forEach(attr => newScr.setAttribute(attr.name, attr.value));
              newScr.appendChild(document.createTextNode(oldScr.innerHTML));
              oldScr.parentNode.replaceChild(newScr, oldScr);
            });

            // Set localStorage or sessionStorage limits
            if (${popunderConfig.oncePerSession === true}) {
              sessionStorage.setItem('popunder_fired', 'true');
            }
            if (${popunderConfig.oncePer24Hours === true}) {
              localStorage.setItem('popunder_last_shown_time', Date.now().toString());
            }

            // Track impression
            fetch('/api/ads/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ adId: "${activePopId}", eventType: "impression" })
            }).catch(e => {});

          }, delaySecs * 1000);

        } catch (ex) {
          console.warn("Popunder execution fail safe: ", ex);
        }
      })();
    </script>
    `;
  }

  // 3. Direct Link system
  const directLinkAds = Array.isArray(adsList) ? adsList.filter(a => a.enabled && a.type.toLowerCase().includes("direct")) : [];
  directLinkAds.sort((a,b) => (b.priority || 0) - (a.priority || 0));

  if (directLinkAds.length > 0 || (directLinkConfig && directLinkConfig.url)) {
    const activeDirectLinkUrl = directLinkAds.length > 0 ? (directLinkAds[0].scriptCode.includes("http") ? directLinkAds[0].scriptCode : (directLinkConfig.url || "")) : (directLinkConfig.url || "");
    const triggerEvent = directLinkConfig.trigger || "download_click";
    const directLinkId = directLinkAds.length > 0 ? directLinkAds[0].id : "global_direct_link";

    if (activeDirectLinkUrl) {
      html += `
      <!-- Direct Link Interceptor -->
      <script>
        (function() {
          try {
            const trigger = "${triggerEvent}";
            const targetUrl = "${activeDirectLinkUrl}";
            
            function fireDirectLink() {
              window.open(targetUrl, '_blank');
              fetch('/api/ads/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adId: "${directLinkId}", eventType: "click" })
              }).catch(e => {});
            }

            window.addEventListener('load', function() {
              if (trigger === "download_click") {
                const dlBtn = document.getElementById("s4-final-timer") || document.getElementById("download-main-btn");
                if (dlBtn) {
                  dlBtn.addEventListener('click', fireDirectLink);
                }
              } else if (trigger === "upload_click") {
                const upBtn = document.getElementById("upload-trigger-btn");
                if (upBtn) {
                  upBtn.addEventListener('click', fireDirectLink);
                }
              } else if (trigger === "button_click") {
                document.querySelectorAll("button, a.btn").forEach(function(el) {
                  el.addEventListener('click', function() {
                    if (Math.random() < 0.35) {
                      fireDirectLink();
                    }
                  });
                });
              } else {
                document.body.addEventListener('click', function(e) {
                  if (Math.random() < 0.20 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    fireDirectLink();
                  }
                }, { once: false });
              }
            });
          } catch(ex) {
            console.warn("Direct Link fail safe: ", ex);
          }
        })();
      </script>
      `;
    }
  }

  // 4. Injected Script Code Errors sandboxing
  html += `
  <script>
    window.addEventListener('error', function(e) {
      if (e.filename && (e.filename.includes('monetag') || e.filename.includes('adsterra') || e.filename.includes('googlesyndication') || e.filename.includes('clickadu') || e.filename.includes('pop') || e.filename.includes('ads'))) {
        console.warn('Isolating third-party ad script error:', e.message);
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  </script>
  `;

  return html;
}

function renderAdsForPlacement(placementKey: string): string {
  let html = "";
  
  // Legacy single ad fallback
  if (adsEnabled && adsScript && adsPosition) {
    const pos = adsPosition.toLowerCase();
    const pk = placementKey.toLowerCase();
    let isLegacyMatch = false;
    if (pos === "all") isLegacyMatch = true;
    else if (pos === "top" && pk.includes("header")) isLegacyMatch = true;
    else if (pos === "middle" && (pk.includes("middle") || pk.includes("details"))) isLegacyMatch = true;
    else if (pos === "bottom" && pk.includes("footer")) isLegacyMatch = true;
    else if (pos === "sidebar" && pk.includes("sidebar")) isLegacyMatch = true;
    
    if (isLegacyMatch) {
      html += `<div class="ad-wrapper-legacy w-full flex justify-center my-4 overflow-hidden" style="min-height:90px">${adsScript}</div>`;
    }
  }

  // Find dynamic ads designed for this specific placement
  if (Array.isArray(adsList)) {
    const matchedAds = adsList.filter(ad => {
      if (!ad || !ad.enabled) return false;
      const adPlacement = (ad.placement || "").toLowerCase().replace("_", "");
      const k = placementKey.toLowerCase().replace("_", "");
      return adPlacement === k || adPlacement.includes(k) || k.includes(adPlacement);
    });

    matchedAds.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    matchedAds.forEach(ad => {
      html += `
        <div class="ad-wrapper-dynamic" data-ad-id="${ad.id}" style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 12px 0; overflow: hidden;" onclick="try { fetch('/api/ads/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adId: '${ad.id}', eventType: 'click' }) }).catch(e => {}) } catch(e) {}">
          ${ad.scriptCode}
          <script>
            (function() {
              try {
                fetch('/api/ads/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ adId: "${ad.id}", eventType: "impression" })
                }).catch(e => {});
              } catch(e) {}
            })();
          </script>
        </div>
      `;
    });
  }

  return html;
}

function getAdHTML(label: string): string {
  return renderAdsForPlacement(label);
}

app.get("/file/:fileId", async (req, res) => {
  const fileId = req.params.fileId;
  try {
    const data = await restGetDoc("files", fileId);
    if (!data) {
      return res
        .status(404)
        .send(
          `<!DOCTYPE html><html><head><title>File Not Found</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex h-screen items-center justify-center"><div class="text-center p-8 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full"><h1 class="text-2xl font-bold text-gray-900 mb-2">File Unavailable</h1><p class="text-gray-500">The requested file does not exist or has been removed.</p></div></body></html>`,
        );
    }
    const now = new Date();
    const expiry = new Date(data.expiryDate);
    if (now > expiry) {
      return res
        .status(410)
        .send(
          `<!DOCTYPE html><html><head><title>Link Expired</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex h-screen items-center justify-center"><div class="text-center p-8 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-md w-full"><h1 class="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1><p class="text-gray-500">This download link has expired.</p></div></body></html>`,
        );
    }
    
    const renderAd = (enabled: boolean, script: string, label: string, isReal: boolean) => {
      return getAdHTML(label);
    };
    const adsConfig = {
      bannerEnabled: adsEnabled && (adsPosition.toLowerCase() === "top" || adsPosition.toLowerCase() === "middle" || adsPosition.toLowerCase() === "all"),
      bannerScript: adsScript,
      nativeEnabled: adsEnabled && (adsPosition.toLowerCase() === "sidebar" || adsPosition.toLowerCase() === "all"),
      nativeScript: adsScript,
      stickyEnabled: adsEnabled && (adsPosition.toLowerCase() === "bottom" || adsPosition.toLowerCase() === "all"),
      stickyScript: adsScript,
      socialBarEnabled: false,
      socialBarScript: "",
      popunderEnabled: false,
      popunderScript: "",
      directLinkEnabled: false,
      directLinkScript: ""
    } as any;

    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download ${data.fileName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    body { font-family: 'Inter', sans-serif; scroll-behavior: smooth; }
    .ad-placeholder {
      width: 100%;
      background: linear-gradient(45deg, #1f2937, #374151);
      border: 1px dashed #4b5563;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      margin: 1rem 0;
      font-size: 0.875rem;
      border-radius: 0.75rem;
      overflow: hidden;
      font-weight: 500;
    }
    .ad-banner { min-height: 90px; }
    .ad-box { min-height: 250px; }
    .ad-tall { min-height: 600px; }
  </style>
</head>
<body class="bg-gray-900 text-gray-100 flex flex-col relative overflow-x-hidden min-h-screen">
  
  <div id="fraud-overlay" class="hidden fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
    <i data-lucide="alert-triangle" class="w-20 h-20 text-red-500 mb-6"></i>
    <h2 class="text-3xl font-bold text-white mb-4">⚠ Suspicious Activity Detected</h2>
    <p class="text-gray-400 max-w-md text-lg">Please disable VPN, proxy, ad blockers, or automated tools and try again to proceed with your download.</p>
  </div>

  <header class="bg-gray-800 p-4 border-b border-gray-700 text-center w-full z-10 sticky top-0 shadow-lg" id="header-banner">
    ${renderAd(adsConfig.bannerEnabled, adsConfig.bannerScript, "header_banner", true)}
  </header>

  <main class="max-w-6xl mx-auto w-full p-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
    
    <!-- LEFT SIDEBAR -->
    <aside class="col-span-1 lg:col-span-4 flex flex-col gap-6">
      <!-- FILE INFO CARD -->
      <div class="bg-gray-800 rounded-3xl p-6 text-center shadow-xl border border-gray-700 border-t-4 border-t-blue-500 overflow-hidden">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20">
          <i data-lucide="file-box" class="w-10 h-10 text-blue-400"></i>
        </div>
        <h1 class="text-lg font-bold text-white mb-6 break-all">${data.fileName}</h1>
        <div class="flex flex-col gap-3 text-left">
            <div class="bg-gray-900 flex justify-between items-center px-4 py-3 rounded-xl border border-gray-700">
              <div class="flex items-center gap-2 text-gray-400">
                <i data-lucide="hard-drive" class="w-4 h-4"></i>
                <span class="text-xs font-semibold uppercase tracking-wider">File Size</span>
              </div>
              <span class="font-bold text-gray-200">${formatBytes(data.fileSize)}</span>
            </div>
            <div class="bg-gray-900 flex justify-between items-center px-4 py-3 rounded-xl border border-gray-700">
              <div class="flex items-center gap-2 text-gray-400">
                <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                <span class="text-xs font-semibold uppercase tracking-wider">Uploaded</span>
              </div>
              <span class="font-bold text-gray-200">${new Date(data.uploadDate).toLocaleDateString()}</span>
            </div>
            <div class="bg-gray-900 flex justify-between items-center px-4 py-3 rounded-xl border border-gray-700">
              <div class="flex items-center gap-2 text-gray-400">
                <i data-lucide="calendar-off" class="w-4 h-4"></i>
                <span class="text-xs font-semibold uppercase tracking-wider">Expires</span>
              </div>
              <span class="font-bold text-gray-200">${new Date(data.expiryDate).toLocaleDateString()}</span>
            </div>
        </div>
      </div>

      <!-- SECURITY NOTICE -->
      <div class="bg-red-900/10 border border-red-500/20 rounded-2xl p-5 text-left">
         <div class="flex items-center gap-3 mb-3">
           <i data-lucide="shield-alert" class="w-6 h-6 text-red-500"></i>
           <h3 class="font-bold text-red-400 tracking-wide uppercase text-sm">Security Notice</h3>
         </div>
         <p class="text-sm text-gray-400 leading-relaxed font-medium">
           ⚠ Do not use VPN, Proxy, Ad Blocker, or automated tools. 
           <span class="text-gray-300">Suspicious traffic may be blocked.</span>
         </p>
      </div>

      <!-- SIDE AD -->
      <div id="side-native-ad" class="hidden lg:flex w-full">
         ${getAdHTML("before_security")}
      </div>
    </aside>

    <!-- MAIN CONTENT COLUMN -->
    <section class="col-span-1 lg:col-span-8 flex flex-col gap-6 w-full">
      
      <!-- PROGRESS TRACKER CARD -->
      <div class="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-xl overflow-hidden hidden md:block">
         <div class="flex justify-between items-center relative">
            <!-- progress line bg -->
            <div class="absolute left-6 right-6 top-5 h-1 bg-gray-700 z-0 rounded-full"></div>
            <!-- progress line active -->
            <div id="progress-bar" class="absolute left-6 top-5 h-1 bg-blue-500 z-0 rounded-full transition-all duration-500 w-0"></div>
            
            <div class="relative z-10 flex flex-col items-center gap-3 w-16" id="pg-step1">
              <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-400 font-bold border-4 border-gray-800 transition-colors" id="pg-icon1">1</div>
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">File Verify</span>
            </div>
            <div class="relative z-10 flex flex-col items-center gap-3 w-16" id="pg-step2">
              <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-400 font-bold border-4 border-gray-800 transition-colors" id="pg-icon2">2</div>
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Ad Verify</span>
            </div>
            <div class="relative z-10 flex flex-col items-center gap-3 w-16" id="pg-step3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-400 font-bold border-4 border-gray-800 transition-colors" id="pg-icon3">3</div>
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Security</span>
            </div>
            <div class="relative z-10 flex flex-col items-center gap-3 w-16" id="pg-step4">
               <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-400 font-bold border-4 border-gray-800 transition-colors" id="pg-icon4">4</div>
               <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Unlock</span>
            </div>
            <div class="relative z-10 flex flex-col items-center gap-3 w-16" id="pg-step5">
               <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-400 font-bold border-4 border-gray-800 transition-colors" id="pg-icon5">5</div>
               <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Ready</span>
            </div>
         </div>
      </div>

      <div id="middle-banner" class="w-full">
         ${renderAd(adsConfig.bannerEnabled, adsConfig.bannerScript, "after_security", true)}
      </div>

      <!-- STEP CONTAINERS -->
      
      <!-- STEP 1 -->
      <div id="step1" class="step-container hidden flex-col items-center w-full">
        <div class="bg-gray-800 rounded-3xl p-8 w-full text-center border border-gray-700 shadow-xl overflow-hidden relative">
            <div class="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            
            <div id="s1-verify-timer" class="mb-4">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-full mb-6 relative">
                   <div class="absolute inset-0 rounded-full border border-blue-500/30 animate-ping"></div>
                   <i data-lucide="hourglass" class="w-10 h-10 text-blue-400"></i>
                </div>
                <h2 class="text-3xl font-bold mb-4 text-white">⏳ Please Wait</h2>
                <div class="bg-gray-900 rounded-2xl p-8 border border-gray-700 mx-auto max-w-sm">
                   <div class="text-7xl font-black text-blue-500 mb-2 font-mono" id="t1-span"><span>20</span></div>
                   <div class="text-sm text-gray-400 uppercase tracking-widest font-bold">Seconds Remaining</div>
                </div>
            </div>
            
            <button id="s1-verify-btn" onclick="step1Verify()" class="hidden mx-auto w-full max-w-sm h-16 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_4px_20px_-4px_rgba(37,99,235,0.5)]">
                ✅ Verify
            </button>
        </div>

        <div id="s1-continue-section" class="hidden w-full flex-col items-center mt-6">
            <div class="w-full flex items-center gap-4 mb-6">
                <div class="h-px bg-gray-700 flex-1"></div>
                <div class="text-blue-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2 animate-bounce">
                  <i data-lucide="arrow-down-circle" class="w-5 h-5"></i> Scroll Down
                </div>
                <div class="h-px bg-gray-700 flex-1"></div>
            </div>

            ${getAdHTML("before_download")}
            
            <div class="bg-gray-800 rounded-3xl p-8 w-full border border-gray-700 shadow-xl text-center">
                <div id="s1-continue-timer" class="mb-6">
                    <div class="flex flex-col md:flex-row items-center justify-center gap-4">
                       <span class="text-gray-400 font-bold uppercase tracking-wider">Verification Complete</span>
                       <div class="h-10 w-px bg-gray-700 hidden md:block"></div>
                       <div class="flex items-center gap-2 text-xl font-bold">
                          Next in <span class="text-blue-500 text-3xl font-mono px-2" id="c1-span"><span>5</span></span> sec
                       </div>
                    </div>
                </div>
                
                <button id="s1-continue-btn" onclick="initStep2()" class="hidden mx-auto w-full max-w-sm h-16 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_4px_20px_-4px_rgba(37,99,235,0.5)]">
                    ➡ Continue
                </button>
            </div>
        </div>
      </div>

      <!-- STEP 2 -->
      <div id="step2" class="step-container hidden flex-col items-center w-full">
        <div class="bg-gray-800 rounded-3xl p-8 w-full text-center border border-gray-700 shadow-xl overflow-hidden relative">
            <div class="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-purple-600 to-indigo-600"></div>
            
            <div id="s2-verify-timer" class="mb-4">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-purple-500/10 rounded-full mb-6 relative">
                   <div class="absolute inset-0 rounded-full border border-purple-500/30 animate-spin" style="animation-duration: 3s;"></div>
                   <i data-lucide="shield" class="w-10 h-10 text-purple-400"></i>
                </div>
                <h2 class="text-3xl font-bold mb-4 text-white">Security Check</h2>
                <div class="bg-gray-900 rounded-2xl p-8 border border-gray-700 mx-auto max-w-sm">
                   <div class="text-7xl font-black text-purple-500 mb-2 font-mono" id="t2-span"><span>20</span></div>
                   <div class="text-sm text-gray-400 uppercase tracking-widest font-bold">Seconds Remaining</div>
                </div>
            </div>
            
            <button id="s2-verify-btn" onclick="step2Verify()" class="hidden mx-auto w-full max-w-sm h-16 bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.5)]">
                ✅ Verify
            </button>
        </div>

        <div id="s2-continue-section" class="hidden w-full flex-col items-center mt-6">
            <div class="w-full flex items-center gap-4 mb-6">
                <div class="h-px bg-gray-700 flex-1"></div>
                <div class="text-purple-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2 animate-bounce">
                  <i data-lucide="arrow-down-circle" class="w-5 h-5"></i> Scroll Down
                </div>
                <div class="h-px bg-gray-700 flex-1"></div>
            </div>

            ${getAdHTML("after_download")}
            
            <div class="bg-gray-800 rounded-3xl p-8 w-full border border-gray-700 shadow-xl text-center">
                <div id="s2-continue-timer" class="mb-6">
                    <div class="flex flex-col md:flex-row items-center justify-center gap-4">
                       <span class="text-gray-400 font-bold uppercase tracking-wider">Security Checked</span>
                       <div class="h-10 w-px bg-gray-700 hidden md:block"></div>
                       <div class="flex items-center gap-2 text-xl font-bold">
                          Unlocking in <span class="text-purple-500 text-3xl font-mono px-2" id="c2-span"><span>5</span></span> sec
                       </div>
                    </div>
                </div>
                
                <button id="s2-continue-btn" onclick="initStep3()" class="hidden mx-auto w-full max-w-sm h-16 bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.5)]">
                    ➡ Continue
                </button>
            </div>
        </div>
      </div>

      <!-- STEP 3 (Unlock) -->
      <div id="step3" class="step-container hidden flex-col items-center w-full mx-auto max-w-2xl mt-4">
          <div class="bg-gray-800 rounded-3xl p-10 md:p-14 text-center border border-gray-700 shadow-2xl w-full relative overflow-hidden">
             <!-- radial yellow background glow -->
             <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent"></div>
             
             <div class="relative z-10 w-32 h-32 mx-auto bg-gray-900 rounded-full flex items-center justify-center mb-8 border-4 border-yellow-500/30">
                <i data-lucide="unlock" class="w-14 h-14 text-yellow-400"></i>
             </div>
             
             <h2 class="text-4xl font-black text-white mb-4 relative z-10">Unlocked!</h2>
             <p class="text-gray-400 mb-10 text-lg relative z-10 font-medium">All verifications passed. Your link is ready to be generated.</p>
             
             <button onclick="initStep4()" class="relative z-10 w-full h-20 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-black text-xl rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_-5px_rgba(234,179,8,0.4)] active:scale-95 border-b-4 border-amber-600 hover:border-b-0 hover:translate-y-1">
                 Unlock Download Link <i data-lucide="external-link" class="w-7 h-7"></i>
             </button>
          </div>
      </div>

      <!-- STEP 4 -->
      <div id="step4" class="step-container hidden flex-col items-center w-full">
         <div class="bg-gray-800 rounded-3xl p-8 md:p-12 w-full text-center border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.1)] relative overflow-hidden mb-8">
             <div class="absolute top-0 inset-x-0 h-2 bg-green-500"></div>
             
             <i data-lucide="check-circle-2" class="w-20 h-20 text-green-400 mx-auto mb-6"></i>
             <h2 class="text-4xl font-black text-white mb-2">✅ File Ready</h2>
             <p class="text-gray-400 font-mono text-sm break-all mb-10 bg-gray-900 p-4 rounded-xl border border-gray-700 inline-block">${data.fileName}</p>
             
             ${(() => {
                 const b = getAdHTML("before_download");
                 const a = getAdHTML("after_download");
                 if (!b && !a) return '';
                 return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full">
                    <div class="w-full flex justify-center">${b}</div>
                    <div class="w-full flex justify-center">${a}</div>
                 </div>`;
             })()}
             
             <div class="max-w-md w-full mx-auto">
                 <div id="s4-get-timer" class="bg-gray-900 p-8 rounded-2xl mb-6 border border-gray-700 shadow-inner text-center">
                     <div class="text-sm text-gray-400 uppercase font-bold tracking-wider mb-4">Generating Link</div>
                     <div class="text-7xl font-black text-green-500 mb-2 font-mono" id="t4-span"><span>10</span></div>
                     <div class="text-xs text-gray-500 tracking-widest font-bold mt-4 uppercase">Almost done...</div>
                 </div>

                 <button id="s4-get-btn" onclick="step4GetDownload()" class="hidden w-full h-20 bg-green-600 hover:bg-green-500 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_-5px_rgba(34,197,94,0.4)] active:scale-95 border-b-4 border-green-700 hover:border-b-0 hover:translate-y-1">
                     ⬇ Get Download
                 </button>
                 
                 ${adsConfig.directLinkEnabled && adsConfig.directLinkScript ? `
                 <button id="s4-direct-btn" onclick="window.open('${adsConfig.directLinkScript}', '_blank'); trackAdClick();" class="hidden mt-4 w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_8px_25px_-5px_rgba(37,99,235,0.4)] active:scale-95 border-b-4 border-blue-700 hover:border-b-0 hover:translate-y-1">
                     ⭐ Premium Sponsor Link
                 </button>
                 ` : ''}
                 
                 <div id="s4-final-timer" class="hidden bg-gray-900 p-8 rounded-2xl border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)] text-center animate-pulse">
                     <div class="text-sm text-green-400 uppercase font-black tracking-widest mb-4">File Starting In</div>
                     <div class="text-7xl font-black text-white mb-2 font-mono" id="f4-span"><span>5</span></div>
                     <p class="text-gray-400 font-medium mt-4">Do not close window</p>
                 </div>
             </div>
         </div>
      </div>

    </section>
  </main>

  <footer class="mt-auto w-full border-t border-gray-800 bg-gray-900 border-t-blue-500 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10 sticky bottom-0" id="sticky-footer-ad">
     ${renderAd(adsConfig.stickyEnabled, adsConfig.stickyScript, "footer_banner", true)}
  </footer>

  ${renderGlobalAdScripts()}

  <script>
    lucide.createIcons();
    
    let hasCompletedFlow = false;
    let antiAbuseToken = "";
    let isFraudDetected = false;

    function runSecurityCheck() {
        if (navigator.webdriver) isFraudDetected = true;
        if (window._phantom || window.__nightmare) isFraudDetected = true;
        
        const adTest = document.createElement('div');
        adTest.className = 'ad-banner adsbox doubleclick bannerads';
        adTest.style.height = '1px';
        adTest.style.width = '1px';
        adTest.style.position = 'absolute';
        adTest.style.left = '-1000px';
        document.body.appendChild(adTest);
        
        setTimeout(() => {
            if (adTest.offsetHeight === 0 || adTest.style.display === 'none') {
               // isFraudDetected = true; // Optionally enable adblock detection
            }
            if (isFraudDetected) {
                document.getElementById('fraud-overlay').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }
            adTest.remove();
        }, 300);
    }
    
    window.onload = runSecurityCheck;
    
    function trackAdClick() {
        console.log("Track ad click");
        fetch('/api/admin/ads/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'click' })
        }).catch(console.error);
    }
    
    function updateProgress(step) {
      const bar = document.getElementById('progress-bar');
      if (bar) {
         bar.style.width = ((step-1) * 25) + '%';
      }
      for(let i=1; i<=5; i++){
         const icon = document.getElementById('pg-icon' + i);
         const text = document.querySelector('#pg-step' + i + ' span');
         if(!icon || !text) continue;
         if (i < step) {
             icon.className = "w-10 h-10 rounded-full flex items-center justify-center bg-green-500 text-white font-bold border-4 border-gray-800 transition-colors shadow-lg";
             icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
             text.className = "text-[10px] font-bold text-green-400 uppercase tracking-wider text-center";
         } else if (i === step) {
             icon.className = "w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold border-4 border-gray-800 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.8)]";
             icon.innerHTML = i;
             text.className = "text-[10px] font-bold text-white uppercase tracking-wider text-center drop-shadow-md";
         } else {
             icon.className = "w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 text-gray-500 font-bold border-4 border-gray-800 transition-colors";
             icon.innerHTML = i;
             text.className = "text-[10px] font-bold text-gray-600 uppercase tracking-wider text-center";
         }
      }
    }

    function startTimerLogic(duration, displaySelector, btnSelector, onComplete) {
        let timer = duration;
        const displayElement = document.querySelector(displaySelector);
        const btnElement = document.querySelector(btnSelector);
        if(!displayElement || !btnElement) return;
        
        displayElement.textContent = timer;
        // find parent container to hide/show
        const timerContainer = displayElement.closest('[id$="-timer"]');
        if(timerContainer) timerContainer.classList.remove('hidden');
        btnElement.classList.add('hidden');
        
        let interval = setInterval(() => {
            timer--;
            displayElement.textContent = timer;
            
            if (timer <= 0) {
                clearInterval(interval);
                if(timerContainer) timerContainer.classList.add('hidden');
                btnElement.classList.remove('hidden');
                if(onComplete) onComplete();
            }
        }, 1000);
    }

    function scrollToElement(selector) {
        const el = document.querySelector(selector);
        if(el) {
           const y = el.getBoundingClientRect().top + window.pageYOffset - 100;
           window.scrollTo({top: y, behavior: 'smooth'});
        }
    }

    function hideAllSteps() {
        document.querySelectorAll('.step-container').forEach(el => {
             el.classList.add('hidden');
             el.classList.remove('flex');
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- STEPS ---
    
    function initStep1() {
        if(isFraudDetected) return;
        hideAllSteps();
        document.getElementById('step1').classList.remove('hidden');
        document.getElementById('step1').classList.add('flex');
        updateProgress(1);
        startTimerLogic(20, '#t1-span span', '#s1-verify-btn');
    }

    function step1Verify() {
        const section = document.getElementById('s1-continue-section');
        section.classList.remove('hidden');
        section.classList.add('flex');
        updateProgress(2);
        scrollToElement('#s1-continue-section');
        startTimerLogic(5, '#c1-span span', '#s1-continue-btn', () => {
             document.getElementById('s1-continue-timer').classList.add('hidden');
        });
    }

    function initStep2() {
        hideAllSteps();
        document.getElementById('step2').classList.remove('hidden');
        document.getElementById('step2').classList.add('flex');
        updateProgress(3);
        startTimerLogic(20, '#t2-span span', '#s2-verify-btn');
    }

    function step2Verify() {
        const section = document.getElementById('s2-continue-section');
        section.classList.remove('hidden');
        section.classList.add('flex');
        scrollToElement('#s2-continue-section');
        startTimerLogic(5, '#c2-span span', '#s2-continue-btn', () => {
             document.getElementById('s2-continue-timer').classList.add('hidden');
        });
    }

    function initStep3() {
        hideAllSteps();
        document.getElementById('step3').classList.remove('hidden');
        document.getElementById('step3').classList.add('flex');
        updateProgress(4);
    }

    function initStep4() {
        hideAllSteps();
        document.getElementById('step4').classList.remove('hidden');
        document.getElementById('step4').classList.add('flex');
        updateProgress(5);
        startTimerLogic(10, '#t4-span span', '#s4-get-btn', () => {
             const directBtn = document.getElementById('s4-direct-btn');
             if(directBtn) directBtn.classList.remove('hidden');
        });
    }

    function step4GetDownload() {
        document.getElementById('s4-get-btn').classList.add('hidden');
        document.getElementById('s4-final-timer').classList.remove('hidden');
        
        let timer = 5;
        const display = document.querySelector('#f4-span span');
        display.textContent = timer;
        let intv = setInterval(() => {
            timer--;
            display.textContent = timer;
            if(timer <= 0) {
                clearInterval(intv);
                hasCompletedFlow = true;
                antiAbuseToken = btoa(Date.now().toString());
                triggerRealDownload();
            }
        }, 1000);
    }

    function triggerRealDownload() {
       if (!hasCompletedFlow || isFraudDetected) return;
       const btnContainer = document.getElementById('s4-final-timer');
       btnContainer.innerHTML = '<div class="flex items-center text-white font-black text-2xl gap-3 justify-center w-full"><i data-lucide="check-circle" class="w-8 h-8 text-green-400"></i> Download Started</span>';
       lucide.createIcons();
       const downloadUrl = '/api/file/${fileId}/download?verified=true&token=' + encodeURIComponent(antiAbuseToken);
       window.location.href = downloadUrl;
    }
    
    // Start flow
    setTimeout(initStep1, 100);
  </script>
  ${renderGlobalAdScripts()}
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (err: any) {
    return res
      .status(500)
      .send(
        `<!DOCTYPE html><html><head><title>System Error</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex h-screen items-center justify-center"><div class="text-center p-8 bg-white rounded-3xl shadow-xl w-full max-w-md"><h1 class="text-xl font-bold text-red-600 mb-2">System Error</h1><p class="text-gray-500">${err.message}</p></div></body></html>`,
      );
  }
});

app.get("/verify-withdraw", (req, res) => {
  const token = req.query.token as string;
  if (!token || !humanVerifyTokens.has(token)) {
    return res.status(400).send("Invalid or expired verification session.");
  }
  const state = humanVerifyTokens.get(token);
  const n1 = Math.floor(Math.random() * 10) + 1;
  const n2 = Math.floor(Math.random() * 10) + 1;
  const answer = n1 + n2;
  
  // Update state with answer for POST validation
  humanVerifyTokens.set(token, { ...state, correctAnswer: answer });

  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Human Verification</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .ad-placeholder {
      width: 100%;
      background: linear-gradient(45deg, #1f2937, #374151);
      border: 1px dashed #4b5563;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      margin: 1rem 0;
      font-size: 0.875rem;
      border-radius: 0.75rem;
      font-weight: 500;
    }
  </style>
</head>
<body class="bg-gray-950 text-gray-100 flex flex-col min-h-screen items-center py-10 px-4">
  
  \${getAdHTML("header_banner") || \`<div class="ad-placeholder" style="max-width: 728px; height: 90px;">header_banner</div>\`\}
  
  <div id="verify-card" class="bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-700 text-center my-6">
    <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-4">
      <i data-lucide="bot-off" class="w-8 h-8 text-blue-400"></i>
    </div>
    <h1 class="text-2xl font-bold text-white mb-2">Human Verification</h1>
    <p class="text-gray-400 text-sm mb-6">Solve the math problem below to submit your withdrawal request.</p>
    
    <div class="bg-gray-900 rounded-2xl p-6 border border-gray-700 mb-6">
       <div class="text-4xl font-black text-white tracking-widest">${n1} + ${n2} = ?</div>
    </div>
    
    <div class="flex flex-col gap-4">
      <input type="number" id="answer" autocomplete="off" placeholder="Enter answer" class="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-center text-xl font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600" />
      <button onclick="submitVerify()" id="submit-btn" class="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl transition-all shadow-[0_4px_20px_-4px_rgba(37,99,235,0.5)] active:scale-95">Submit</button>
      <div id="error-msg" class="text-red-400 text-sm font-semibold hidden">Incorrect answer, try again.</div>
    </div>
  </div>

  <div id="success-card" class="bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-green-500/30 text-center my-6 hidden">
    <i data-lucide="check-circle-2" class="w-20 h-20 text-green-400 mx-auto mb-4"></i>
    <h2 class="text-2xl font-bold text-white mb-2">✅ Withdrawal Request Submitted</h2>
    
    <div class="bg-gray-900 rounded-2xl p-4 border border-gray-700 my-6 text-left space-y-2">
       <div class="flex justify-between items-center"><span class="text-gray-400 text-sm font-semibold uppercase">Amount</span><span class="text-white font-bold" id="succ-amt">₹XX</span></div>
       <div class="flex justify-between items-center"><span class="text-gray-400 text-sm font-semibold uppercase">UPI ID</span><span class="text-white font-bold" id="succ-upi">xxxx@upi</span></div>
       <div class="flex justify-between items-center"><span class="text-gray-400 text-sm font-semibold uppercase">Status</span><span class="text-yellow-400 font-bold">Pending Review</span></div>
       <div class="text-xs text-gray-500 mt-2 block border-t border-gray-800 pt-2">Please wait up to 24 hours for approval.</div>
    </div>

    <div class="text-5xl font-black text-green-500 my-6 font-mono" id="countdown">3</div>
    <p class="text-gray-400 text-sm">Redirecting back to Telegram...</p>
  </div>
  
  \${getAdHTML("footer_banner") || \`<div class="ad-placeholder" style="max-width: 300px; height: 250px;">footer_banner</div>\`\}

  <script>
    lucide.createIcons();
    const token = "${token}";
    const tgBotUrl = "https://t.me/${botUsername || 'your_bot'}?start=";
    
    async function submitVerify() {
      const input = document.getElementById('answer').value;
      const btn = document.getElementById('submit-btn');
      const err = document.getElementById('error-msg');
      if(!input) return;
      
      btn.innerHTML = '<i data-lucide="loader" class="w-6 h-6 animate-spin mx-auto"></i>';
      lucide.createIcons();
      btn.disabled = true;
      
      try {
         const res = await fetch('/api/verify-withdraw', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token, answer: parseInt(input) })
         });
         const data = await res.json();
         
         if(data.success) {
            document.getElementById('verify-card').classList.add('hidden');
            document.getElementById('succ-amt').textContent = '₹' + data.amount.toFixed(2);
            document.getElementById('succ-upi').textContent = data.upiId;
            document.getElementById('success-card').classList.remove('hidden');
            let time = 3;
            document.getElementById('countdown').textContent = time;
            const iv = setInterval(() => {
               time--;
               document.getElementById('countdown').textContent = time;
               if(time <= 0) {
                  clearInterval(iv);
                  window.location.href = data.redirectUrl;
               }
            }, 1000);
         } else {
            btn.innerHTML = 'Submit';
            btn.disabled = false;
            err.textContent = data.message || "Incorrect answer";
            err.classList.remove('hidden');
         }
      } catch(e) {
         btn.innerHTML = 'Submit';
         btn.disabled = false;
         err.textContent = "Network error. Try again.";
         err.classList.remove('hidden');
      }
    }
  </script>
  ${renderGlobalAdScripts()}
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.post("/api/verify-withdraw", async (req, res) => {
  try {
    const { token, answer } = req.body;
    if (!token || !humanVerifyTokens.has(token)) {
      return res.status(400).json({ success: false, message: "Session expired." });
    }
    const state = humanVerifyTokens.get(token);
    if (state.correctAnswer !== answer) {
      return res.status(400).json({ success: false, message: "Incorrect answer." });
    }

    const { userId, upiId, amount, username } = state;

    // Execute withdrawal DB insertion
    const requestId = `req_${Date.now()}_${userId}`;
    await restSetDoc("withdraw_requests", requestId, {
      userId,
      username,
      amount,
      upiId,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    humanVerifyTokens.delete(token);

    // Notify user via Telegram
    if (bot && userId) {
      try {
        await bot.telegram.sendMessage(
          userId,
          `✅ *Withdrawal Request Submitted*\n\nAmount: ₹${amount.toFixed(2)}\nUPI ID: ${upiId}\nStatus: Pending Review\n\nPlease wait up to 24 hours for approval.`,
          { parse_mode: "Markdown" }
        );
      } catch (e: any) {
        console.error("Failed to notify user:", e.message);
      }
    }

    return res.json({ 
       success: true, 
       redirectUrl: `https://t.me/${botUsername || 'your_bot'}?start=withdraw_success`,
       amount,
       upiId 
    });

  } catch (err: any) {
    console.error("Verify-withdraw internal error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Ads endpoints removed

app.get("/api/admin/withdrawals", requireAdmin, async (req, res) => {
  try {
    const reqs = await restQueryAll("withdraw_requests");
    res.json(reqs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/admin/withdrawals/:id/status",
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    console.log(`[Admin] Updating withdrawal ${id} to ${status}`);
    try {
      const reqDoc = await restGetDoc("withdraw_requests", id);
      console.log(`[Admin] Retrieved withdrawal request doc:`, !!reqDoc);
      if (reqDoc) {
        reqDoc.status = status;
        if (status === "approved") {
           reqDoc.approvedAt = new Date().toISOString();
           reqDoc.approvedBy = (req as any).user?.email || (req as any).user?.uid || "admin";
        } else if (status === "rejected") {
           if (reason) reqDoc.reason = reason;
           reqDoc.rejectedAt = new Date().toISOString();
           reqDoc.rejectedBy = (req as any).user?.email || (req as any).user?.uid || "admin";
        }
        
        reqDoc.updatedAt = new Date().toISOString();
        console.log(`[Admin] Saving document updates for ${id}...`);
        await restSetDoc("withdraw_requests", id, reqDoc);
        console.log(`[Admin] Document saved successfully.`);

        // Notify user via telegram
        if (bot && currentBotToken && reqDoc.userId) {
          try {
            if (status === "approved") {
              await bot.telegram.sendMessage(
                reqDoc.userId,
                `✅ Withdrawal Approved\n\nPayment sent to your UPI.`,
              );
            } else if (status === "rejected") {
              let msg = `❌ Withdrawal Rejected\n\nAmount refunded to your balance.`;
              if (reason) msg += `\nReason: ${reason}`;
              await bot.telegram.sendMessage(reqDoc.userId, msg);
            }
          } catch (e: any) {
            console.error("Failed to notify user about withdrawal:", e.message);
          }
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[Admin] Error updating withdrawal ${id}:`, err);
      res.status(500).json({ error: err.message });
    }
  },
);
// Admin API to fetch users
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const files = await restQueryAll("files");
    const withdrawals = await restQueryAll("withdraw_requests");
    const referrals = await restQueryAll("referrals");
    const usersMeta = await restQueryAll("users_meta");

    const usersMap = new Map();

    // Helper to get or create user
    const getUser = (id: string) => {
      if (!usersMap.has(id)) {
        usersMap.set(id, {
          id,
          username: "Unknown",
          name: "User",
          joinDate: new Date().toISOString(),
          totalUploads: 0,
          totalDownloads: 0,
          totalEarnings: 0,
          currentBalance: 0,
          totalRevenueGenerated: 0,
          isBlocked: false,
          balanceAdjustment: 0,
          fileEarnings: 0,
          referralEarnings: 0,
          withdrawn: 0,
          pendingWithdraw: 0,
        });
      }
      return usersMap.get(id);
    };

    // Process files
    files.forEach((f: any) => {
      if (!f.uploaderId) return;
      const u = getUser(String(f.uploaderId));
      u.totalUploads++;
      u.totalDownloads += (f.downloads || 0);
      u.fileEarnings += (f.earnings || 0);
      u.totalRevenueGenerated += (f.earnings || 0) * 1.5; // Dummy estimate
      if (f.uploadDate && new Date(f.uploadDate) < new Date(u.joinDate)) {
        u.joinDate = f.uploadDate;
      }
    });

    // Process withdrawals (gets username)
    withdrawals.forEach((w: any) => {
      if (!w.userId) return;
      const u = getUser(String(w.userId));
      if (w.username && w.username !== "Unknown") {
        u.username = w.username;
      }
      if (w.status === "approved") Object.assign(u, { withdrawn: u.withdrawn + (w.amount || 0) });
      if (w.status === "pending") Object.assign(u, { pendingWithdraw: u.pendingWithdraw + (w.amount || 0) });
    });

    // Process referrals
    referrals.forEach((r: any) => {
      const u = getUser(String(r.id));
      u.referralEarnings = (r.earnings || 0);
      if (r.recentReferrals && r.recentReferrals.length > 0) {
          const first = r.recentReferrals[0];
          // Try to set username if unknown
          if (first && u.username === "Unknown") {
              u.username = "Referrer";
          }
      }
    });

    // Process overrides
    usersMeta.forEach((m: any) => {
      const u = getUser(String(m.id));
      u.isBlocked = m.isBlocked || false;
      u.balanceAdjustment = m.balanceAdjustment || 0;
      if (m.username) u.username = m.username;
      if (m.name) u.name = m.name;
    });

    // Calculate balances
    const usersList = Array.from(usersMap.values()).map(u => {
      u.totalEarnings = u.fileEarnings + u.referralEarnings + u.balanceAdjustment;
      u.currentBalance = u.totalEarnings - u.withdrawn - u.pendingWithdraw;
      return u;
    });

    res.json(usersList);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/users/:id/block", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;
    const doc = await restGetDoc("users_meta", id) || {};
    doc.isBlocked = true;
    doc.blockReason = reason;
    doc.blockedAt = new Date().toISOString();
    doc.blockedBy = (req as any).user.email || (req as any).user.uid;
    await restSetDoc("users_meta", id, doc);
    res.json({ success: true });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/users/:id/unblock", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await restGetDoc("users_meta", id) || {};
    doc.isBlocked = false;
    doc.unblockedAt = new Date().toISOString();
    if (doc.blockReason) delete doc.blockReason;
    if (doc.blockedAt) delete doc.blockedAt;
    if (doc.blockedBy) delete doc.blockedBy;
    await restSetDoc("users_meta", id, doc);
    res.json({ success: true });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/users/:id/balance", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { amount } = req.body; // Can be positive or negative
    const doc = await restGetDoc("users_meta", id) || {};
    doc.balanceAdjustment = (doc.balanceAdjustment || 0) + amount;
    await restSetDoc("users_meta", id, doc);
    res.json({ success: true, balanceAdjustment: doc.balanceAdjustment });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/users/:id/files", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const files = await restQueryUserId("files", id);
    res.json(files);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/users/:id/withdrawals", requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const reqs = await restQueryUserId("withdraw_requests", id, "userId");
    res.json(reqs);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/admin/status", async (req, res) => {
  let activeWebhook = null;
  if (bot) {
    try {
      activeWebhook = await bot.telegram.getWebhookInfo();
    } catch(e){}
  }
  res.json({
    hasToken: !!currentBotToken,
    webhookUrl: currentBotToken ? `${APP_URL}/api/telegram-webhook` : null,
    backendOnline: true,
    channel: requiredChannel,
    group: requiredGroup,
    lastTelegramUpdate,
    lastTelegramError,
    lastBotResponse,
    telegramApiStatus,
    botUsername,
    botId,
    webhookHitCount,
    lastCommandReceived,
    lastUserId,
    lastChatId,
    activeWebhook
  });
});

app.get("/api/admin/config", requireAdmin, async (req, res) => {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config?key=${firebaseConfig.apiKey}`;

    const fetchRes = await fetch(url);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      const getField = (f: any) => {
        if (!f || typeof f !== "object") return f;
        if ("stringValue" in f) return f.stringValue;
        if ("integerValue" in f) return parseInt(f.integerValue, 10);
        return f;
      };
      const getFieldBool = (f: any) => {
        if (!f || typeof f !== "object") return false;
        if ("booleanValue" in f) return f.booleanValue;
        if ("stringValue" in f) return f.stringValue === "true" || f.stringValue === "on";
        return false;
      };
      let parsedAdsList = [];
      try {
        const raw = getField(data.fields?.adsListJson);
        parsedAdsList = raw ? JSON.parse(raw) : [];
      } catch (ex) {
        parsedAdsList = [];
      }

      let parsedPopunder = { enabled: false, delay: 3, oncePerSession: false, oncePer24Hours: false, device: "all" };
      try {
        const raw = getField(data.fields?.popunderConfigJson);
        if (raw) parsedPopunder = JSON.parse(raw);
      } catch (ex) {}

      let parsedDirectLink = { url: "", trigger: "download_click" };
      try {
        const raw = getField(data.fields?.directLinkConfigJson);
        if (raw) parsedDirectLink = JSON.parse(raw);
      } catch (ex) {}

      let parsedSocialBar = { enabled: false, script: "" };
      try {
        const raw = getField(data.fields?.socialBarConfigJson);
        if (raw) parsedSocialBar = JSON.parse(raw);
      } catch (ex) {}

      res.json({
        botToken: getField(data.fields?.botToken) || "",
        ownerChatId: getField(data.fields?.ownerChatId) || "",
        requiredChannel: getField(data.fields?.requiredChannel) || "",
        requiredGroup: getField(data.fields?.requiredGroup) || "",
        storageChannel: getField(data.fields?.storageChannel) || "",
        referralCommissionRate: getField(data.fields?.referralCommissionRate) ?? 10,
        adsEnabled: getFieldBool(data.fields?.adsEnabled) || getField(data.fields?.adsEnabled) === true || getField(data.fields?.adsEnabled) === "true",
        adsScript: getField(data.fields?.adsScript) || "",
        adsPosition: getField(data.fields?.adsPosition) || "middle",
        adsList: parsedAdsList,
        popunderConfig: parsedPopunder,
        directLinkConfig: parsedDirectLink,
        socialBarConfig: parsedSocialBar,
      });
    } else if (fetchRes.status === 404) {
      res.json({
        botToken: "",
        ownerChatId: "",
        requiredChannel: "",
        requiredGroup: "",
        storageChannel: "",
        referralCommissionRate: 10,
        adsEnabled: false,
        adsScript: "",
        adsPosition: "middle",
        adsList: [],
        popunderConfig: { enabled: false, delay: 3, oncePerSession: false, oncePer24Hours: false, device: "all" },
        directLinkConfig: { url: "", trigger: "download_click" },
        socialBarConfig: { enabled: false, script: "" },
      });
    } else {
      const errText = await fetchRes.text();
      throw new Error(`Firestore REST error: ${fetchRes.status} ${errText}`);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/config/test", async (req, res) => {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config?key=${firebaseConfig.apiKey}`;
    const fetchRes = await fetch(url);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      res.json({ success: true, exists: true, data });
    } else {
      res.json({ success: true, exists: false, error: await fetchRes.text() });
    }
  } catch (err: any) {
    res.json({ success: false, error: err.message, code: err.code });
  }
});

app.get("/api/admin/diagnose", requireAdmin, async (req, res) => {
  let botTokenFirestore = false;
  let botTokenEnv = !!process.env.TELEGRAM_BOT_TOKEN;
  let currentToken = "";
  let tokenSource = "";

  if (process.env.TELEGRAM_BOT_TOKEN) {
    currentToken = process.env.TELEGRAM_BOT_TOKEN;
    tokenSource = "Environment";
    botTokenEnv = true;
  } else if ((firebaseConfig as any).botToken) {
    currentToken = (firebaseConfig as any).botToken;
    tokenSource = "Firebase Config";
  }

  try {
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config?key=${firebaseConfig.apiKey}`;
    const fetchRes = await fetch(url);

    if (fetchRes.ok) {
      const data = await fetchRes.json();
      if (
        data.fields &&
        data.fields.botToken &&
        data.fields.botToken.stringValue
      ) {
        botTokenFirestore = true;
        if (!currentToken) {
          currentToken = data.fields.botToken.stringValue;
          tokenSource = "Firestore";
        }
      }
    }
  } catch (err: any) {
    console.error("Diagnostic error checking firestore:", err);
  }

  let exactReason = "";
  if (!currentToken) {
    exactReason =
      "BOT_TOKEN is missing in both Firestore (settings/telegram_config) and environment variables.";
  }

  let getMeResponse = null;
  let webhookInfoResponse = null;
  let webhookActive = false;
  let apiError = "";

  if (currentToken) {
    try {
      const tempBot = new Telegraf(currentToken);
      getMeResponse = await tempBot.telegram.getMe();
      webhookInfoResponse = await tempBot.telegram.getWebhookInfo();

      if (webhookInfoResponse && webhookInfoResponse.url) {
        webhookActive = true;
      }
    } catch (e: any) {
      apiError = e.description || e.message;
      if (e.response && e.response.description) {
        apiError = e.response.description;
      }
    }
  }

  res.json({
    botTokenFirestore,
    botTokenEnv,
    loaded: !!currentToken,
    tokenSource,
    exactReason,
    getMeResponse,
    webhookInfoResponse,
    apiError,
    webhookActive,
  });
});

app.get("/api/admin/audit", requireAdmin, async (req, res) => {
  if (!bot || !currentBotToken) {
    return res.status(400).json({ error: "Bot not initialized." });
  }
  try {
    const me = await bot.telegram.getMe();
    const webhookInfo = await bot.telegram.getWebhookInfo();

    let testMessageResult = null;
    // Removed auto-reply to ownerChatId per user request.

    res.json({ me, webhookInfo, testMessageResult });
  } catch (error: any) {
    res.status(500).json({ error: error.description || error.message });
  }
});

let isSettingUpBot = false;

// Setup Telegraf instance
async function setupBot(token: string) {
  if (!token) return;
  if (isSettingUpBot) {
    console.log("SERVER BOOT: setupBot already in progress, skipping.");
    return;
  }
  isSettingUpBot = true;
  try {
    if (bot) {
      try {
        bot.stop("restarting api");
      } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    const sanitizedToken = token.trim();
    console.log(
      "SERVER BOOT: Sanitized Token:",
      sanitizedToken.substring(0, 5) +
        "..." +
        sanitizedToken.substring(sanitizedToken.length - 5),
    );

    const newBot = new Telegraf(sanitizedToken);

    // Verify token immediately
    try {
      console.log("SERVER BOOT: Verifying token with Telegram API...");
      const botInfo = await newBot.telegram.getMe();
      newBot.botInfo = botInfo; // Prevent handleUpdate from fetching again
      console.log(
        "SERVER BOOT: Token Verified! Bot username:",
        botInfo.username,
      );
    } catch (err: any) {
      console.error("SERVER BOOT: TOKEN VERIFICATION FAILED!");
      console.error("Error Message:", err.message);
      if (err.response) {
        console.error("Response:", JSON.stringify(err.response.data));
      }
      return; // DO NOT process.exit(1) on boot or hot reload, just skip
    }

    const blockCache = new Map<string, { blocked: boolean, reason: string, time: number }>();
    const memCache = new Map<number, { isChannel: boolean, isGroup: boolean, time: number }>();
    const finCache = new Map<string, { data: any, time: number }>();

    newBot.use(async (ctx: any, next) => {
      const perfData = {
          start: Date.now(),
          dbReadTime: 0,
          dbWriteTime: 0,
          tgTime: 0
      };

      return perfStorage.run(perfData, async () => {
        const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
        lastTelegramUpdate = new Date().toISOString();
        
        console.log(`UPDATE_RECEIVED`);
        if (ctx.updateType === "callback_query") {
            console.log(`CALLBACK_RECEIVED`);
        } else if (ctx.updateType === "message") {
            console.log(`MESSAGE_RECEIVED`);
        }
        
        const originalCallApi = ctx.telegram.callApi.bind(ctx.telegram);
        ctx.telegram.callApi = async (method: string, payload: any, { signal }: any = {}) => {
            const t0 = Date.now();
            try {
                return await originalCallApi(method, payload, { signal });
            } finally {
                const elapsed = Date.now() - t0;
                perfData.tgTime += elapsed;
            }
        };
        
        // Global block check
        if (ctx.from) {
          try {
              const userId = String(ctx.from.id);
              let isBlocked = false;
              let blockReason = "Violation of terms";
              
              if (blockCache.has(userId)) {
                  const cached = blockCache.get(userId)!;
                  if (Date.now() - cached.time < 60000) {
                      isBlocked = cached.blocked;
                      blockReason = cached.reason || blockReason;
                  } else {
                      blockCache.delete(userId);
                  }
              }
              
              if (!blockCache.has(userId)) {
                  const userDoc = await restGetDoc("users_meta", userId);
                  isBlocked = !!(userDoc && userDoc.isBlocked);
                  if (isBlocked) blockReason = userDoc.blockReason || blockReason;
                  blockCache.set(userId, { blocked: isBlocked, reason: blockReason, time: Date.now() });
              }

              if (isBlocked) {
                  if (ctx.callbackQuery) {
                      await ctx.answerCbQuery();
                  }
                  await ctx.reply(`🚫 Your account has been blocked.\n\nReason:\n${blockReason}\n\nIf you believe this is a mistake, contact support.`);
                  return; // Do not call next(), completely stop processing
              }
          } catch (e) {
              // DB error, fail open
          }
        }

        const tStart = Date.now();
        console.log(`\n--- START request ${text || ctx.updateType} ---`);
        
        try {
            await next();
            console.log(`HANDLER_EXECUTED`);
        } catch (err: any) {
            lastHandlerError = err.message || "Unknown handler error";
            lastTelegramError = lastHandlerError;
            console.error("Middleware caught handler error:", err);
        } finally {
            const total = Date.now() - tStart;
            const logLine = `\n--- START request ${text || ctx.updateType} ---\nFirestore read time: ${perfData.dbReadTime}ms\nFirestore write time: ${perfData.dbWriteTime}ms\nTelegram sendMessage time: ${perfData.tgTime}ms\nTotal handler time: ${total}ms\n-----------------------------------\n`;
            console.log(logLine);
            fs.appendFileSync('perf.log', logLine);
        }
      });
    });

    async function verifyUserMembership(
      ctx: any,
      userId: number,
    ): Promise<void> {
      let isChannelMember = true;
      let isGroupMember = true;

      const cached = memCache.get(userId);
      if (cached && Date.now() - cached.time < 30000) {
        isChannelMember = cached.isChannel;
        isGroupMember = cached.isGroup;
      } else {
        const checks = [];
        if (requiredChannel) {
          checks.push(
            newBot.telegram.getChatMember(requiredChannel, userId)
              .then(member => ["creator", "administrator", "member"].includes(member.status))
              .catch(err => {
                console.error("Channel check failed", err.description || err);
                return false;
              })
              .then(res => isChannelMember = res)
          );
        }
        
        if (requiredGroup) {
          checks.push(
            newBot.telegram.getChatMember(requiredGroup, userId)
              .then(member => ["creator", "administrator", "member"].includes(member.status))
              .catch(err => {
                console.error("Group check failed", err.description || err);
                return false;
              })
              .then(res => isGroupMember = res)
          );
        }

        await Promise.all(checks);
        memCache.set(userId, { isChannel: isChannelMember, isGroup: isGroupMember, time: Date.now() });
      }

      if (isChannelMember && isGroupMember) {
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery("✅ Verification successful");
        }

        let standardReply = true;
        try {
          const userIdStr = String(userId);
          const referredDoc = await restGetDoc("referred_users", userIdStr);
          if (referredDoc && referredDoc.status === "pending") {
            const referrerId = referredDoc.referrerId;

            // Mark as active
            referredDoc.status = "active";
            await restSetDoc("referred_users", userIdStr, referredDoc);

            // Fetch referrer info
            const referrerInfo = await newBot.telegram
              .getChat(referrerId)
              .catch(() => null);
            let refName = "Unknown";
            let refUser = "Unknown";
            if (referrerInfo) {
              refName =
                [referrerInfo.first_name, referrerInfo.last_name]
                  .filter(Boolean)
                  .join(" ") || "Unknown";
              refUser = referrerInfo.username || "Unknown";
            }
            // Send confirmation to new user
            await ctx.reply(
              `🎉 Registration Successful\n\nYou joined using:\n\nReferrer Name: ${refName}\n\nUsername: @${refUser}\n\nContinue to Dashboard`,
            );
            standardReply = false;

            // Notify referrer
            let newUserName = "Unknown";
            let newUserUsername = "Unknown";
            let joinDate = new Date().toLocaleDateString("en-GB");

            if (referrerId) {
              newUserName =
                [ctx.from.first_name, ctx.from.last_name]
                  .filter(Boolean)
                  .join(" ") || "Unknown";
              newUserUsername = ctx.from.username || "Unknown";
              joinDate = new Date().toLocaleDateString("en-GB"); // DD/MM/YYYY
              try {
                await newBot.telegram.sendMessage(
                  referrerId,
                  `🎉 New Referral Joined\n\nName: ${newUserName}\n\nUsername: @${newUserUsername}\n\nJoin Date: ${joinDate}\n\nReferral Status: Active`,
                );
              } catch (e: any) {
                console.error("Failed to send referral msg:", e.message);
              }
            }

            // Update referrer stats
            const refDoc = (await restGetDoc("referrals", referrerId)) || {};
            refDoc.totalReferrals = (refDoc.totalReferrals || 0) + 1;
            refDoc.activeReferrals = (refDoc.activeReferrals || 0) + 1;

            refDoc.recentReferrals = refDoc.recentReferrals || [];
            refDoc.recentReferrals.unshift({
              name: newUserName,
              username: newUserUsername,
              joinDate: joinDate,
              status: "Active",
            });
            if (refDoc.recentReferrals.length > 10)
              refDoc.recentReferrals = refDoc.recentReferrals.slice(0, 10);
            await restSetDoc("referrals", referrerId, refDoc);
          }
        } catch (e) {
          console.error("Verification referral error", e);
        }

        if (standardReply) {
          await ctx.reply("✅ Verification successful");
        }
        await showMainMenu(ctx);
      } else {
        const buttons = [
          [
            Markup.button.url(
              "📢 Join Channel",
              `https://t.me/${requiredChannel.replace("@", "")}`,
            ),
          ],
          [
            Markup.button.url(
              "👥 Join Group",
              `https://t.me/${requiredGroup.replace("@", "")}`,
            ),
          ],
          [Markup.button.callback("✅ Verify Membership", "check_membership")],
        ];

        if (ctx.callbackQuery) {
          await ctx.answerCbQuery("⚠️ Not joined", { show_alert: true });
        }
        await ctx.reply(
          `⚠️ You must join both channel and group first.\n\nChannel: ${requiredChannel}\nGroup: ${requiredGroup}`,
          Markup.inlineKeyboard(buttons),
        );
      }
    }

    // Command: /start
    newBot.use(async (ctx: any, next: any) => {
      lastTelegramUpdate = new Date().toISOString();
      if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
         lastCommandReceived = ctx.message.text.split(" ")[0];
      }
      if (ctx.from) {
         lastUserId = String(ctx.from.id);
      }
      if (ctx.chat) {
         lastChatId = String(ctx.chat.id);
      }
      // Update webhook counters so admin ui sees the events!
      webhookHitCount++;
      lastReceivedUpdate = ctx.update;
      return next();
    });

    newBot.command("start", async (ctx) => {
      lastHandlerExecuted = "/start handler";
      console.log("Matched Handler: /start");

      const payload = ctx.message.text.split(" ")[1];
      const userIdStr = String(ctx.from.id);
      
      const [userDocOpt, alreadyReferredOpt] = await Promise.all([
        restGetDoc("users", userIdStr).catch(() => null),
        payload && payload !== userIdStr ? restGetDoc("referred_users", userIdStr).catch(() => null) : Promise.resolve(null)
      ]);

      let isVerified = false;
      try {
        let userDoc = userDocOpt;
        if (!userDoc) {
          userDoc = {
            telegramId: userIdStr,
            username: ctx.from.username || "",
            firstName: ctx.from.first_name || "",
            verified: false,
            joinedAt: new Date().toISOString(),
          };
          await restSetDoc("users", userIdStr, userDoc);
        } else {
          isVerified = !!userDoc.verified;
        }
      } catch (err: any) {
        console.error("Failed to load user doc:", err.message);
      }

      if (payload) {
        if (payload === "withdraw_success") {
           await showMainMenu(ctx);
           return;
        }
        
        if (payload.startsWith("dl_")) {
          const fileId = payload.substring(3);
          try {
             const data = await restGetDoc("files", fileId);
             if (data && data.telegramFileId) {
                const mimeType = data.mimeType || "application/octet-stream";
                let sent = false;
                
                try {
                    if (data.fileType === "video" || mimeType.startsWith("video/")) {
                        await ctx.replyWithVideo(data.telegramFileId, { caption: data.fileName });
                        sent = true;
                    } else if (data.fileType === "photo" || mimeType.startsWith("image/")) {
                        await ctx.replyWithPhoto(data.telegramFileId, { caption: data.fileName });
                        sent = true;
                    } else if (data.fileType === "audio" || mimeType.startsWith("audio/")) {
                        await ctx.replyWithAudio(data.telegramFileId, { caption: data.fileName });
                        sent = true;
                    } 
                } catch(e) {
                    console.error("Failed typed reply, falling back to document", e);
                }
                
                if (!sent) {
                    await ctx.replyWithDocument(data.telegramFileId, { caption: data.fileName });
                }
             } else {
                await ctx.reply("❌ File not found or has expired.");
             }
          } catch(e) {
             console.error("Error sending file via start chunk", e);
             await ctx.reply("❌ Error fetching file.");
          }
          await showMainMenu(ctx);
          return;
        }
        
        try {
          if (payload !== userIdStr) {
            const alreadyReferred = alreadyReferredOpt;
            if (!alreadyReferred) {
              await restSetDoc("referred_users", userIdStr, {
                referrerId: payload,
                status: "pending",
                joinDate: new Date().toISOString(),
              });
              // We do NOT update the active referrals count or reward here yet.
            }
          }
        } catch (e) {
          console.error("Referral logic error", e);
        }
      }

      if (isVerified) {
        await showMainMenu(ctx);
        return;
      }

      try {
        if (ctx.chat.type === "private") {
          await ctx.reply(
            "Bot Online! Welcome! Please share your contact to continue.",
            Markup.keyboard([[Markup.button.contactRequest("📱 Share Contact")]])
              .oneTime()
              .resize(),
          );
        } else {
          await ctx.reply("Bot Online! Welcome to the bot!");
        }
      } catch (e: any) {
        if (!e.message.includes("chat not found")) {
          console.error("Failed to send contact request:", e.message);
        }
      }
    });

    // Handle Contact
    newBot.on("contact", async (ctx) => {
      lastHandlerExecuted = "contact handler";
      console.log("Matched Handler: contact");
      
      const userIdStr = String(ctx.from.id);
      try {
        let userDoc = await restGetDoc("users", userIdStr);
        if (!userDoc) {
          userDoc = {
            telegramId: userIdStr,
            username: ctx.from.username || "",
            firstName: ctx.from.first_name || "",
            verified: true,
            verificationDate: new Date().toISOString()
          };
        } else {
          userDoc.verified = true;
          userDoc.verificationDate = userDoc.verificationDate || new Date().toISOString();
        }
        await restSetDoc("users", userIdStr, userDoc);
        
        await ctx.reply("✅ Contact verified successfully!", Markup.removeKeyboard());
        await verifyUserMembership(ctx, ctx.from.id);
      } catch (err: any) {
        console.error("Contact handler error:", err.message);
      }
    });

    // Command: /help
    newBot.command("help", async (ctx) => {
      lastHandlerExecuted = "/help handler";
      console.log("Matched Handler: /help");
      try {
        await ctx.reply("Need help? Join our support group!");
      } catch (e: any) {}
    });

    // Command: /test
    newBot.command("test", async (ctx) => {
      lastHandlerExecuted = "/test handler";
      console.log("Matched Handler: /test");
      try {
        await ctx.reply("Test successful!");
      } catch (e: any) {}
    });

    // Command: /menu
    newBot.command("menu", async (ctx) => {
      lastHandlerExecuted = "/menu handler";
      console.log("Matched Handler: /menu");
      await verifyUserMembership(ctx, ctx.from.id);
    });

    async function getUserFinancials(userIdStr: string) {
      console.log(`[DATABASE] Database query executed for user ${userIdStr}`);
      if (finCache.has(userIdStr)) {
          const cached = finCache.get(userIdStr)!;
          if (Date.now() - cached.time < 10000) {
              return cached.data;
          }
      }
      const [files, refDoc, userDoc, withdrawals] = await Promise.all([
        restQueryUserId("files", userIdStr).catch(() => [] as any[]),
        restGetDoc("referrals", userIdStr).catch(() => null),
        restGetDoc("users_meta", userIdStr).catch(() => null),
        restQueryUserId("withdraw_requests", userIdStr, "userId").catch(() => [] as any[])
      ]);

      const fileEarnings = files.reduce(
        (acc: number, f: any) => acc + (f.earnings || 0),
        0,
      );

      let referralEarnings = 0;
      if (refDoc && refDoc.earnings) referralEarnings = refDoc.earnings;
      
      let manualAdjustments = 0;
      if (userDoc && userDoc.balanceAdjustment) {
          manualAdjustments = userDoc.balanceAdjustment;
      }

      let withdrawn = 0;
      let pendingWithdraw = 0;
      for (const w of withdrawals) {
        if (w.status === "approved") withdrawn += w.amount || 0;
        if (w.status === "pending") pendingWithdraw += w.amount || 0;
      }

      const totalEarnings = fileEarnings + referralEarnings + manualAdjustments;
      const balance = totalEarnings - withdrawn - pendingWithdraw;
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
      };
      finCache.set(userIdStr, { data: result, time: Date.now() });
      return result;
    }

    async function handleAccount(ctx: any) {
      lastHandlerExecuted = "Account handler";
      try {
        const userId = String(ctx.from.id);
        const fin = await getUserFinancials(userId);
        const results = fin.files;

        let totalUploads = results.length;
        let totalDownloads = 0;
        let joinDateObj = new Date();

        if (totalUploads > 0) {
          totalDownloads = results.reduce(
            (acc: number, file: any) => acc + (file.downloads || 0),
            0,
          );

          const earliestFile = results.reduce((earliest: any, cur: any) => {
            if (!earliest.uploadDate) return cur;
            if (!cur.uploadDate) return earliest;
            return new Date(cur.uploadDate) < new Date(earliest.uploadDate)
              ? cur
              : earliest;
          }, results[0]);

          if (earliestFile && earliestFile.uploadDate) {
            joinDateObj = new Date(earliestFile.uploadDate);
          }
        }

        const joinDateStr =
          totalUploads > 0 ? joinDateObj.toLocaleDateString() : "N/A";
        const username = ctx.from.username
          ? `@${ctx.from.username}`
          : ctx.from.first_name || "User";
        const safeUsername = username.replace(/([_*`\[])/g, "\\$1");

        const accountMsg = `👤 *Account Page*\n\n*Telegram ID:* \`${ctx.from.id}\`\n*Username:* ${safeUsername}\n*Join Date:* ${joinDateStr}\n\n*Total Uploads:* ${totalUploads}\n*Total Downloads:* ${totalDownloads}\n*Total Earnings:* ₹${fin.totalEarnings.toFixed(2)}`;

        await ctx.reply(accountMsg, { parse_mode: "Markdown" });
      } catch (err: any) {
        console.error("Account handler error:", err);
        await ctx.reply("Failed to load account details.");
      }
    }

    // Command: /account
    newBot.command("account", handleAccount);

    async function handleBalance(ctx: any) {
      lastHandlerExecuted = "Balance handler";
      const userId = String(ctx.from.id);
      try {
        const fin = await getUserFinancials(userId);
        const msg = `💰 *Balance Overview*\n\n*Available Balance:* ₹${fin.balance.toFixed(2)}\n*Total Earnings:* ₹${fin.totalEarnings.toFixed(2)}\n*Pending Withdrawal:* ₹${fin.pendingWithdraw.toFixed(2)}\n*Total Withdrawn:* ₹${fin.withdrawn.toFixed(2)}`;
        await ctx.reply(msg, { parse_mode: "Markdown" });
      } catch (err: any) {
        console.error("Balance error", err);
        await ctx.reply("Failed to load balance.");
      }
    }

    // Command: /balance
    newBot.command("balance", handleBalance);

    // Handle callbacks
    newBot.action("withdraw_continue", async (ctx: any) => {
      try {
      lastHandlerExecuted = "withdraw_continue callback";
      const userId = String(ctx.from.id);
      
      withdrawStates.set(userId, { step: "awaiting_upi" });
      await ctx.answerCbQuery();
      await ctx.reply("Enter your UPI ID:\n\nExample:\nroynorules@upi");
      } catch (err: any) { logError(err); }
    });

    newBot.action("withdraw_cancel", async (ctx: any) => {
      try {
      const userId = String(ctx.from.id);
      withdrawStates.delete(userId);
      await ctx.answerCbQuery("Withdrawal cancelled");
      await ctx.reply("Withdrawal cancelled.");
      } catch (err: any) { logError(err); }
    });

    newBot.action("withdraw_submit", async (ctx: any) => {
      const userId = String(ctx.from.id);
      
      const state = withdrawStates.get(userId);
      if (!state || state.step !== "confirm") {
        await ctx.answerCbQuery();
        return ctx.reply("Withdrawal session expired. Please start again.");
      }

      try {
        const fin = await getUserFinancials(userId);

        const sortedWithdrawals = fin.withdrawals.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const latestReq = sortedWithdrawals[0];
        const cycleStart = getCycleStartTime();
        
        if (latestReq && new Date(latestReq.createdAt) > cycleStart) {
          withdrawStates.delete(userId);
          await ctx.answerCbQuery();
          return ctx.reply("❌ You have already submitted a withdrawal request for this cycle. Only 1 request allowed per day.");
        }

        if (state.amount > fin.balance) {
          withdrawStates.delete(userId);
          await ctx.answerCbQuery();
          return ctx.reply(
            `Insufficient balance. Your available balance is ₹${fin.balance.toFixed(2)}.\n\nWithdrawal cancelled.`,
          );
        }

        const requestId = `req_${Date.now()}_${userId}`;
        const username = ctx.from.username
          ? `@${ctx.from.username}`
          : ctx.from.first_name || "User";

        await restSetDoc("withdraw_requests", requestId, {
          userId,
          username,
          amount: state.amount,
          upiId: state.upiId,
          status: "pending",
          createdAt: new Date().toISOString(),
        });

        withdrawStates.delete(userId);
        await ctx.answerCbQuery("Request submitted");
        await ctx.reply(
          `✅ Withdrawal Request Submitted\n\nAmount: ₹${state.amount.toFixed(2)}\nUPI ID: ${state.upiId}\nStatus: Pending Review\n\nPlease wait up to 24 hours for approval.`,
        );
      } catch (err: any) {
        logError(err);
        await ctx.answerCbQuery();
        await ctx.reply("Failed to submit withdrawal request.");
      }
    });

    newBot.action("copy_ref_link", async (ctx: any) => {
      try {
      lastHandlerExecuted = "copy_ref_link callback";
      await ctx.answerCbQuery("Referral link generated");
      const refLink = `${APP_URL}/r/${ctx.from.id}`;
      await ctx.reply(
        `✅ Referral link copied successfully.\n\nYour Referral Link:\n\`${APP_URL}/r/${ctx.from.id}\``,
        { parse_mode: "Markdown" },
      );
      } catch (err: any) { logError(err); }
    });

    newBot.action("check_membership", async (ctx: any) => {
      try {
      lastHandlerExecuted = "check_membership callback";
      await verifyUserMembership(ctx, ctx.from.id);
      } catch (err: any) { logError(err); }
    });

    // File Upload Handler
    newBot.on(["document", "photo", "video"], async (ctx: any) => {
      try {
        lastHandlerExecuted = "File upload handler";
        console.log(`FILE_UPLOAD_RECEIVED: update_id=${ctx.update.update_id}`);
        await handleFileUpload(ctx);
      } catch (err: any) { logError(err); }
    });

    newBot.action("skip_name", async (ctx: any) => {
      try {
        lastHandlerExecuted = "skip_name callback";
        await ctx.answerCbQuery();
        const uploadState = pendingUploads.get(ctx.from.id);
        if (!uploadState || uploadState.step !== "awaiting_name") {
            return ctx.reply("Upload session expired. Please start again.");
        }
        
        uploadState.step = "awaiting_expiry";
        pendingUploads.set(ctx.from.id, uploadState);

        const progressMsg = await ctx.reply("📤 Uploading File...\n▓▓▓▓▓░░░░░ 50%");
           
        await new Promise(res => setTimeout(res, 1000));
        try {
            await ctx.telegram.editMessageText(
               progressMsg.chat.id, 
               progressMsg.message_id, 
               undefined, 
               "📤 Uploading File...\n▓▓▓▓▓▓▓▓▓▓ 100%"
            );
            await ctx.reply(
              `Please select expiry period:`,
              Markup.inlineKeyboard([
                [Markup.button.callback("7 Days", `expiry_7`)],
                [Markup.button.callback("15 Days", `expiry_15`)],
                [Markup.button.callback("30 Days", `expiry_30`)],
              ]),
            );
        } catch(e) {}
      } catch (err: any) { logError(err); }
    });

    newBot.action(/expiry_(\d+)/, async (ctx: any) => {
      lastHandlerExecuted = "expiry callback";
      const match = ctx.match;
      const expiryDays = parseInt(match[1]);
      const fileInfo = pendingUploads.get(ctx.from.id);

      if (!fileInfo) {
        console.error(
          "expiry callback: missing fileInfo for user",
          ctx.from.id,
        );
        await ctx.answerCbQuery(
          "Error: File information expired. Please resend the file.",
        );
        return;
      }

      const { fileId, fileUniqueId, mimeType, fileName, fileSize, messageId, fileType } = fileInfo;
      console.log(`upload_complete for memory info`);

      await ctx.answerCbQuery("Uploading...");
      try {
        const newFileId = `file_${Date.now()}`;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        let telegramMessageId = messageId!;
        if (storageChannel) {
          console.log(`storage_channel_send_start to ${storageChannel}`);
          try {
            const copied = await bot!.telegram.copyMessage(
              storageChannel,
              ctx.chat.id,
              messageId!,
            );
            console.log(`storage_channel_send_complete`);
            telegramMessageId = copied.message_id;
          } catch (e: any) {
            console.error(`storage_channel_upload_failed: ${e.message}`);
          }
        } else {
          console.log("No storage channel configured. Reusing messageId directly.");
        }

        console.log(`firestore_save_start for file ${newFileId}`);

        try {
          await restSetDoc("files", newFileId, {
            fileId: newFileId,
            telegramFileId: fileId,
            fileUniqueId: fileUniqueId || "",
            mimeType: mimeType || "",
            fileType: fileType || "",
            telegramMessageId: telegramMessageId,
            uploaderId: String(ctx.from.id),
            fileName: fileName,
            fileSize: fileSize,
            uploadDate: new Date().toISOString(),
            expiryDate: expiryDate.toISOString(),
            downloads: 0,
            earnings: 0,
          });
          console.log(`firestore_save_complete`);
        } catch (setErr: any) {
          console.error("expiry callback: FAILED setDoc. Error:", setErr);
          throw setErr;
        }

        const fileUrl = `${APP_URL}/file/${newFileId}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(fileUrl)}`;
        await ctx.reply(
          `✅ File Uploaded Successfully\n\nFile Name: ${fileName}\nFile Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\nExpiry: ${expiryDays} Days`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "⬇️ Download File", url: fileUrl },
                  { text: "📋 Copy Link", callback_data: `copy_${newFileId}` },
                ],
                [{ text: "📤 Share Link", url: shareUrl }],
              ],
            },
          },
        );
      } catch (err: any) {
        console.error("Upload failed", err);
        await ctx.reply(`Upload failed: ${err.message || "Unknown error"}`);
        await ctx.answerCbQuery("Upload failed");
      }
    });

    // Menu Button Handlers
    function withTiming(name: string, handler: (ctx: any) => Promise<any> | void) {
      return async (ctx: any) => {
        const start = Date.now();
        console.log(`${name}_START`);
        console.log(`[EVENT] Received event: ${name}`);
        
        let responseSent = false;
        if (ctx.reply) {
            const originalReply = ctx.reply.bind(ctx);
            ctx.reply = async (...args: any[]) => {
                const res = await originalReply(...args);
                console.log(`[RESPONSE] Response sent for ${name}`);
                responseSent = true;
                return res;
            };
        }
        
        try {
          await handler(ctx);
        } catch(err: any) {
          console.error(`[ERROR] ${name} handler error:`, err);
          logError(`${name} handler error: ` + (err.message || err));
        } finally {
          const ms = Date.now() - start;
          console.log(`${name}_END`);
          console.log(`TIME=${ms}ms`);
        }
      };
    }

    newBot.hears(/👤\s*Account/i, withTiming('ACCOUNT_CLICK', async (ctx) => {
      console.log("button_account_clicked");
      await handleAccount(ctx);
    }));
    newBot.hears(/💰\s*Balance/i, withTiming('BALANCE_CLICK', async (ctx) => {
      console.log("button_balance_clicked");
      await handleBalance(ctx);
    }));
    function getCycleStartTime() {
      const now = new Date();
      // UTC to IST is +5:30
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

      const year = istTime.getUTCFullYear();
      const month = istTime.getUTCMonth();
      let date = istTime.getUTCDate();
      const hours = istTime.getUTCHours();

      // Cycle resets at 10:00 AM IST daily
      if (hours < 10) {
        date -= 1;
      }

      // 10:00 AM IST is 4:30 AM UTC
      const cycleStartUTC = new Date(Date.UTC(year, month, date, 4, 30, 0, 0));
      return cycleStartUTC;
    }

    newBot.hears(/💸\s*Withdraw/i, withTiming('WITHDRAW_CLICK', async (ctx) => {
      console.log("button_withdraw_clicked");
      lastHandlerExecuted = "Withdraw menu handler";
      const userId = String(ctx.from.id);
      const fin = await getUserFinancials(userId);

      const pendingReq = fin.withdrawals.find(
          (w: any) => w.status === "pending",
        );
        if (pendingReq) {
          const reqDate = pendingReq.createdAt
            ? new Date(pendingReq.createdAt).toLocaleDateString("en-GB")
            : "N/A";
          return ctx.reply(
            `⏳ *Withdrawal Pending*\n\nAmount: ₹${pendingReq.amount.toFixed(2)}\n\nUPI ID: \`${pendingReq.upiId}\`\n\nRequest Date: ${reqDate}`,
            { parse_mode: "Markdown" },
          );
        }

        const sortedWithdrawals = fin.withdrawals.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const latestReq = sortedWithdrawals[0];
        const cycleStart = getCycleStartTime();

        if (latestReq && new Date(latestReq.createdAt) > cycleStart) {
          const reqDate = latestReq.updatedAt
            ? new Date(latestReq.updatedAt).toLocaleDateString("en-GB")
            : new Date(latestReq.createdAt).toLocaleDateString("en-GB");
          if (latestReq.status === "approved") {
            return ctx.reply(
              `✅ *Withdrawal Approved*\n\nAmount: ₹${latestReq.amount.toFixed(2)}\n\nPayment Sent Successfully\n\nApproval Date: ${reqDate}`,
              { parse_mode: "Markdown" },
            );
          } else if (latestReq.status === "rejected") {
            const rejectTime = latestReq.rejectedAt
              ? new Date(latestReq.rejectedAt).toLocaleString("en-GB")
              : new Date(latestReq.createdAt).toLocaleString("en-GB");
            return ctx.reply(
              `❌ *Withdrawal Rejected*\n\nAmount: ₹${latestReq.amount.toFixed(2)}\n\nReason:\n${latestReq.reason || "Invalid details"}\n\nRejection Date & Time: ${rejectTime}\n\nBalance Refunded Successfully`,
              { parse_mode: "Markdown" },
            );
          }
        }

        await ctx.reply(
          `💸 *Withdrawal Notice*\n\nMinimum Withdrawal: ₹10\n\nMaximum Withdrawal: ₹500\n\nOnly 1 Withdrawal Request Allowed Per Day\n\nInvalid UPI may cause rejection\n\nRejected withdrawals are refunded\n\nReview Time: Up To 24 Hours`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Continue", callback_data: "withdraw_continue" }],
              ],
            },
          },
        );
      // Removed catch block because withTiming handles it
    }));
    newBot.hears(/📁\s*Upload\s*File/i, withTiming('UPLOAD_CLICK', async (ctx) => {
      console.log("button_upload_clicked");
      lastHandlerExecuted = "Upload File handler";
      await ctx.reply(
        "Please send the file you want to upload. I support PDF, ZIP, APK, MP4, JPG, PNG, DOCX, XLSX.",
      );
    }));

    async function handleFileUpload(ctx: any) {
      const message = ctx.message;
      const userId = String(ctx.from.id);

      // Detailed logging
      console.log(`upload_start`);
      console.log(`FILE_UPLOAD_RECEIVED: message=${JSON.stringify(message)}`);

      let fileId = "";
      let fileName = "file";
      let fileSize = 0;
      let fileType = "";

      let fileUniqueId = "";
      let mimeType = "";

      if (message.document) {
        fileType = "document";
        fileId = message.document.file_id;
        fileUniqueId = message.document.file_unique_id || "";
        fileName = message.document.file_name || "document";
        fileSize = message.document.file_size || 0;
        mimeType = message.document.mime_type || "application/octet-stream";
      } else if (message.photo) {
        fileType = "photo";
        const photo = message.photo[message.photo.length - 1];
        fileId = photo.file_id;
        fileUniqueId = photo.file_unique_id || "";
        fileName = `photo_${Date.now()}.jpg`;
        fileSize = photo.file_size || 0;
        mimeType = "image/jpeg";
      } else if (message.video) {
        fileType = "video";
        fileId = message.video.file_id;
        fileUniqueId = message.video.file_unique_id || "";
        fileName = message.video.file_name || `video_${Date.now()}.mp4`;
        fileSize = message.video.file_size || 0;
        mimeType = message.video.mime_type || "video/mp4";
      } else if (message.audio) {
        fileType = "audio";
        fileId = message.audio.file_id;
        fileUniqueId = message.audio.file_unique_id || "";
        fileName = message.audio.file_name || `audio_${Date.now()}.mp3`;
        fileSize = message.audio.file_size || 0;
        mimeType = message.audio.mime_type || "audio/mp3";
      } else {
        console.warn("FILE_UPLOAD_UNSUPPORTED");
        await ctx.reply("Unsupported file type.");
        return;
      }

      console.log(
        `FILE_DETAILS: type=${fileType}, name=${fileName}, size=${fileSize}, id=${fileId}`,
      );

      try {
        await ctx.reply(`✅ File received
File Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        pendingUploads.set(ctx.from.id, {
          fileId,
          fileUniqueId,
          mimeType,
          fileName,
          fileSize,
          messageId: message.message_id,
          fileType,
          step: "awaiting_name",
        });

        await ctx.reply("Please enter a file name for your upload.", Markup.inlineKeyboard([
          [Markup.button.callback("Use Original Name", "skip_name")]
        ]));
      } catch (err: any) {
        console.error("FILE_UPLOAD_RESPONSE_FAILED", err);
        await ctx.reply(`Error acknowledging file: ${err.message}`);
      }
    }

    newBot.hears(/📊\s*My\s*Files/i, withTiming('MYFILES_CLICK', async (ctx: any) => {
      console.log("button_myfiles_clicked");
      lastHandlerExecuted = "My Files handler";
      const userId = String(ctx.from.id);
      const results = await restQueryUserId("files", userId);
      if (results.length === 0) {
        await ctx.reply("No files uploaded yet.");
        return;
      }

      await ctx.reply(`📊 *My Files Page*\nHere are your uploaded files:`, {
        parse_mode: "Markdown",
      });

        for (const data of results) {
          const url = `${APP_URL}/file/${data.fileId}`;
          const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}`;
          // We use Markdown to display the file details
          const safeFileName = data.fileName
            ? data.fileName.replace(/([_*`\[])/g, "\\$1")
            : "Unknown";
          const fileMsg = `📄 *File Name:* ${safeFileName}\n*Upload Date:* ${data.uploadDate ? new Date(data.uploadDate).toLocaleDateString() : "N/A"}\n*Expiry Date:* ${data.expiryDate ? new Date(data.expiryDate).toLocaleDateString() : "N/A"}\n*Download Count:* ${data.downloads || 0}`;

          await ctx.reply(fileMsg, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "⬇️ Download", url: url },
                  {
                    text: "📋 Copy Link",
                    callback_data: `copy_${data.fileId}`,
                  },
                ],
                [
                  { text: "📤 Share", url: shareUrl },
                  {
                    text: "🗑 Delete File",
                    callback_data: `delete_${data.fileId}`,
                  },
                ],
              ],
            },
          });
        }
    }));

    // Analytics and Delete handlers
    newBot.action(/copy_([a-zA-Z0-9_\-]+)/, async (ctx) => {
      try {
      const fileId = ctx.match[1];
      const fileUrl = `${APP_URL}/file/${fileId}`;
      await ctx.answerCbQuery("Link generated");
      await ctx.reply(`Download Link:\n${fileUrl}`);
      } catch (err: any) { logError(err); }
    });

    newBot.action(/analytics_([a-zA-Z0-9_\-]+)/, async (ctx) => {
      try {
      const fileId = ctx.match[1];
      const fileData = await restGetDoc("files", fileId);
      if (!fileData) return ctx.reply("File not found");
      await ctx.reply(
        `📊 Analytics for ${fileData.fileName}:\nTotal Downloads: ${fileData.downloads}\nTotal Earnings: $${(fileData.earnings || 0).toFixed(2)}`,
      );
      } catch (err: any) { logError(err); }
    });

    newBot.action(/delete_([a-zA-Z0-9_\-]+)/, async (ctx) => {
      try {
      const fileId = ctx.match[1];
      await restDeleteDoc("files", fileId);
      await ctx.answerCbQuery("File deleted");
      await ctx.reply("File deleted successfully.");
      } catch (err: any) { logError(err); }
    });
    function renderHistoryPage(withdrawals: any[], files: any[], page: number) {
      let msg = `📜 *Your Account History*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `🏦 *Withdrawal History*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (withdrawals.length === 0) {
        msg += `No withdrawals yet.\n\n`;
      } else {
        const w = withdrawals[page];
        if (w) {
          const statusStr = w.status
            ? w.status.charAt(0).toUpperCase() + w.status.slice(1)
            : "Pending";
          const dateStr = w.createdAt
            ? new Date(w.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A";
          const safeUpi = w.upiId
            ? w.upiId.replace(/([_*`\[])/g, "\\$1")
            : "N/A";
          const txnId = w.id || w.requestId || "N/A";

          msg += `Status: ${statusStr}\n`;
          msg += `Amount: ₹${w.amount}\n`;
          msg += `UPI ID: ${safeUpi}\n`;
          msg += `Date: ${dateStr}\n`;
          if (txnId !== "N/A") {
            msg += `Transaction ID: ${txnId.replace(/([_*`\[])/g, "\\$1")}\n\n`;
          } else {
            msg += `\n`;
          }
        } else {
          msg += `No withdrawal record on this page.\n\n`;
        }
      }

      msg += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      msg += `📂 *Upload & Earnings History*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (files.length === 0) {
        msg += `No upload history found.\n\n`;
      } else {
        const f = files[page];
        if (f) {
          const safeFileName = f.fileName
            ? f.fileName.replace(/([_*`\[])/g, "\\$1")
            : "Unknown";
          const uploadDateStr = f.uploadDate
            ? new Date(f.uploadDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A";
          const expiryDateStr = f.expiryDate
            ? new Date(f.expiryDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A";
          const isExpired = f.expiryDate && new Date() > new Date(f.expiryDate);
          const statusStr = isExpired ? "Expired" : "Active";

          msg += `File Name:\n${safeFileName}\n\n`;
          msg += `Upload Date:\n${uploadDateStr}\n\n`;
          msg += `Downloads:\n${f.downloads || 0}\n\n`;
          msg += `Earnings:\n₹${(f.earnings || 0).toFixed(2)}\n\n`;
          msg += `Status:\n${statusStr}\n\n`;
          msg += `Expiry:\n${expiryDateStr}\n\n`;
        } else {
          msg += `No upload record on this page.\n\n`;
        }
      }

      msg += `━━━━━━━━━━━━━━━━━━━━━━`;
      return msg;
    }

    newBot.hears(/📜\s*History/i, withTiming('HISTORY_CLICK', async (ctx) => {
      console.log("button_history_clicked");
      lastHandlerExecuted = "History handler";
      const userId = String(ctx.from.id);
      const fin = await getUserFinancials(userId);
      const sortedW = fin.withdrawals.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const sortedF = fin.files.sort(
        (a: any, b: any) =>
          new Date(b.uploadDate || 0).getTime() -
          new Date(a.uploadDate || 0).getTime(),
      );

      const page = 0;
      const msg = renderHistoryPage(sortedW, sortedF, page);
      const maxPage = Math.max(0, Math.max(sortedW.length, sortedF.length) - 1);
      
      const buttons = [];
      if (page > 0) buttons.push({ text: "⬅ Previous", callback_data: `hist_${page - 1}` });
      if (page < maxPage) buttons.push({ text: "➡ Next", callback_data: `hist_${page + 1}` });

      await ctx.reply(msg, { 
          parse_mode: "Markdown",
          ...(buttons.length > 0 && { reply_markup: { inline_keyboard: [buttons] } })
      });
    }));

    newBot.action(/hist_(\d+)/, async (ctx) => {
      const page = parseInt(ctx.match[1], 10);
      const userId = String(ctx.from.id);
      
      try {
        const fin = await getUserFinancials(userId);
        const sortedW = fin.withdrawals.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const sortedF = fin.files.sort(
          (a: any, b: any) =>
            new Date(b.uploadDate || 0).getTime() -
            new Date(a.uploadDate || 0).getTime(),
        );

        const maxPage = Math.max(0, Math.max(sortedW.length, sortedF.length) - 1);
        const safePage = Math.min(Math.max(0, page), maxPage);
        const msg = renderHistoryPage(sortedW, sortedF, safePage);
        
        const buttons = [];
        if (safePage > 0) buttons.push({ text: "⬅ Previous", callback_data: `hist_${safePage - 1}` });
        if (safePage < maxPage) buttons.push({ text: "➡ Next", callback_data: `hist_${safePage + 1}` });

        await ctx.editMessageText(msg, { 
            parse_mode: "Markdown",
            ...(buttons.length > 0 ? { reply_markup: { inline_keyboard: [buttons] } } : { reply_markup: { inline_keyboard: [] } })
        });
        await ctx.answerCbQuery();
      } catch (e) {
        console.error("History update error", e);
        await ctx.answerCbQuery("Failed to update history.");
      }
    });
    newBot.hears(/👥\s*Refer\s*&\s*Earn/i, withTiming('REFER_CLICK', async (ctx) => {
      console.log("button_refer_clicked");
      lastHandlerExecuted = "Refer & Earn handler";
      const userId = String(ctx.from.id);

      const refLink = `${APP_URL}/r/${userId}`;
      const introMsg = `👥 *Refer & Earn Program*\n\nHow it works:\n1. Share your file link with others.\n2. When people download your files, downloads will be counted.\n3. Every 10 valid downloads = Reward earned.\n4. Fake downloads, self-downloads, VPN abuse, repeated downloads from same user/device/IP should not count.\n5. Rewards are credited automatically after verification.\n6. Admin may remove rewards obtained through fraud.`;

      await ctx.reply(introMsg, { parse_mode: "Markdown" });

      const refDoc = (await restGetDoc("referrals", userId)) || {};
      const totalValidDls = refDoc.totalValidDownloads || 0;
      const totalEarned = refDoc.totalRewardsEarned || 0;
      const fraudRemoved = refDoc.fraudDownloadsRemoved || 0;
      const pending = 0; // Automatically verified
      const needed = 10 - (totalValidDls % 10);
      const progress = totalValidDls % 10;
      const totalRef = refDoc.totalReferrals || 0;
      const activeRef = refDoc.activeReferrals || 0;
      const refEarnings = refDoc.earnings || 0; // Tracked separately if any referral rewards exist

      let recentRefsText = "";
      if (refDoc.recentReferrals && refDoc.recentReferrals.length > 0) {
        recentRefsText =
          "\n\n*Recent Referrals:*\n" +
          refDoc.recentReferrals
            .map(
              (r: any) =>
                `👤 ${r.name}\n@${r.username}\nJoin Date: ${r.joinDate}\nStatus: ${r.status}`,
            )
            .join("\n\n");
      }

      const dashMsg = `👥 *Refer & Earn Dashboard*\n\nTotal Valid Downloads: ${totalValidDls}\nDownloads Needed For Next Reward: ${needed}\nTotal Rewards Earned: ₹${totalEarned.toFixed(2)}\nPending Verification: ${pending}\nFraud Downloads Removed: ${fraudRemoved}\n\n*Progress:*\n${progress} / 10 Downloads\n${needed} More Downloads Needed For Reward\n\n*Referral Stats:*\nTotal Referrals: ${totalRef}\nActive Referrals: ${activeRef}\nReferral Earnings: ₹${refEarnings.toFixed(2)}${recentRefsText}\n\nReferral Link: \`${refLink}\``;

      await ctx.reply(dashMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔗 Copy Referral Link",
                callback_data: "copy_ref_link",
              },
            ],
            [
              {
                text: "📤 Share Referral Link",
                url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🚀 Join Internet Ki Duniya and start earning from file sharing.\n\nUse my referral link:")}`,
              },
            ],
          ],
        },
      });
    }));

    newBot.on("text", async (ctx) => {
      const text = ctx.message.text.trim();
      const userId = String(ctx.from.id);
      console.log(`fallback_received: "${text}"`);
      lastHandlerExecuted = "text fallback / unknown command";

      const uploadState = pendingUploads.get(ctx.from.id);
      if (uploadState && uploadState.step === "awaiting_name") {
         if (!text.startsWith("/")) {
             uploadState.fileName = text;
         }
         
         uploadState.step = "awaiting_expiry";
         pendingUploads.set(ctx.from.id, uploadState);

         const progressMsg = await ctx.reply("📤 Uploading File...\n▓▓▓▓▓░░░░░ 50%");
         
         await new Promise(res => setTimeout(res, 1000));
         try {
             await ctx.telegram.editMessageText(
                progressMsg.chat.id, 
                progressMsg.message_id, 
                undefined, 
                "📤 Uploading File...\n▓▓▓▓▓▓▓▓▓▓ 100%"
             );
             await ctx.reply(
               `Please select expiry period:`,
               Markup.inlineKeyboard([
                 [Markup.button.callback("7 Days", `expiry_7`)],
                 [Markup.button.callback("15 Days", `expiry_15`)],
                 [Markup.button.callback("30 Days", `expiry_30`)],
               ]),
             );
         } catch(e) {}
         return;
      }

      const state = withdrawStates.get(userId);
      if (state) {
        if (state.step === "awaiting_upi") {
          if (!text.includes("@") || text.length < 5) {
            return ctx.reply(
              "Invalid UPI ID. Please enter a valid UPI ID (e.g. user@bank).",
            );
          }
          const upiId = text;
          withdrawStates.set(userId, { step: "awaiting_amount", upiId });

          const fin = await getUserFinancials(userId);
          return ctx.reply(
            `Available Balance: ₹${fin.balance.toFixed(2)}\n\nMinimum: ₹10\nMaximum: ₹500\n\nEnter withdrawal amount:`,
          );
        } else if (state.step === "awaiting_amount") {
          const amount = parseFloat(text);

          if (isNaN(amount)) return ctx.reply("Please enter a valid number.");
          if (amount < 10) return ctx.reply("Amount must not be below ₹10.");
          if (amount > 500) return ctx.reply("Amount must not exceed ₹500.");

          const fin = await getUserFinancials(userId);
          if (amount > fin.balance)
            return ctx.reply(
              `Amount must not exceed balance. Available: ₹${fin.balance.toFixed(2)}`,
            );

          const token = `verify_${Date.now()}_${userId}_${Math.random().toString(36).substring(7)}`;
          humanVerifyTokens.set(token, {
            userId,
            upiId: state.upiId,
            amount,
            username: ctx.from.username
                ? `@${ctx.from.username}`
                : ctx.from.first_name || "User",
          });
          const verifyUrl = `${APP_URL}/verify-withdraw?token=${token}`;

          withdrawStates.delete(userId);
          
          return ctx.reply(
            `Withdrawal Summary\n\nUPI ID: ${state.upiId}\n\nAmount: ₹${amount.toFixed(2)}\n\nAvailable Balance: ₹${fin.balance.toFixed(2)}\n\nPlease complete human verification to submit your request.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Verify Human",
                      url: verifyUrl,
                    },
                  ],
                  [{ text: "Cancel", callback_data: "withdraw_cancel" }],
                ],
              },
            },
          );
        }
      }

      if (!ctx.message.text.startsWith("/")) {
        ctx.reply("Invalid command. Use /menu to see options.");
      }
    });

    // Catch errors
    newBot.catch((err: any, ctx: any) => {
      lastTelegramError = err.description || err.message || "Unknown bot error";
      if (!lastTelegramError.includes("chat not found") && !lastTelegramError.includes("Promise timed out")) {
        console.error(`Ooops, encountered an error for ${ctx.updateType}:`, lastTelegramError);
      }
    });

    // Revert to Long Polling mode because AI Studio preview proxy blocks webhooks
    console.log("SERVER SETUP: Deleting webhook and starting long polling mode...");
    try {
      await newBot.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log("SERVER SETUP: Telegram webhook successfully deleted/disabled.");
    } catch (e: any) {
      console.error("SERVER SETUP: Error deleting webhook:", e.message || e);
    }

    let launchAttempts = 0;
    const attemptLaunch = async () => {
      try {
        console.log("SERVER SETUP: Launching bot update polling...");
        // Launch in background so the promise doesn't block the startup sequence
        newBot.launch({ dropPendingUpdates: true })
          .then(() => {
            console.log("SERVER SETUP: Bot long polling stopped.");
          })
          .catch((err: any) => {
            const msg = err.message || String(err);
            if (msg.includes("terminated by other getUpdates") || msg.includes("terminated by setWebhook")) {
               console.log("SERVER SETUP: Polling conflict detected. Yielding to other instance.");
               telegramApiStatus = "conflict (polling yielded)";
               return;
            }
            console.error(`SERVER SETUP: Background polling error:`, msg);
            lastTelegramError = msg;
          });
        console.log("SERVER SETUP: Bot long polling launched successfully.");
        telegramApiStatus = "online";
      } catch (err: any) {
        const msg = err.message || String(err);
        console.error(`SERVER SETUP: Failed to launch polling (attempt ${launchAttempts + 1}):`, msg);
        if (launchAttempts < 5) {
          launchAttempts++;
          console.log("SERVER SETUP: Retrying launch in 5 seconds...");
          setTimeout(attemptLaunch, 5000);
        } else {
          logError(`Failed to launch polling after 5 attempts: ` + msg);
        }
      }
    };
    attemptLaunch();
    console.log(`Telegram Bot Ready for ${botUsername || 'Bot'} (Long Polling Mode)`);

    // Fetch bot metadata
    try {
      const me = await newBot.telegram.getMe();
      botUsername = me.username || null;
      botId = me.id;
      console.log(`bot_username: ${botUsername}`);
      console.log(`bot_id: ${botId}`);
      console.log(`token_loaded: ${token.slice(0, 5)}...`);
    } catch (err) {
      console.error("Failed to get bot info", err);
    }

    bot = newBot;
    currentBotToken = token;
  } catch (error) {
    console.error("Failed to setup telegram bot", error);
  } finally {
    isSettingUpBot = false;
  }
}

// Webhook Health Monitor (Disabled since we're using Long Polling, just basic ping)
setInterval(async () => {
  if (bot && currentBotToken) {
    try {
      await bot.telegram.getMe();
      telegramApiStatus = "online";
    } catch (err: any) {
      telegramApiStatus = "offline";
      lastTelegramError =
        err.description || err.message || "Telegram API verification failed";
      console.error("Telegram API health check failed:", err);
      // Auto-recover attempt
      setupBot(currentBotToken);
    }
  }
}, 60000); // Check every 60 seconds

async function showMainMenu(ctx: any) {
  try {
    await ctx.reply(
      "Main Menu",
      Markup.keyboard([
        ["👤 Account", "💰 Balance"],
        ["📁 Upload File", "📊 My Files"],
        ["💸 Withdraw", "📜 History"],
        ["👥 Refer & Earn"],
      ]).resize(),
    );
  } catch (err: any) {
    if (!err.message.includes("chat not found")) {
      console.error("Failed to show main menu:", err.message);
    }
  }
}

function startConfigWatcher() {
  // Config is now supervised via API due to AI studio permissions
}

function syncConfigToMemory(data: any) {
  ownerChatId = data.ownerChatId || "";
  requiredChannel = data.requiredChannel || "";
  requiredGroup = data.requiredGroup || "";
  storageChannel = data.storageChannel || "";
  referralCommissionRate = data.referralCommissionRate ?? 10;
  adsEnabled = data.adsEnabled === true || data.adsEnabled === "true";
  adsScript = data.adsScript || "";
  adsPosition = data.adsPosition || "middle";
  if (data.adsList !== undefined) adsList = Array.isArray(data.adsList) ? data.adsList : [];
  if (data.popunderConfig !== undefined) popunderConfig = data.popunderConfig;
  if (data.directLinkConfig !== undefined) directLinkConfig = data.directLinkConfig;
  if (data.socialBarConfig !== undefined) socialBarConfig = data.socialBarConfig;

  if (data.botToken && data.botToken !== currentBotToken) {
    console.log("Detected new Bot Token via API. Re-initializing...");
    if (bot) {
      try {
        bot.stop("restarting api");
      } catch (e) {}
      setTimeout(() => setupBot(data.botToken), 2000);
    } else {
      setupBot(data.botToken);
    }
  }
}

app.post("/api/admin/config/sync_mem", requireAdmin, async (req, res) => {
  try {
    syncConfigToMemory(req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/save-config", requireAdmin, async (req, res) => {
  console.log("API SAVE-CONFIG: Received request.");
  try {
    let config = req.body;
    console.log("API SAVE-CONFIG: Config payload:", JSON.stringify(config));

    // Remove undefined values
    Object.keys(config).forEach(
      (key) => config[key] === undefined && delete config[key],
    );

    // Convert to Firestore REST format
    const fields = {
      botToken: { stringValue: config.botToken || "" },
      ownerChatId: { stringValue: config.ownerChatId || "" },
      requiredChannel: { stringValue: config.requiredChannel || "" },
      requiredGroup: { stringValue: config.requiredGroup || "" },
      storageChannel: { stringValue: config.storageChannel || "" },
      referralCommissionRate: { integerValue: String(config.referralCommissionRate ?? 10) },
      updatedAt: { stringValue: config.updatedAt || new Date().toISOString() },
      adsEnabled: { booleanValue: config.adsEnabled === true || config.adsEnabled === "true" },
      adsScript: { stringValue: config.adsScript || "" },
      adsPosition: { stringValue: config.adsPosition || "middle" },
      adsListJson: { stringValue: JSON.stringify(config.adsList || []) },
      popunderConfigJson: { stringValue: JSON.stringify(config.popunderConfig || { enabled: false, delay: 3, oncePerSession: false, oncePer24Hours: false, device: "all" }) },
      directLinkConfigJson: { stringValue: JSON.stringify(config.directLinkConfig || { url: "", trigger: "download_click" }) },
      socialBarConfigJson: { stringValue: JSON.stringify(config.socialBarConfig || { enabled: false, script: "" }) },
    };

    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config?key=${firebaseConfig.apiKey}`;

    const fetchRes = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config`,
        fields,
      }),
    });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      console.error(
        "API SAVE-CONFIG: REST API Error:",
        fetchRes.status,
        errText,
      );
      throw new Error(
        `Firestore REST API Error: ${fetchRes.status} ${errText}`,
      );
    }

    console.log("Save completed successfully.");

    // Also sync the memory state directly
    syncConfigToMemory(config);

    res.json({ success: true });
  } catch (err: any) {
    console.error("Error saving config details:", {
      message: err.message,
      code: err.code,
      stack: err.stack,
      config: req.body,
    });
    res.status(500).json({ error: err.message });
  }
});

async function initializeBotFromFirestore() {
  console.log("SERVER BOOT: Initializing bot...");
  let token = "";
  let tokenSource = "";

  if (process.env.TELEGRAM_BOT_TOKEN) {
    token = process.env.TELEGRAM_BOT_TOKEN;
    tokenSource = "Environment";
  } else if ((firebaseConfig as any).botToken) {
    token = (firebaseConfig as any).botToken;
    tokenSource = "Firebase Config";
  }

  try {
    const dbId =
      firebaseConfig.firestoreDatabaseId === "(default)"
        ? "(default)"
        : firebaseConfig.firestoreDatabaseId;
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/settings/telegram_config?key=${firebaseConfig.apiKey}`;

    const fetchRes = await fetch(url);
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      console.log("SERVER BOOT: Bot config loaded from Firestore (REST).");
      const getField = (f: any) => {
        if (!f || typeof f !== "object") return f;
        if ("stringValue" in f) return f.stringValue;
        if ("integerValue" in f) return parseInt(f.integerValue, 10);
        return f;
      };

      ownerChatId = getField(data.fields?.ownerChatId) || "";
      requiredChannel = getField(data.fields?.requiredChannel) || "";
      requiredGroup = getField(data.fields?.requiredGroup) || "";
      storageChannel = getField(data.fields?.storageChannel) || "";
      referralCommissionRate = getField(data.fields?.referralCommissionRate) ?? 10;
      
      const getFieldBool = (f: any) => {
        if (!f || typeof f !== "object") return false;
        if ("booleanValue" in f) return f.booleanValue;
        if ("stringValue" in f) return f.stringValue === "true" || f.stringValue === "on";
        return false;
      };
       adsEnabled = getFieldBool(data.fields?.adsEnabled) || getField(data.fields?.adsEnabled) === true || getField(data.fields?.adsEnabled) === "true";
      adsScript = getField(data.fields?.adsScript) || "";
      adsPosition = getField(data.fields?.adsPosition) || "middle";

      try {
        const adsListRaw = getField(data.fields?.adsListJson);
        adsList = adsListRaw ? JSON.parse(adsListRaw) : [];
      } catch (ex) {
        adsList = [];
      }
      try {
        const popunderRaw = getField(data.fields?.popunderConfigJson);
        if (popunderRaw) popunderConfig = JSON.parse(popunderRaw);
      } catch (ex) {}
      try {
        const directLinkRaw = getField(data.fields?.directLinkConfigJson);
        if (directLinkRaw) directLinkConfig = JSON.parse(directLinkRaw);
      } catch (ex) {}
      try {
        const socialBarRaw = getField(data.fields?.socialBarConfigJson);
        if (socialBarRaw) socialBarConfig = JSON.parse(socialBarRaw);
      } catch (ex) {}

      const firestoreToken = getField(data.fields?.botToken);

      if (!token && firestoreToken) {
        token = firestoreToken.trim();
        tokenSource = "Firestore";
      }
    } else {
      console.warn("SERVER BOOT: Telegram config document does not exist.");
    }
  } catch (err: any) {
    console.error(
      "SERVER BOOT: Could not load Telegram config from Firestore. Error Details:",
      err.message,
    );
  }

  if (!token) {
    console.error("SERVER BOOT: WARNING - BOT_TOKEN Missing.");
    telegramApiStatus = "offline";
    lastTelegramError = "BOT_TOKEN Missing";
  } else {
    console.log(`SERVER BOOT: Loaded from ${tokenSource}`);
    await setupBot(token);
  }
}

async function startServer() {
  await initializeBotFromFirestore();
  startConfigWatcher();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
