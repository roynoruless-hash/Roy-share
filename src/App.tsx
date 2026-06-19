import { useState, useRef, useEffect, FormEvent } from "react";
import { auth, db, firebaseConfig } from "./firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { MoreVertical, Wallet, UserX, XCircle, RefreshCcw, Clock, Download, ArrowRight, Settings, Plus, Play, Pause, Save, LogOut, Loader2, Search, Zap, Shield, HelpCircle, BarChart3, Users, DollarSign, Eye, LineChart, FileText, Smartphone, Laptop, LayoutDashboard, Globe, MessageSquare, Menu, Activity, Send, File, RefreshCw, X, Gift, CheckCircle2, ChevronRight, Copy, ExternalLink, ShieldCheck, Mail, LogIn, ChevronDown, Trash2, ArrowUpRight, CreditCard, Link as LinkIcon, DownloadCloud, Ban, UploadCloud, AlertCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function AdContainer({ config, position }: { config: any; position: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || !config.adsEnabled || !config.adsScript) return;

    const pos = (config.adsPosition || "middle").toLowerCase();
    const target = position.toLowerCase();
    const shouldShow = pos === "all" || pos === target;

    if (shouldShow && containerRef.current) {
      containerRef.current.innerHTML = "";

      // Create a temporary div to parse HTML and extract scripts
      const helperDiv = document.createElement("div");
      helperDiv.innerHTML = config.adsScript;

      Array.from(helperDiv.childNodes).forEach((node) => {
        if (node.nodeName === "SCRIPT") {
          const scriptEl = document.createElement("script");
          Array.from((node as HTMLElement).attributes).forEach((attr) => {
            scriptEl.setAttribute(attr.name, attr.value);
          });
          scriptEl.text = (node as HTMLScriptElement).text;
          containerRef.current?.appendChild(scriptEl);
        } else {
          containerRef.current?.appendChild(node.cloneNode(true));
        }
      });
    }
  }, [config, position]);

  if (!config || !config.adsEnabled || !config.adsScript) return null;

  const pos = (config.adsPosition || "middle").toLowerCase();
  const target = position.toLowerCase();
  const shouldShow = pos === "all" || pos === target;

  if (!shouldShow) return null;

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center my-4 overflow-hidden min-h-[90px]"
    />
  );
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [adsConfig, setAdsConfig] = useState<any>(null);

  useEffect(() => {
    fetchApi("/api/public-display-config")
      .then((res) => res.json())
      .then((data) => {
        setAdsConfig(data);
      })
      .catch((err) => {
        console.error("Ad configuration failed to load:", err);
      });
  }, []);

  const [debugUserEmail, setDebugUserEmail] = useState<string>("None");
  const [debugMatch, setDebugMatch] = useState<boolean>(false);

  const rawAdminEmails =
    import.meta.env.VITE_ADMIN_EMAILS || "roynoruless@gmail.com";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      const adminEmails = rawAdminEmails
        .split(",")
        .map((e: string) => e.trim().toLowerCase());

      if (u && u.email) {
        const uEmail = u.email.trim().toLowerCase();
        setDebugUserEmail(uEmail);

        const isMatch = adminEmails.includes(uEmail);
        setDebugMatch(isMatch);

        if (isMatch) {
          setIsAdmin(true);
          setErrorMsg("");
        } else {
          setIsAdmin(false);
          setErrorMsg(`Unauthorized Gmail account: ${u.email}. Access Denied.`);
          try {
            await signOut(auth);
          } catch (error) {
            console.error("Signout error:", error);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, [rawAdminEmails]);

  const [showLogin, setShowLogin] = useState(false);

  const handlePointerDown = () => {
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      setShowLogin(true);
      setIsPressing(false);
    }, 3000);
  };

  const handlePointerUp = () => {
    setIsPressing(false);
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleLogin = async () => {
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameters to force account selection and bypassing some cache
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        if (error.code === "auth/network-request-failed") {
          setErrorMsg(
            "Login failed due to a network restriction. Please ensure third-party cookies are allowed, disable AdBlockers/Brave Shields for this site, or try opening the app in a new tab."
          );
        } else {
          setErrorMsg(`Login Error: ${error.message}`);
        }
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isAdmin && user) {
    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        setErrorMsg={setErrorMsg}
        errorMsg={errorMsg}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Top Ad */}
      <AdContainer config={adsConfig} position="top" />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
        {/* Progress indicator for long press */}
        <div
          className={cn(
            "absolute bottom-0 left-0 h-1 bg-blue-600 transition-all duration-[3000ms] ease-linear",
            isPressing ? "w-full" : "w-0 duration-150",
          )}
        />

        <div
          className="mx-auto w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center cursor-pointer select-none mb-6 relative hover:bg-blue-200 transition-colors"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img
            src="/vite.svg"
            alt="Logo"
            className="w-16 h-16 pointer-events-none"
          />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          RoyVerse File Share
        </h1>
        <p className="text-gray-500 mb-6">Service is operating normally.</p>

        {showLogin && (
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition transform hover:scale-[1.02] active:scale-95 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Authenticate Server
          </button>
        )}

        {/* Middle Ad */}
        <AdContainer config={adsConfig} position="middle" />

        {/* Login Debug Information Box */}
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-xs font-mono text-left border border-gray-200">
          <p className="text-gray-500 mb-2 uppercase tracking-wide font-semibold">
            Admin Auth Debug
          </p>
          <div className="space-y-1 text-gray-700">
            <p>
              <span className="font-semibold">Logged In Gmail:</span>{" "}
              {debugUserEmail}
            </p>
            <p>
              <span className="font-semibold">ADMIN_EMAILS:</span>{" "}
              {rawAdminEmails}
            </p>
            <p>
              <span className="font-semibold">Match Result:</span>{" "}
              {debugMatch ? (
                <span className="text-green-600 font-bold">True</span>
              ) : (
                <span className="text-red-600 font-bold">False</span>
              )}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm flex flex-col gap-3 items-start text-left">
            <div className="flex gap-2 items-start">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
            {errorMsg.toLowerCase().includes("tab") && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="inline-block w-full text-center bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-3 rounded-lg border border-red-300 transition-colors shadow-sm"
              >
                Open App in New Tab ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Bottom Ad */}
      <AdContainer config={adsConfig} position="bottom" />
      {/* Sidebar Ad as fallback */}
      <AdContainer config={adsConfig} position="sidebar" />
    </div>
  );
}

// API base URL will be relative for both dev and prod so we hit the same domain
const API_BASE_URL = "";

async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${endpoint}`;
  let res;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    if (err.message && err.message.toLowerCase().includes("failed to fetch")) {
       return new Response(JSON.stringify({ error: "Network error" }), { status: 503, headers: {'Content-Type': 'application/json'}});
    }
    console.error(`[API Error] fetch() dashed on ${url}:`, err);
    throw new Error(`Failed to fetch from ${url}: ${err.message}`);
  }
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    const text = await res.text();
    if (text.includes("Starting Server")) {
       return new Response(JSON.stringify({ error: "Server start" }), { status: 503, headers: {'Content-Type': 'application/json'}});
    }
    console.error(`[API Error] Received HTML from ${url}`, text.substring(0, 200));
    throw new Error(`Endpoint ${url} returned HTML instead of JSON. Expected JSON API.`);
  }
  return res;
}

function AdminDashboard({
  user,
  onLogout,
  setErrorMsg,
  errorMsg,
}: {
  user: User;
  onLogout: () => void;
  setErrorMsg: (msg: string) => void;
  errorMsg: string;
}) {
  const [botConfig, setBotConfig] = useState({
    botToken: "",
    ownerChatId: "",
    requiredChannel: "",
    requiredGroup: "",
    storageChannel: "",
    referralCommissionRate: "10",
    adsEnabled: false,
    adsScript: "",
    adsPosition: "middle",
  });
  const [initialBotConfig, setInitialBotConfig] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [sysStatus, setSysStatus] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [configDebug, setConfigDebug] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "ads">("dashboard");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"none" | "verification" | "withdrawals">("none");

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user]);

  useEffect(() => {
    if (initialBotConfig) {
      setIsDirty(
        JSON.stringify(botConfig) !== JSON.stringify(initialBotConfig),
      );
    }
  }, [botConfig, initialBotConfig]);

  const fetchConfig = async (retries = 3) => {
    setLoadingConfig(true);
    for (let i = 0; i < retries; i++) {
      try {
        if (!user) {
          throw new Error("User not authenticated.");
        }
        
        let data: any = {};
        try {
          const docSnap = await getDoc(doc(db, "settings", "telegram_config"));
          if (docSnap.exists()) {
            data = docSnap.data();
          }
        } catch (dbErr: any) {
          console.error("Firestore read error:", dbErr);
          throw new Error("Firestore read failed: " + dbErr.message);
        }

        setBotConfig({
          botToken: data.botToken || "",
          ownerChatId: data.ownerChatId || "",
          requiredChannel: data.requiredChannel || "",
          requiredGroup: data.requiredGroup || "",
          storageChannel: data.storageChannel || "",
          referralCommissionRate: data.referralCommissionRate !== undefined ? String(data.referralCommissionRate) : "10",
          adsEnabled: !!data.adsEnabled,
          adsScript: data.adsScript || "",
          adsPosition: data.adsPosition || "middle",
          adsList: data.adsList || [],
          popunderConfig: data.popunderConfig || { enabled: false, delay: 3, oncePerSession: false, oncePer24Hours: false, device: "all" },
          directLinkConfig: data.directLinkConfig || { url: "", trigger: "download_click" },
          socialBarConfig: data.socialBarConfig || { enabled: false, script: "" },
        });
        setInitialBotConfig({
          ...data,
          referralCommissionRate: data.referralCommissionRate !== undefined ? String(data.referralCommissionRate) : "10",
          adsEnabled: !!data.adsEnabled,
          adsScript: data.adsScript || "",
          adsPosition: data.adsPosition || "middle",
          adsList: data.adsList || [],
          popunderConfig: data.popunderConfig || { enabled: false, delay: 3, oncePerSession: false, oncePer24Hours: false, device: "all" },
          directLinkConfig: data.directLinkConfig || { url: "", trigger: "download_click" },
          socialBarConfig: data.socialBarConfig || { enabled: false, script: "" },
        });
        setErrorMsg("");
        setLoadingConfig(false);
        return;
      } catch (err: any) {
        if (err.message !== "Failed to fetch") {
          console.error(
            `Attempt ${i + 1} failed to load config from Firestore`,
            err,
          );
        }

        if (i === retries - 1) {
          setLoadingConfig(false);
          console.warn("Using defaults due to fetch error.");
          const defaults = {
            botToken: "",
            ownerChatId: "",
            requiredChannel: "",
            requiredGroup: "",
            storageChannel: "",
            updatedAt: new Date().toISOString(),
          };
          setBotConfig(defaults);
          setInitialBotConfig(defaults);
          setErrorMsg(
            `Failed to load config: ${err.message || "Offline or no connection"}`,
          );
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetchApi("/api/admin/status");
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSysStatus(data);

      if (user) {
        const token = await user.getIdToken();
        const statsRes = await fetchApi("/api/admin/storage-stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statsRes.ok) {
          setStorageStats(await statsRes.json());
        }
      }
    } catch (err: any) {
      setSysStatus({ error: err.message || "Backend unreachable" });
    }
  };

  const handleSave = async (forceConfig?: any) => {
    const actualConfig = (forceConfig && typeof forceConfig === 'object' && !forceConfig.preventDefault && !forceConfig.nativeEvent) 
      ? forceConfig 
      : botConfig;
    const retries = 3;

    console.log("handleSave triggered");
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg("");

    for (let i = 0; i < retries; i++) {
      try {
        console.log("Preparing config to save...");
        const configToSave = {
          botToken: actualConfig.botToken || "",
          ownerChatId: actualConfig.ownerChatId || "",
          requiredChannel: actualConfig.requiredChannel || "",
          requiredGroup: actualConfig.requiredGroup || "",
          storageChannel: actualConfig.storageChannel || "",
          referralCommissionRate: parseInt(actualConfig.referralCommissionRate, 10) || 10,
          adsEnabled: !!actualConfig.adsEnabled,
          adsScript: actualConfig.adsScript || "",
          adsPosition: actualConfig.adsPosition || "middle",
          adsList: actualConfig.adsList || [],
          popunderConfig: actualConfig.popunderConfig || { enabled: false, delay: 3, oncePerSession: false, oncePer24Hours: false, device: "all" },
          directLinkConfig: actualConfig.directLinkConfig || { url: "", trigger: "download_click" },
          socialBarConfig: actualConfig.socialBarConfig || { enabled: false, script: "" },
          updatedAt: new Date().toISOString(),
        };

        console.log(`Endpoint called: Firestore DB: settings/telegram_config (attempt ${i + 1})...`);

        if (!user) {
          throw new Error("User is not authenticated (user is null)");
        }

        try {
          // Write directly to Firestore to bypass Netlify routing issues
          await setDoc(doc(db, "settings", "telegram_config"), configToSave, { merge: true });
          console.log("Firestore client write success.");
        } catch (dbErr: any) {
          console.error("Firestore DB Write Error:", dbErr);
          throw new Error(`Firestore Error: ${dbErr.message}`);
        }

        const token = await user.getIdToken();
        // Fire-and-forget sync for backend process (if it is alive)
        try {
          fetchApi("/api/admin/config/sync_mem", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(configToSave),
          }).catch((err) => console.log("Backend offline or inaccessible, skipped memory sync.", err));
        } catch (e) {
          // ignore
        }

        console.log("Save config finished successfully.");

        setSaveSuccess(true);
        setInitialBotConfig(configToSave);
        setIsDirty(false);
        setSaving(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        
        // Reload config without disturbing the state loop
        try {
            await fetchConfig(1);
        } catch(e) {
            console.log("fetchConfig reload failed silently");
        }
        return;
      } catch (err: any) {
        console.error(`Save config error (attempt ${i + 1}):`, err);
        if (i === retries - 1) {
          setErrorMsg(`Save failed: ${err.message || "Unknown error"}`);
          setSaving(false);
        } else {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  };

  const [auditResult, setAuditResult] = useState<any>(null);
  const [runningAudit, setRunningAudit] = useState(false);

  const [diagResult, setDiagResult] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);

  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagResult(null);
    try {
      const token = await user.getIdToken();
      const res = await fetchApi("/api/admin/diagnose", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDiagResult(data);
    } catch (err: any) {
      setDiagResult({
        error: err.message || "Failed to reach backend diagnostic endpoint.",
      });
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const runAudit = async () => {
    setRunningAudit(true);
    setAuditResult(null);
    try {
      const token = await user.getIdToken();
      const res = await fetchApi("/api/admin/audit", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAuditResult(data);
    } catch (err: any) {
      setAuditResult({
        error: err.message || "Failed to reach backend audit endpoint.",
      });
    } finally {
      setRunningAudit(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-green-600" />
              RoyVerse Admin
            </h1>
            <p className="text-gray-500 text-sm mt-1">{user.email}</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="flex items-center justify-center p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                title="More Options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="py-2">
                    <button
                      onClick={() => { setActiveModal("verification"); setMoreMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                    >
                      <Shield className="w-4 h-4 text-orange-500" />
                      Anti-Fraud Monitor
                    </button>
                    <button
                      onClick={() => { setActiveModal("withdrawals"); setMoreMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                    >
                      <Wallet className="w-4 h-4 text-green-500" />
                      Withdrawal Requests
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Modal overlays for Admin details */}
        {activeModal !== "none" && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-2xl bg-gray-50 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right relative">
              <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10 hidden md:flex">
                <h2 className="text-lg font-bold">
                  {activeModal === "verification" ? "Anti-Fraud Monitor" : "Withdrawal Requests"}
                </h2>
                <button
                  onClick={() => setActiveModal("none")}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="md:hidden sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
                <h2 className="text-lg font-bold">
                  {activeModal === "verification" ? "Anti-Fraud Monitor" : "Withdrawal Requests"}
                </h2>
                <button
                  onClick={() => setActiveModal("none")}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 md:p-6 pb-20">
                {activeModal === "verification" && <EarningsVerificationAdmin sysStatus={sysStatus} />}
                {activeModal === "withdrawals" && <WithdrawalsAdminPanel user={user} />}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <button 
             onClick={() => setActiveTab("dashboard")} 
             className={cn("px-4 py-2 rounded-lg font-medium transition", activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md border border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
          >
            Dashboard
          </button>
          <button 
             onClick={() => setActiveTab("users")} 
             className={cn("px-4 py-2 rounded-lg font-medium transition", activeTab === "users" ? "bg-blue-600 text-white shadow-md border border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
          >
            Users
          </button>
          <button 
             onClick={() => setActiveTab("ads")} 
             className={cn("px-4 py-2 rounded-lg font-medium transition", activeTab === "ads" ? "bg-blue-600 text-white shadow-md border border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
          >
            Ads System
          </button>
        </div>

        {activeTab === "dashboard" && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Bot Configuration
                </div>
                {loadingConfig && (
                  <span className="text-xs text-blue-600 font-normal">
                    Loading Configuration...
                  </span>
                )}
                {isDirty && !loadingConfig && (
                  <span className="text-xs text-amber-600 font-normal">
                    Unsaved Changes
                  </span>
                )}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    value={botConfig.botToken || ""}
                    onChange={(e) => {
                      setBotConfig((p) => ({ ...p, botToken: e.target.value }));
                      setIsDirty(true);
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Chat ID (For Notifications)
                  </label>
                  <input
                    type="text"
                    value={botConfig.ownerChatId || ""}
                    onChange={(e) => {
                      setBotConfig((p) => ({
                        ...p,
                        ownerChatId: e.target.value,
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    placeholder="e.g. 123456789"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Channel
                    </label>
                    <input
                      type="text"
                      value={botConfig.requiredChannel || ""}
                      onChange={(e) => {
                        setBotConfig((p) => ({
                          ...p,
                          requiredChannel: e.target.value,
                        }));
                        setIsDirty(true);
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="@channelusername"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Group
                    </label>
                    <input
                      type="text"
                      value={botConfig.requiredGroup || ""}
                      onChange={(e) => {
                        setBotConfig((p) => ({
                          ...p,
                          requiredGroup: e.target.value,
                        }));
                        setIsDirty(true);
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="@groupusername"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Private Storage Channel ID
                    </label>
                    <input
                      type="text"
                      value={botConfig.storageChannel || ""}
                      onChange={(e) => {
                        setBotConfig((p) => ({
                          ...p,
                          storageChannel: e.target.value,
                        }));
                        setIsDirty(true);
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="-100..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referral Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={botConfig.referralCommissionRate || ""}
                    onChange={(e) => {
                      setBotConfig((p) => ({
                        ...p,
                        referralCommissionRate: e.target.value,
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">This percentage of user earnings applies to the referrer.</p>
                </div>

                <button
                  onClick={() => {
                    console.log("Save clicked");
                    handleSave();
                  }}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center justify-center w-full md:w-auto"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
                {saveSuccess && (
                  <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Saved successfully.
                  </p>
                )}
                {errorMsg && (
                  <p className="text-red-500 text-sm mt-2 flex items-start gap-1 p-3 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> 
                    <span className="break-all">{errorMsg}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                Telegram Audit
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Run live Telegram API checks (getMe, getWebhookInfo) to confirm
                integration.
              </p>
              <button
                onClick={runAudit}
                disabled={runningAudit}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {runningAudit ? "Running Audit..." : "Run Full API Audit"}
              </button>
              {auditResult && (
                <div className="mt-4 p-4 bg-gray-900 rounded-xl overflow-auto text-xs font-mono text-green-400 max-h-64 shadow-inner">
                  <pre>{JSON.stringify(auditResult, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                Test Command Routing
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Test local command interception to verify correct handler
                execution without using live Telegram chats.
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {["/start", "/help", "/test", "/unknown"].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={async () => {
                      try {
                        const token = await user.getIdToken();
                        const res = await fetchApi("/api/admin/test-command", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ command: cmd }),
                        });
                        if (!res.ok) throw new Error(await res.text());
                        const data = await res.json();
                        setAuditResult({
                          ...auditResult,
                          commandTest: data,
                        });
                      } catch (err: any) {
                        setAuditResult({
                          ...auditResult,
                          commandTest: err.message,
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm font-medium transition"
                  >
                    Test {cmd}
                  </button>
                ))}
              </div>
              {auditResult?.commandTest && (
                <div className="mt-4 p-4 bg-gray-900 rounded-xl overflow-auto text-xs font-mono text-green-400 max-h-64 shadow-inner">
                  <pre>{JSON.stringify(auditResult.commandTest, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                Telegram Bot Diagnostics
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Run comprehensive diagnostics for token loading and API
                connectivity.
              </p>
              <button
                onClick={runDiagnostics}
                disabled={runningDiagnostics}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {runningDiagnostics
                  ? "Running Diagnostics..."
                  : "Run Diagnostics"}
              </button>
              {diagResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm font-mono border border-gray-200 text-left">
                  <div className="space-y-2">
                    <p>
                      <span className="font-semibold text-gray-700">
                        BOT_TOKEN Loaded from Firestore:
                      </span>{" "}
                      {diagResult.botTokenFirestore ? "YES" : "NO"}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-700">
                        BOT_TOKEN Loaded from Env:
                      </span>{" "}
                      {diagResult.botTokenEnv ? "YES" : "NO"}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-700">
                        BOT_TOKEN Loaded:
                      </span>{" "}
                      {diagResult.loaded ? (
                        <span className="text-green-600 font-bold">YES</span>
                      ) : (
                        <span className="text-red-600 font-bold">NO</span>
                      )}
                    </p>
                    {!diagResult.loaded && (
                      <p>
                        <span className="font-semibold text-gray-700">
                          Exact Failure Reason:
                        </span>{" "}
                        <span className="text-red-600">
                          {diagResult.exactReason}
                        </span>
                      </p>
                    )}
                    {diagResult.loaded && (
                      <>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="font-semibold text-gray-700">
                            Telegram API (getMe) Result:
                          </p>
                          {diagResult.getMeError ? (
                            <p className="text-red-600 mt-1">
                              Error: {diagResult.getMeError}
                            </p>
                          ) : (
                            <pre className="mt-2 text-xs text-green-700 overflow-x-auto bg-green-50 p-3 rounded border border-green-200">
                              {JSON.stringify(
                                diagResult.getMeResponse,
                                null,
                                2,
                              )}
                            </pre>
                          )}
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="font-semibold text-gray-700">
                            Webhook Info Result:
                          </p>
                          {diagResult.webhookError ? (
                            <p className="text-red-600 mt-1">
                              Error: {diagResult.webhookError}
                            </p>
                          ) : (
                            <div className="mt-2 text-xs bg-blue-50 p-3 rounded border border-blue-200">
                              <pre className="text-blue-700 overflow-x-auto mb-2">
                                {JSON.stringify(
                                  diagResult.webhookInfoResponse,
                                  null,
                                  2,
                                )}
                              </pre>
                              {diagResult.webhookInfoResponse && (
                                <div className="text-blue-900 border-t border-blue-200 pt-2 mt-2 space-y-1">
                                  <p>
                                    <span className="font-semibold">
                                      Webhook URL:
                                    </span>{" "}
                                    {diagResult.webhookInfoResponse.url ||
                                      "None"}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Pending Updates:
                                    </span>{" "}
                                    {diagResult.webhookInfoResponse
                                      .pending_update_count || 0}
                                  </p>
                                  <p>
                                    <span className="font-semibold">
                                      Last Error Message:
                                    </span>{" "}
                                    {diagResult.webhookInfoResponse
                                      .last_error_message || "None"}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="pt-4 mt-4 border-t border-gray-300">
                      <p className="text-gray-500 uppercase tracking-wide text-xs mb-3 font-bold font-sans">
                        Diagnostics Section
                      </p>
                      <p>
                        <span className="text-gray-500 font-semibold">Bot Loaded:</span>{" "}
                        {diagResult.loaded ? "Yes" : "NO"}
                      </p>
                      <p>
                        <span className="text-gray-500 font-semibold">Token Source:</span>{" "}
                        Loaded from {diagResult.tokenSource || "None"}
                      </p>
                      {diagResult.getMeResponse?.username && (
                        <p>
                          <span className="text-gray-500 font-semibold">Bot Username:</span>{" "}
                          @{diagResult.getMeResponse.username}
                        </p>
                      )}
                      {diagResult.getMeResponse?.id && (
                        <p>
                          <span className="text-gray-500 font-semibold">Bot ID:</span>{" "}
                          {diagResult.getMeResponse.id}
                        </p>
                      )}
                      <p>
                        <span className="text-gray-500 font-semibold">Webhook Status:</span>{" "}
                        {diagResult.webhookActive ? "Active" : "No"}
                      </p>
                      <p>
                        <span className="text-gray-500 font-semibold">Webhook URL:</span>{" "}
                        {diagResult.webhookInfoResponse?.url || "None"}
                      </p>
                      <p>
                        <span className="text-gray-500 font-semibold">Telegram API Status:</span>{" "}
                        {diagResult.getMeResponse ? "OK" : "Error"}
                      </p>
                      <p>
                        <span className="text-gray-500 font-semibold">Last Error:</span>{" "}
                        <span className="text-red-500">
                          {diagResult.apiError || diagResult.exactReason || "None"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                Storage Configuration
              </h2>
              <div className="space-y-4">
                <StatusRow
                  label="Storage Channel Connected"
                  status={
                    storageStats?.storageChannelConnected ? "online" : "offline"
                  }
                />
                <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Channel Name:</span>
                    <span className="font-medium text-gray-800">
                      {storageStats?.channelName || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Channel Chat ID:</span>
                    <span className="font-mono text-gray-800">
                      {storageStats?.channelChatId || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Stored Files:</span>
                    <span className="font-mono text-gray-800">
                      {storageStats !== null
                        ? storageStats.totalStoredFiles
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Storage Health:</span>
                    <span className="font-medium text-green-600">
                      {storageStats?.storageHealth || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Upload:</span>
                    <span className="font-mono text-gray-800">
                      {storageStats?.lastUpload &&
                      storageStats.lastUpload !== "Never"
                        ? new Date(storageStats.lastUpload).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold flex items-center justify-between mb-4">
                System Status
                <RefreshCcw
                  className={cn(
                    "w-4 h-4 text-gray-400",
                    !sysStatus && "animate-spin",
                  )}
                />
              </h2>

              <div className="space-y-4">
                <StatusRow
                  label="Backend API"
                  status={sysStatus?.backendOnline ? "online" : "offline"}
                />
                <StatusRow
                  label="Bot Initialized"
                  status={sysStatus?.hasToken ? "online" : "offline"}
                />
                <StatusRow
                  label="Webhook Setup"
                  status={sysStatus?.webhookUrl ? "online" : "offline"}
                />
                <StatusRow
                  label="Telegram API"
                  status={
                    sysStatus?.telegramApiStatus === "online"
                      ? "online"
                      : "offline"
                  }
                />
              </div>

              <div className="mt-6 space-y-3 pt-6 border-t border-gray-100 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Bot Username:</span>
                  <span className="font-mono text-gray-800">
                    {sysStatus?.botUsername
                      ? `@${sysStatus.botUsername}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bot ID:</span>
                  <span className="font-mono text-gray-800">
                    {sysStatus?.botId || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Update:</span>
                  <span
                    className="font-mono text-gray-800 text-xs text-right max-w-[150px] truncate"
                    title={sysStatus?.lastTelegramUpdate}
                  >
                    {sysStatus?.lastTelegramUpdate
                      ? new Date(
                          sysStatus.lastTelegramUpdate,
                        ).toLocaleTimeString()
                      : "Never"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Webhook Hit Count:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {sysStatus?.webhookHitCount || 0}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Last Command Received:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {sysStatus?.lastCommandReceived || "None"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Last User ID:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {sysStatus?.lastUserId || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Last Chat ID:</span>
                  <span className="font-mono text-gray-800 text-xs">
                    {sysStatus?.lastChatId || "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Last Response:</span>
                  <span
                    className="font-mono text-gray-800 text-xs text-right max-w-[150px] truncate"
                    title={sysStatus?.lastBotResponse}
                  >
                    {sysStatus?.lastBotResponse
                      ? new Date(sysStatus.lastBotResponse).toLocaleTimeString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-gray-500">Last Error:</span>
                  <span
                    className={cn(
                      "font-mono text-xs p-2 rounded",
                      sysStatus?.lastTelegramError
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-gray-400",
                    )}
                  >
                    {sysStatus?.lastTelegramError || "None"}
                  </span>
                </div>
              </div>

              {sysStatus?.webhookUrl && (
                <div className="mt-4 pt-4 border-t border-gray-100 overflow-hidden">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Webhook URL
                  </p>
                  <p className="text-xs font-mono text-gray-600 break-all bg-gray-50 p-2 rounded">
                    {sysStatus.webhookUrl}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
        )}
        
        {activeTab === "users" && <UsersAdminPanel user={user} />}
        
        {activeTab === "ads" && (
          <AdsAdminPanel 
            botConfig={botConfig}
            setBotConfig={setBotConfig}
            saving={saving}
            saveSuccess={saveSuccess}
            isDirty={isDirty}
            handleSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}

function EarningsVerificationAdmin({ sysStatus }: { sysStatus: any }) {
  if (!sysStatus) return null;
  
  const suspiciousUsers = sysStatus.suspiciousUsers || [];
  
  return (
    <div className="flex flex-col gap-6 mt-6">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        Verification & Anti-Fraud Monitor
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold uppercase">Total Verified</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{sysStatus.totalVerifiedDls || 0}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <p className="text-xs text-red-600 font-semibold uppercase">Total Rejected</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{sysStatus.totalRejectedDls || 0}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-600 font-semibold uppercase">Fraud Attempts</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{sysStatus.fraudAttempts || 0}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
            <p className="text-xs text-purple-600 font-semibold uppercase">Pending Earnings</p>
            <p className="text-xl font-bold text-gray-900 mt-1">₹{(sysStatus.pendingEarningsTotal || 0).toFixed(2)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <p className="text-xs text-green-600 font-semibold uppercase">Withdrawable</p>
            <p className="text-xl font-bold text-gray-900 mt-1">₹{(sysStatus.totalWithdrawableEarnings || 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-red-600">
        <AlertTriangle className="w-5 h-5" /> Suspicious Users & Fraud Rules
      </h2>
      {suspiciousUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No high-risk users detected.</p>
      ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                       <th className="pb-3 px-4 font-medium">Uploader ID</th>
                       <th className="pb-3 px-4 font-medium">Fraud Score</th>
                       <th className="pb-3 px-4 font-medium">Total Downloads</th>
                       <th className="pb-3 px-4 font-medium">Rejected Downloads</th>
                       <th className="pb-3 px-4 font-medium">Risk Level</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {suspiciousUsers.map((su: any, i: number) => {
                       let levelStr = "Safe";
                       let levelColor = "text-green-600 bg-green-50";
                       // 0-30 = Safe, 31-70 = Suspicious, 71-100 = High Risk
                       if (su.fraudScore > 70) {
                           levelStr = "High Risk";
                           levelColor = "text-red-600 bg-red-50";
                       } else if (su.fraudScore > 30) {
                           levelStr = "Suspicious";
                           levelColor = "text-orange-600 bg-orange-50";
                       }
                       
                       return (
                           <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4 font-mono">{su.uploaderId}</td>
                              <td className="py-3 px-4 font-bold">{su.fraudScore}/100</td>
                              <td className="py-3 px-4">{su.total}</td>
                              <td className="py-3 px-4 text-red-600">{su.rejected}</td>
                              <td className="py-3 px-4">
                                  <span className={`text-xs px-2 py-1 rounded ${levelColor}`}>
                                      {levelStr}
                                  </span>
                              </td>
                           </tr>
                       )
                    })}
                </tbody>
            </table>
          </div>
      )}
    </div>
    </div>
  );
}

function WithdrawalsAdminPanel({ user }: { user: any }) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error", text: string } | null>(null);
  
  const showMsg = (type: "success" | "error", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchWithdrawals = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetchApi("/api/admin/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Failed to load withdrawals", res.status);
        return;
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setWithdrawals(data);
      } catch (err) {
        console.error("Withdrawals not JSON", text.substring(0, 50));
      }
    } catch (e: any) {
      if (e.message !== "Failed to fetch") console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    const intv = setInterval(fetchWithdrawals, 10000);
    return () => clearInterval(intv);
  }, []);

  const handleStatus = async (id: string, status: string, reason?: string) => {
    console.log(`handleStatus called for id=${id}, status=${status}`);
    try {
      const token = await user.getIdToken();
      const res = await fetchApi(`/api/admin/withdrawals/${id}/status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, reason }),
      });
      console.log(`handleStatus response HTTP status: ${res.status}`);
      if (!res.ok) {
        const errText = await res.text();
        console.error("handleStatus Error Response:", errText);
        throw new Error(errText || "Failed to update status");
      }
      await fetchWithdrawals();
      showMsg("success", `Withdrawal ${status} successfully!`);
    } catch (e: any) {
      console.error("handleStatus Exception:", e);
      showMsg("error", e.message || "An error occurred");
    }
  };

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;
  const approvedCount = withdrawals.filter((w) => w.status === "approved").length;
  const rejectedCount = withdrawals.filter((w) => w.status === "rejected").length;
  const totalAmount = withdrawals.filter((w) => w.status === "approved" || w.status === "pending").reduce((sum, w) => sum + (w.amount || 0), 0);
  const totalApprovedAmount = withdrawals.filter((w) => w.status === "approved").reduce((sum, w) => sum + (w.amount || 0), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6 w-full">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
        Withdrawal Requests
      </h2>
      <div className="flex gap-4 mb-6 text-sm flex-wrap">
        <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-100">
          <span className="text-yellow-700 font-semibold">Pending:</span>{" "}
          {pendingCount}
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
          <span className="text-green-700 font-semibold">Approved:</span>{" "}
          {approvedCount}
        </div>
        <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100">
          <span className="text-red-700 font-semibold">Rejected:</span>{" "}
          {rejectedCount}
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <span className="text-blue-700 font-semibold">Total Withdrawal Amount:</span>{" "}
          ₹{totalApprovedAmount.toFixed(2)}
        </div>
      </div>

      {actionMsg && (
        <div className={cn("mb-4 p-3 rounded-lg text-sm font-medium border flex items-center justify-between", actionMsg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600">
             <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-4 text-gray-500 font-semibold">Date</th>
                <th className="py-2 px-4 text-gray-500 font-semibold">User</th>
                <th className="py-2 px-4 text-gray-500 font-semibold">
                  Amount
                </th>
                <th className="py-2 px-4 text-gray-500 font-semibold">
                  UPI ID
                </th>
                <th className="py-2 px-4 text-gray-500 font-semibold">
                  Status
                </th>
                <th className="py-2 px-4 text-gray-500 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {withdrawals
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                                <div className="font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-full" title={w.name}>
                                  {w.name || w.username}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-full">
                                  @{w.username}
                                </div>
                                <div className="text-xs text-gray-400">ID: {w.userId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">₹{w.amount}</span>
                        <button onClick={() => {
                          navigator.clipboard.writeText(w.amount.toString());
                          showMsg("success", "Amount copied!");
                        }} className="text-gray-400 hover:text-blue-500" title="Copy Amount">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-600 truncate max-w-[150px]" title={w.upiId}>{w.upiId}</span>
                        <button onClick={() => {
                          navigator.clipboard.writeText(w.upiId);
                          showMsg("success", "UPI ID copied!");
                        }} className="text-gray-400 hover:text-blue-500" title="Copy UPI ID">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider",
                          w.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : w.status === "approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800",
                        )}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      {w.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleStatus(w.id, "approved");
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectReason("");
                              setRejectModal({ id: w.id });
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-gray-500 italic"
                  >
                    No withdrawals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Reject Withdrawal</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting this withdrawal request.</p>
            <input 
              type="text"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 mb-4"
              placeholder="Reason for rejection (mandatory)"
            />
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setRejectModal(null)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!rejectReason.trim()) {
                    showMsg("error", "Rejection reason is mandatory.");
                    return;
                  }
                  handleStatus(rejectModal.id, "rejected", rejectReason.trim());
                  setRejectModal(null);
                }} 
                className="px-4 py-2 text-white rounded-lg bg-red-600 hover:bg-red-700"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: "online" | "offline" | "pending";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        {status === "online" && (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
        {status === "offline" && <XCircle className="w-4 h-4 text-red-500" />}
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wider",
            status === "online" ? "text-green-600" : "text-red-600",
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

function UsersAdminPanel({ user }: { user: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  const [balanceModal, setBalanceModal] = useState<{ userId: string, action: "add" | "deduct" } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  
  const [blockModal, setBlockModal] = useState<{ userId: string, currentStatus: boolean } | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const showMsg = (type: "success" | "error", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3000);
  };

  const fetchUsers = async () => {
    try {
      const token = await user.getIdToken();
      const res = await fetchApi("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      if (e.message !== "Failed to fetch") console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBlockToggle = async () => {
    if (!blockModal) return;
    const { userId, currentStatus } = blockModal;
    const actionName = currentStatus ? "unblock" : "block";

    if (!currentStatus && !blockReason.trim()) {
      showMsg("error", "Block reason is mandatory.");
      return;
    }

    setActionLoading(userId);
    setBlockModal(null);
    try {
      const token = await user.getIdToken();
      const res = await fetchApi(`/api/admin/users/${userId}/${actionName}`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: blockReason.trim() })
      });
      if (!res.ok) throw new Error(`Failed to update status`);
      await fetchUsers();
      showMsg("success", `User successfully ${actionName}ed!`);
    } catch (e: any) {
      console.error(e);
      showMsg("error", e.message || "An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBalance = async () => {
    if (!balanceModal) return;
    const { userId, action } = balanceModal;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      showMsg("error", "Invalid amount entered");
      setBalanceModal(null);
      return;
    }
    
    setActionLoading(userId);
    setBalanceModal(null);
    try {
      const token = await user.getIdToken();
      const res = await fetchApi(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount: action === "add" ? amount : -amount })
      });
      if (!res.ok) throw new Error("Failed to update balance");
      await fetchUsers();
      showMsg("success", `Balance successfully updated!`);
    } catch (e: any) {
      console.error(e);
      showMsg("error", e.message || "An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          User Management
        </h2>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
      
      {actionMsg && (
        <div className={cn("mb-4 p-3 rounded-lg text-sm font-medium border flex items-center justify-between", actionMsg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600">
             <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading users...</p>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(u => (
            <div key={u.id} className="border border-gray-200 rounded-xl overflow-hidden text-sm">
              <div 
                className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
                onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-white", u.isBlocked ? "bg-red-500" : "bg-blue-600")}>
                    {u.name.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{u.name} <span className="text-gray-500 font-normal">@{u.username}</span></div>
                    <div className="text-xs text-gray-500">ID: {u.id} • Joined: {new Date(u.joinDate).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="font-bold text-gray-900">₹{u.currentBalance.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Balance</div>
                  </div>
                  {expandedUser === u.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>
              
              {expandedUser === u.id && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
                      <div className="text-xs text-gray-500 uppercase">Downloads (Total/Valid)</div>
                      <div className="font-bold text-gray-900 text-lg">{u.totalDownloads} / <span className="text-green-600">{u.validDownloads || 0}</span></div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                      <div className="text-xs text-red-500 uppercase">Rejected / Fraud</div>
                      <div className="font-bold text-red-600 text-lg">{u.rejectedDownloads || 0}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
                      <div className="text-xs text-gray-500 uppercase">Pending Earnings</div>
                      <div className="font-bold text-purple-600 text-lg">₹{(u.pendingBalance || 0).toFixed(2)}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                      <div className="text-xs text-green-700 uppercase">Total Earned</div>
                      <div className="font-bold text-green-700 text-lg">₹{u.totalEarnings.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-gray-100 pb-4 relative z-10">
                    <button onClick={() => { setBalanceAmount(""); setBalanceModal({ userId: u.id, action: "add" }) }} className="cursor-pointer relative z-20 select-none px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center gap-1 hover:bg-green-100 active:bg-green-200 transition">
                      <Wallet className="w-3.5 h-3.5 pointer-events-none" /> <span>Add Balance</span>
                    </button>
                    <button onClick={() => { setBalanceAmount(""); setBalanceModal({ userId: u.id, action: "deduct" }) }} className="cursor-pointer relative z-20 select-none px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg flex items-center gap-1 hover:bg-yellow-100 active:bg-yellow-200 transition">
                      <Wallet className="w-3.5 h-3.5 pointer-events-none" /> <span>Deduct</span>
                    </button>
                    <button onClick={() => { setBlockReason(""); setBlockModal({ userId: u.id, currentStatus: u.isBlocked }) }} className={cn("cursor-pointer relative z-20 select-none px-3 py-1.5 border rounded-lg flex items-center gap-1 transition", u.isBlocked ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 active:bg-blue-200" : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 active:bg-red-200")}>
                      {u.isBlocked ? <CheckCircle className="w-3.5 h-3.5 pointer-events-none" /> : <Ban className="w-3.5 h-3.5 pointer-events-none" />}
                      <span>{u.isBlocked ? "Unblock User" : "Block User"}</span>
                    </button>
                  </div>
                  
                  <div className="flex bg-gray-100 rounded-lg overflow-hidden mt-4">
                    <UserSubViews userObj={u} adminUser={user} />
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
              No users found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Balance Modal */}
      {balanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">{balanceModal.action === "add" ? "Add Balance" : "Deduct Balance"}</h3>
            <p className="text-sm text-gray-600 mb-4">Enter the amount to {balanceModal.action} for this user.</p>
            <input 
              type="number"
              value={balanceAmount}
              onChange={e => setBalanceAmount(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Amount (₹)"
            />
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setBalanceModal(null)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleBalance} 
                className={cn("px-4 py-2 text-white rounded-lg flex items-center gap-2", balanceModal.action === "add" ? "bg-green-600 hover:bg-green-700" : "bg-yellow-500 hover:bg-yellow-600")}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block/Unblock Modal */}
      {blockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">{blockModal.currentStatus ? "Unblock User" : "Block User"}</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to {blockModal.currentStatus ? "unblock" : "block"} this user? {blockModal.currentStatus ? "They will be able to upload and withdraw again." : "They will be prevented from uploading files and making withdrawals."}</p>
            
            {!blockModal.currentStatus && (
              <input 
                type="text"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 mb-6"
                placeholder="Reason for block (mandatory)"
              />
            )}

            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setBlockModal(null)} 
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleBlockToggle} 
                className={cn("px-4 py-2 text-white rounded-lg", blockModal.currentStatus ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700")}
              >
                {blockModal.currentStatus ? "Yes, Unblock" : "Yes, Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserSubViews({ userObj, adminUser }: { userObj: any, adminUser: any }) {
  const [view, setView] = useState<"none" | "files" | "withdrawals">("none");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchView = async (type: "files" | "withdrawals") => {
    if (view === type) {
        setView("none");
        return;
    }
    setView(type);
    setLoading(true);
    try {
      const token = await adminUser.getIdToken();
      const res = await fetchApi(`/api/admin/users/${userObj.id}/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex bg-gray-100 w-full overflow-hidden select-none relative z-10">
        <button 
           type="button"
           onClick={() => fetchView("files")} 
           className={cn("cursor-pointer relative z-20 select-none flex-1 py-2 text-center text-sm font-medium transition active:opacity-70", view === "files" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-200")}
        >
          View User Files
        </button>
        <button 
           type="button"
           onClick={() => fetchView("withdrawals")} 
           className={cn("cursor-pointer relative z-20 select-none flex-1 py-2 text-center text-sm font-medium border-l border-gray-200 transition active:opacity-70", view === "withdrawals" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:bg-gray-200")}
        >
           View Withdrawal History
        </button>
      </div>

      {view !== "none" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {view === "files" ? "User Files" : "Withdrawal History"}
              </h3>
              <button onClick={() => setView("none")} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 border border-gray-100 rounded-lg p-2 bg-gray-50">
               {loading ? <p className="text-gray-400 text-sm text-center p-4">Loading...</p> : (
                   <>
                     {data.length === 0 ? <p className="text-sm text-gray-500 text-center p-4">No records found.</p> : (
                         <div className="space-y-2">
                           {view === "files" && data.map(f => (
                               <div key={f.fileId} className="p-3 bg-white rounded border border-gray-100 flex justify-between items-center text-sm shadow-sm">
                                   <div>
                                     <div className="font-medium text-gray-900">{f.fileName || f.fileId}</div>
                                     <div className="text-xs text-gray-500 mt-1">{new Date(f.uploadDate).toLocaleString()}</div>
                                   </div>
                                   <div className="text-right">
                                     <div className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded inline-block">{f.downloads || 0} DL</div>
                                     <div className="text-green-600 font-bold text-xs mt-1">₹{(f.earnings || 0).toFixed(2)}</div>
                                   </div>
                               </div>
                           ))}
                           {view === "withdrawals" && data.map((w, index) => (
                               <div key={w.id || index} className="p-3 bg-white rounded border border-gray-100 flex justify-between items-center text-sm shadow-sm">
                                   <div>
                                     <div className="font-bold text-gray-900">₹{w.amount}</div>
                                     <div className="text-xs text-gray-500 font-mono mt-1">{w.upiId || w.userId}</div>
                                     <div className="text-xs text-gray-400 mt-0.5">{w.createdAt ? new Date(w.createdAt).toLocaleString() : "Unknown"}</div>
                                   </div>
                                   <div className="text-right">
                                     <span className={cn("px-2 py-1 text-xs font-bold rounded uppercase", w.status === "approved" ? "bg-green-100 text-green-700" : w.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700")}>
                                       {w.status}
                                     </span>
                                     {w.reason && <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate">{w.reason}</div>}
                                   </div>
                               </div>
                           ))}
                         </div>
                     )}
                   </>
               )}
            </div>
            
            <div className="mt-4 text-right">
               <button onClick={() => setView("none")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function AdsAdminPanel({
  botConfig,
  setBotConfig,
  saving,
  saveSuccess,
  isDirty,
  handleSave,
}: {
  botConfig: any;
  setBotConfig: any;
  saving: boolean;
  saveSuccess: boolean;
  isDirty: boolean;
  handleSave: (config?: any) => void;
}) {
  const AD_TYPES = [
    { id: "header_banner", label: "Header Banner", icon: Tv, bg: false },
    { id: "middle_banner", label: "Middle Banner", icon: Tv, bg: false },
    { id: "center_banner", label: "Center Banner", icon: Tv, bg: false },
    { id: "footer_banner", label: "Footer Banner", icon: Tv, bg: false },
    { id: "popunder", label: "Popunder Ads", icon: Sliders, bg: true },
    { id: "push_notification", label: "Push Notification Ads", icon: Zap, bg: true },
    { id: "in_page_push", label: "In-Page Push Banner", icon: Globe, bg: true },
    { id: "vignette", label: "Vignette Banner", icon: FileText, bg: true },
    { id: "direct_link", label: "Direct Link Ads", icon: ExternalLink, bg: true },
  ];

  const adsList = Array.isArray(botConfig.adsList) ? botConfig.adsList : [];
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    id: "",
    placement: "header_banner",
    enabled: true,
    name: "",
    network: "Adsterra",
    scriptCode: "",
  });

  const totalAds = adsList.length;
  const activeAds = adsList.filter((a: any) => a.enabled).length;
  const disabledAds = adsList.filter((a: any) => !a.enabled).length;
  const totalClicks = adsList.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0);
  const totalImpressions = adsList.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0);

  const filteredAds = adsList.filter((ad: any) => {
    const matchesSearch = ad.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (AD_TYPES.find(t => t.id === ad.placement)?.label || ad.placement || "").toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    if (filterType !== 'all') {
      const p = (ad.placement || "").toLowerCase();
      if (filterType === 'banner') {
        matchesFilter = p.includes('banner') && !p.includes('push');
      } else if (filterType === 'popunder') {
         matchesFilter = p.includes('popunder');
      } else if (filterType === 'push') {
        matchesFilter = p.includes('push');
      } else if (filterType === 'direct') {
        matchesFilter = p.includes('direct');
      }
    }
    return matchesSearch && matchesFilter;
  });

  const openNewAdModal = () => {
    setFormData({
      id: "",
      placement: AD_TYPES[0].id,
      enabled: true,
      name: "",
      network: "Adsterra",
      scriptCode: "",
    });
    setShowModal(true);
  };

  const editAd = (ad: any) => {
    setFormData({
      ...ad
    });
    setShowModal(true);
  };

  const duplicateAd = (ad: any) => {
    setFormData({
      ...ad,
      id: "",
      name: `${ad.name} (Copy)`
    });
    setShowModal(true);
  };

  const saveAd = () => {
    if (!formData.name.trim() || !formData.scriptCode.trim()) {
      alert("Please enter Ad Name and Script!");
      return;
    }
    
    const updatedList = [...adsList];
    const payload = {
      ...formData,
      id: formData.id || Math.random().toString(36).substring(2, 9),
      type: AD_TYPES.find(t => t.id === formData.placement)?.label || "Banner",
      priority: 10,
      impressions: formData.id ? (adsList.find((a: any) => a.id === formData.id)?.impressions || 0) : 0,
      clicks: formData.id ? (adsList.find((a: any) => a.id === formData.id)?.clicks || 0) : 0,
      ctr: formData.id ? (adsList.find((a: any) => a.id === formData.id)?.ctr || 0) : 0,
    };

    if (formData.id) {
      const index = updatedList.findIndex((a: any) => a.id === formData.id);
      if (index >= 0) updatedList[index] = payload;
      else updatedList.push(payload);
    } else {
      updatedList.push(payload);
    }

    const newConfig = { ...botConfig, adsList: updatedList };
    setBotConfig(newConfig);
    handleSave(newConfig);
    setShowModal(false);
  };

  const confirmDelete = () => {
    if (!showConfirmDelete) return;
    const updated = adsList.filter((a: any) => a.id !== showConfirmDelete);
    const newConfig = { ...botConfig, adsList: updated };
    setBotConfig(newConfig);
    handleSave(newConfig);
    setShowConfirmDelete(null);
  };

  const toggleAdEnabled = (id: string) => {
    const updated = adsList.map((a: any) => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    const newConfig = { ...botConfig, adsList: updated };
    setBotConfig(newConfig);
    handleSave(newConfig);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dashboard Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Ads", value: totalAds, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: activeAds, color: "text-green-600", bg: "bg-green-50" },
          { label: "Disabled", value: disabledAds, color: "text-red-600", bg: "bg-red-50" },
          { label: "Impressions", value: totalImpressions, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Clicks", value: totalClicks, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 rounded-xl border border-gray-100 shadow-sm`}>
            <div className="text-sm font-bold text-gray-500 mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search ads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl w-full sm:w-64 focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm bg-white text-sm font-medium text-gray-700 w-full sm:w-auto"
          >
            <option value="all">All Ads</option>
            <option value="banner">Banner Ads</option>
            <option value="popunder">Popunder</option>
            <option value="push">Push Ads</option>
            <option value="direct">Direct Link</option>
          </select>
        </div>
        <button
          onClick={openNewAdModal}
          className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Create New Ad
        </button>
      </div>

      {/* Ads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAds.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No Ads Found</h3>
            <p>You haven't created any ads matching this criteria yet.</p>
          </div>
        ) : (
          filteredAds.map((ad: any) => (
            <div key={ad.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-300 hover:shadow-md transition-all relative">
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 truncate" title={ad.name}>{ad.name}</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    {ad.enabled ? (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Disabled
                      </span>
                    )}
                    {(!ad.scriptCode || ad.scriptCode.trim() === '') && (
                       <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded uppercase">
                         Draft
                       </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 bg-gray-50/50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                    <span className="font-bold text-gray-700">Display Slot</span>
                    <button
                      type="button"
                      onClick={() => toggleAdEnabled(ad.id)}
                      className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500",
                        ad.enabled ? "bg-green-500" : "bg-gray-200"
                      )}
                    >
                      <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200", ad.enabled ? "translate-x-5" : "translate-x-0")} />
                    </button>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Network</span>
                    <span className="font-bold text-gray-900 truncate max-w-[150px]">{ad.network || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500 font-medium">Placement</span>
                    <span className="font-bold text-gray-900 truncate pl-2">{AD_TYPES.find(t => t.id === ad.placement)?.label || ad.placement}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
                    <span className="text-gray-500 font-medium">Impressions</span>
                    <span className="font-bold text-purple-600">{ad.impressions || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Clicks</span>
                    <span className="font-bold text-orange-600">{ad.clicks || 0}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="grid grid-cols-4 border-t border-gray-100 bg-white">
                <button 
                  onClick={() => editAd(ad)}
                  className="py-3 flex justify-center items-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit Ad"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => duplicateAd(ad)}
                  className="py-3 items-center flex justify-center text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-colors border-l border-gray-100"
                  title="Duplicate Ad"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowPreviewModal(ad.id)}
                  className="py-3 flex justify-center items-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border-l border-gray-100"
                  title="Live Preview"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(ad.id)}
                  className="py-3 flex justify-center items-center text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors border-l border-gray-100"
                  title="Delete Ad"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Create Ad Button for Mobile/Desktop */}
      <button
        onClick={openNewAdModal}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all active:scale-90 hover:scale-105 flex items-center justify-center group"
        title="Create New Ad"
      >
        <Plus className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100 font-bold group-hover:ml-2">
           Create New Ad
        </span>
      </button>

      {/* Saving Overlay */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg font-bold flex items-center gap-3 z-[60]">
          <RefreshCcw className="w-5 h-5 animate-spin" />
          Deploying...
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl my-auto animate-fade-in relative z-50">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {formData.id ? "Edit Ad Configuration" : "Create New Ad"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">Ad Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    placeholder="e.g. Native Banner 1" 
                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">Ad Network</label>
                  <input 
                    type="text" 
                    value={formData.network} 
                    onChange={(e) => setFormData(prev => ({...prev, network: e.target.value}))}
                    placeholder="e.g. Monetag, Adsterra" 
                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">Placement Slot</label>
                <select
                  value={formData.placement}
                  onChange={(e) => setFormData(prev => ({...prev, placement: e.target.value}))}
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  {AD_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.label} {t.bg ? "(Background/Popup)" : "(Visible Box)"}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">Ad Script Box (HTML/JS)</label>
                <textarea 
                  rows={6} 
                  value={formData.scriptCode} 
                  onChange={(e) => setFormData(prev => ({...prev, scriptCode: e.target.value}))}
                  placeholder="<!-- Paste script here -->"
                  className="w-full border border-gray-200 px-4 py-3 rounded-xl bg-gray-900 text-green-400 font-mono text-sm leading-snug shadow-inner"
                />
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <input 
                   type="checkbox" 
                   id="ad-enabled-checkbox"
                   checked={formData.enabled}
                   onChange={(e) => setFormData(prev => ({...prev, enabled: e.target.checked}))}
                   className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="ad-enabled-checkbox" className="font-bold text-gray-700 cursor-pointer">
                  Enable this Ad immediately
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl sticky bottom-0 z-10 w-full">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={saveAd}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Save Ad Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in relative z-50">
             <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
               <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                 <AlertTriangle className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-bold text-gray-900 text-center mb-1">Delete Ad?</h3>
               <p className="text-red-600 text-sm text-center font-medium">This action cannot be undone.</p>
             </div>
             <div className="p-6">
               <div className="flex justify-end gap-3 mt-2">
                 <button 
                   onClick={() => setShowConfirmDelete(null)}
                   className="w-full px-4 py-2.5 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmDelete}
                   className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow transition-all"
                 >
                   Yes, Delete
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex flex-col p-4 md:p-8 bg-gray-900/80 backdrop-blur-md">
           <div className="flex justify-between items-center mb-4 relative z-50">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Eye className="w-6 h-6 text-blue-400" />
                Ad Preview Mode
              </h2>
              <button 
                 onClick={() => setShowPreviewModal(null)} 
                 className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-all"
              >
                <XCircle className="w-8 h-8" />
              </button>
           </div>
           <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl relative border-4 border-gray-800 z-50">
              <iframe 
                src={`/file/preview?preview_ad=${showPreviewModal}`} 
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                title="Ad Preview"
              />
           </div>
        </div>
      )}

    </div>
  );
}

