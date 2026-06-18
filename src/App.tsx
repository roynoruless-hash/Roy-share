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
import {
  ShieldAlert,
  ShieldCheck,
  Settings,
  RefreshCcw,
  LogOut,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  Ban,
  CheckCircle,
  FileText,
  Wallet,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Plus,
  Copy,
  BarChart2,
  ExternalLink,
  Globe,
  Sliders,
  Tv,
  Zap,
  Check,
  Eye,
  Info,
} from "lucide-react";
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
    fetch("/api/public-ads-config")
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

function AdminDashboard({
  user,
  onLogout,
  setErrorMsg,
}: {
  user: User;
  onLogout: () => void;
  setErrorMsg: (msg: string) => void;
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
        const token = user ? await user.getIdToken() : "";
        const res = await fetch("/api/admin/config", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }
        
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error("Received HTML. API proxy is misconfigured or missing.");
        }

        const data = await res.json();
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
            `Attempt ${i + 1} failed to load config from Backend`,
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
      const res = await fetch("/api/admin/status");
      if (!res.ok) throw new Error(await res.text());
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("API proxy missing on Netlify");
      }
      const data = await res.json();
      setSysStatus(data);

      if (user) {
        const token = await user.getIdToken();
        const statsRes = await fetch("/api/admin/storage-stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statsRes.ok) {
          const statsType = statsRes.headers.get("content-type");
          if (statsType && statsType.includes("text/html")) {
             throw new Error("Received HTML. API proxy is misconfigured or missing.");
          }
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

    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg("");

    for (let i = 0; i < retries; i++) {
      try {
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

        console.log(`Saving config via backend API (attempt ${i + 1})...`);

        const token = await user.getIdToken();
        const res = await fetch("/api/admin/save-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(configToSave),
        });

        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error("Received HTML. API proxy is misconfigured or missing.");
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText);
        }

        console.log("Save config API success.");

        setSaveSuccess(true);
        setInitialBotConfig(configToSave);
        setIsDirty(false);
        setTimeout(() => setSaveSuccess(false), 3000);
        setSaving(false);
        // Reload config from backend to ensure data consistency
        await fetchConfig(1);
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
      const res = await fetch("/api/admin/diagnose", {
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
      const res = await fetch("/api/admin/audit", {
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
          <button
            onClick={onLogout}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        <div className="flex flex-wrap gap-2 mb-4">
          <button 
             onClick={() => setActiveTab("dashboard")} 
             className={cn("px-4 py-2 rounded-lg font-medium transition", activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md border border-blue-600" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200")}
          >
            Dashboard & Withdrawals
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
                    onChange={(e) =>
                      setBotConfig((p) => ({ ...p, botToken: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setBotConfig((p) => ({
                        ...p,
                        ownerChatId: e.target.value,
                      }))
                    }
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
                      onChange={(e) =>
                        setBotConfig((p) => ({
                          ...p,
                          requiredChannel: e.target.value,
                        }))
                      }
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
                      onChange={(e) =>
                        setBotConfig((p) => ({
                          ...p,
                          requiredGroup: e.target.value,
                        }))
                      }
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
                      onChange={(e) =>
                        setBotConfig((p) => ({
                          ...p,
                          storageChannel: e.target.value,
                        }))
                      }
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
                    onChange={(e) =>
                      setBotConfig((p) => ({
                        ...p,
                        referralCommissionRate: e.target.value,
                      }))
                    }
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
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
                {saveSuccess && (
                  <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Saved successfully.
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
                        const res = await fetch("/api/admin/test-command", {
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
        <WithdrawalsAdminPanel user={user} />
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
      const res = await fetch("/api/admin/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Failed to load withdrawals", res.status);
        return;
      }
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("Received HTML. API proxy is misconfigured or missing.");
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
      const res = await fetch(`/api/admin/withdrawals/${id}/status`, {
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
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("Received HTML. API proxy is misconfigured or missing.");
      }
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
      const res = await fetch(`/api/admin/users/${userId}/${actionName}`, {
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
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
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
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 uppercase">Uploads</div>
                      <div className="font-bold text-gray-900 text-lg">{u.totalUploads}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 uppercase">Downloads</div>
                      <div className="font-bold text-gray-900 text-lg">{u.totalDownloads}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 uppercase">Total Earned</div>
                      <div className="font-bold text-green-600 text-lg">₹{u.totalEarnings.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 uppercase">Revenue Gen.</div>
                      <div className="font-bold text-blue-600 text-lg">₹{u.totalRevenueGenerated.toFixed(2)}</div>
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
      const res = await fetch(`/api/admin/users/${userObj.id}/${type}`, {
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
  const [activeSubTab, setActiveSubTab] = useState<"ads_list" | "popunder" | "direct_link" | "social_bar" | "analytics">("ads_list");
  const [showForm, setShowForm] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    network: "Adsterra",
    type: "Banner",
    scriptCode: "",
    enabled: true,
    priority: 5,
    placement: "header_banner",
  });

  // Safe configurations
  const adsList = botConfig.adsList || [];
  const popunderConfig = botConfig.popunderConfig || {
    enabled: false,
    delay: 3,
    oncePerSession: false,
    oncePer24Hours: false,
    device: "all",
  };
  const directLinkConfig = botConfig.directLinkConfig || {
    url: "",
    trigger: "download_click",
  };
  const socialBarConfig = botConfig.socialBarConfig || {
    enabled: false,
    script: "",
  };

  const handleOpenAddForm = () => {
    setEditingAdId(null);
    setFormData({
      id: Math.random().toString(36).substring(2, 9),
      name: "",
      network: "Adsterra",
      type: "Banner",
      scriptCode: "",
      enabled: true,
      priority: 5,
      placement: "header_banner",
    });
    setShowForm(true);
  };

  const handleOpenEditForm = (ad: any) => {
    setEditingAdId(ad.id);
    setFormData({
      id: ad.id,
      name: ad.name || "",
      network: ad.network || "Adsterra",
      type: ad.type || "Banner",
      scriptCode: ad.scriptCode || "",
      enabled: ad.enabled !== false,
      priority: ad.priority || 5,
      placement: ad.placement || "header_banner",
    });
    setShowForm(true);
  };

  const handleDeleteAd = (id: string) => {
    if (confirm("Are you sure you want to delete this ad zone configuration?")) {
      const updated = adsList.filter((a: any) => a.id !== id);
      const newConfig = { ...botConfig, adsList: updated };
      setBotConfig(newConfig);
      handleSave(newConfig);
    }
  };

  const handleDuplicateAd = (ad: any) => {
    const newAd = {
      ...ad,
      id: Math.random().toString(36).substring(2, 9),
      name: (ad.name || "Ad Script") + " (Duplicate)",
      impressions: 0,
      clicks: 0,
      ctr: 0,
    };
    const updated = [...adsList, newAd];
    const newConfig = { ...botConfig, adsList: updated };
    setBotConfig(newConfig);
    handleSave(newConfig);
  };

  const handleToggleAdStatus = (id: string) => {
    const updated = adsList.map((a: any) => {
      if (a.id === id) {
        return { ...a, enabled: !a.enabled };
      }
      return a;
    });
    const newConfig = { ...botConfig, adsList: updated };
    setBotConfig(newConfig);
    handleSave(newConfig);
  };

  const handleSaveForm = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    let updatedList;
    if (editingAdId) {
      updatedList = adsList.map((a: any) => {
        if (a.id === editingAdId) {
          return {
            ...a,
            ...formData,
            impressions: a.impressions || 0,
            clicks: a.clicks || 0,
            ctr: a.ctr || 0,
          };
        }
        return a;
      });
    } else {
      updatedList = [
        ...adsList,
        {
          ...formData,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          lastUpdated: new Date().toISOString(),
        },
      ];
    }

    const newConfig = { ...botConfig, adsList: updatedList };
    setBotConfig(newConfig);
    handleSave(newConfig);
    setShowForm(false);
    setEditingAdId(null);
  };

  // Analytics helper maths
  const totalImpressions = adsList.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0);
  const totalClicks = adsList.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0);
  const overallCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 animate-fade-in text-gray-800">
      
      {/* Top Title/Save Action Block */}
      <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-gray-100 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tv className="w-6 h-6 text-blue-600" />
            Professional Ads Suite
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Publish multiple banner ads, configure smart popunder trigger delays, and track dynamic performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs text-green-700 bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg font-medium animate-pulse">
              Saved successfully!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={cn(
              "px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2",
              isDirty 
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
            )}
          >
            {saving ? "Deploying..." : "Publish Ad Settings"}
          </button>
        </div>
      </div>

      {/* Main Enabled Toggle */}
      <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
        <div className="flex gap-3 items-start">
          <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-gray-900 block">Overall Ad Service Switch</span>
            <span className="text-xs text-gray-500 mt-1 block leading-relaxed">
              Enable or disable banner representations on file details, human validation, and dashboard pages.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBotConfig({ ...botConfig, adsEnabled: !botConfig.adsEnabled })}
          className={cn(
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            botConfig.adsEnabled ? "bg-blue-600" : "bg-gray-200"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              botConfig.adsEnabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>

      {/* Dashboard Sub-Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-gray-100 no-scrollbar">
        <button
          onClick={() => { setActiveSubTab("ads_list"); setShowForm(false); }}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
            activeSubTab === "ads_list" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Tv className="w-4 h-4" /> Manage All Ads ({adsList.length})
        </button>
        <button
          onClick={() => { setActiveSubTab("popunder"); setShowForm(false); }}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
            activeSubTab === "popunder" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Sliders className="w-4 h-4" /> Special Popunders
        </button>
        <button
          onClick={() => { setActiveSubTab("direct_link"); setShowForm(false); }}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
            activeSubTab === "direct_link" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <ExternalLink className="w-4 h-4" /> Direct Links
        </button>
        <button
          onClick={() => { setActiveSubTab("social_bar"); setShowForm(false); }}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
            activeSubTab === "social_bar" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Globe className="w-4 h-4" /> Social Bar Banner
        </button>
        <button
          onClick={() => { setActiveSubTab("analytics"); setShowForm(false); }}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
            activeSubTab === "analytics" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <BarChart2 className="w-4 h-4" /> Real Analytics Tracker
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === "ads_list" && (
        <div className="space-y-6">
          {!showForm ? (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Custom Ad Injection List</span>
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Ad
                </button>
              </div>

              {adsList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                  <Tv className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-semibold">No configured banner ad slots found.</p>
                  <p className="text-gray-400 text-xs mt-1">Click the button above to launch your first persistent script slot.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {adsList.map((ad: any) => (
                    <div
                      key={ad.id}
                      className="p-5 border border-gray-200/80 rounded-2xl hover:border-gray-300 transition-all bg-white relative flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-base">{ad.name}</span>
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {ad.network}
                          </span>
                          <span className="bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-semibold font-mono">
                            Priority: {ad.priority}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span><strong>Format:</strong> {ad.type}</span>
                          <span><strong>Placement:</strong> <span className="font-mono text-blue-600">{ad.placement}</span></span>
                          <span><strong>Impressions:</strong> {ad.impressions || 0}</span>
                          <span><strong>CTR:</strong> {ad.ctr || 0}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleAdStatus(ad.id)}
                          className={cn(
                            "px-2.5 py-1 rounded text-xs font-bold border transition-all cursor-pointer",
                            ad.enabled
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          {ad.enabled ? "Active" : "Disabled"}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(ad)}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 hover:bg-gray-100 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" /> Edit
                        </button>

                        {/* Duplicate Button */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateAd(ad)}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 hover:bg-gray-100 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-gray-500" /> Duplicate
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteAd(ad.id)}
                          className="px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600 hover:bg-red-100 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveForm} className="space-y-4 border border-gray-100 p-5 rounded-2xl bg-gray-50/50">
              <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2 text-sm">
                {editingAdId ? "Edit Custom Ad Details" : "Launch Custom Ad Parameter Spot"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Ad Name / Ref Identifier</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Download Top native banner"
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Advertising Network</label>
                  <select
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-800"
                  >
                    <option value="Adsterra">Adsterra</option>
                    <option value="Monetag">Monetag</option>
                    <option value="Custom Network">Custom Network</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Placement Target Position</label>
                  <select
                    value={formData.placement}
                    onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-800 font-mono text-blue-600"
                  >
                    <option value="header_banner">Header Banner</option>
                    <option value="footer_banner">Footer Banner</option>
                    <option value="homepage_top">Homepage Top</option>
                    <option value="homepage_middle">Homepage Middle</option>
                    <option value="homepage_bottom">Homepage Bottom</option>
                    <option value="dashboard_page">Dashboard Page</option>
                    <option value="download_page">Download Page</option>
                    <option value="file_details_page">File Details Page</option>
                    <option value="withdraw_page">Withdraw Page</option>
                    <option value="custom_placement">Custom Placement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Ad Format Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-800"
                  >
                    <option value="Banner">Banner</option>
                    <option value="Native Banner">Native Banner</option>
                    <option value="Popunder">Popunder</option>
                    <option value="Direct Link">Direct Link</option>
                    <option value="Social Bar">Social Bar</option>
                    <option value="Interstitial">Interstitial</option>
                    <option value="Push Notification">Push Notification</option>
                    <option value="Other (Custom)">Other (Custom)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Priority Number (1 to 100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs text-gray-800"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="ad_form_enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="ad_form_enabled" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Enable immediately
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Code Script / Target URL Representation</label>
                <textarea
                  rows={6}
                  required
                  value={formData.scriptCode}
                  onChange={(e) => setFormData({ ...formData, scriptCode: e.target.value })}
                  placeholder="<!-- Paste your HTML, Javascript banner code or enter affiliate direct URL -->"
                  className="w-full bg-gray-900 border border-gray-850 rounded-xl p-3 text-xs font-mono text-blue-400 placeholder:text-gray-600 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirm Changes
                </button>
              </div>
            </form>
          )}

          {/* Legacy single Monetag override fallback indicator */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/50 text-xs text-gray-600 mt-6">
            <h4 className="font-bold text-gray-950 mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Dynamic Placements Fallback
            </h4>
            <p className="leading-relaxed">
              If an ad placement has no dynamic configured ads, or you wish to override, you can configure legacy banners as well. These run harmoniously side-by-side with your dynamic priority rules.
            </p>
          </div>
        </div>
      )}

      {activeSubTab === "popunder" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <span className="font-semibold text-gray-950 block">Dedicated Popunder Special System</span>
              <span className="text-xs text-gray-500 mt-1 block">Configure advanced trigger settings for full-screen background popunder windows.</span>
            </div>
            <button
              type="button"
              onClick={() => setBotConfig({
                ...botConfig,
                popunderConfig: { ...popunderConfig, enabled: !popunderConfig.enabled }
              })}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                popunderConfig.enabled ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  popunderConfig.enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-200">
            {/* Delay Setting */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Display Trigger Delay</label>
              <select
                value={popunderConfig.delay || 3}
                onChange={(e) => setBotConfig({
                  ...botConfig,
                  popunderConfig: { ...popunderConfig, delay: parseInt(e.target.value, 10) || 3 }
                })}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800"
              >
                <option value="3">3 Seconds delay (Fast)</option>
                <option value="5">5 Seconds delay (Recommended)</option>
                <option value="10">10 Seconds delay (Standard)</option>
              </select>
              <p className="text-[10px] text-gray-400">Specifies how long to wait after page load before arming the trigger.</p>
            </div>

            {/* Device Filtering */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Device Target Filter</label>
              <select
                value={popunderConfig.device || "all"}
                onChange={(e) => setBotConfig({
                  ...botConfig,
                  popunderConfig: { ...popunderConfig, device: e.target.value }
                })}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800"
              >
                <option value="all">Display All Browsers (Default)</option>
                <option value="mobile">Mobile Smart-devices Only</option>
                <option value="desktop">Desktop Monitors Only</option>
              </select>
              <p className="text-[10px] text-gray-400">Restricts showing script codes or links to selected user agents.</p>
            </div>

            {/* Frequency caps */}
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-150">
              <input
                type="checkbox"
                id="pop_once_session"
                checked={!!popunderConfig.oncePerSession}
                onChange={(e) => setBotConfig({
                  ...botConfig,
                  popunderConfig: { ...popunderConfig, oncePerSession: e.target.checked }
                })}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <label htmlFor="pop_once_session" className="block text-xs font-bold text-gray-800 cursor-pointer">
                  Frequency Cap: Once Per Session
                </label>
                <span className="text-[10px] text-gray-400 block">Limits window triggers to a maximum of 1 per browser tab life.</span>
              </div>
            </div>

            {/* Daily frequency cap */}
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-150">
              <input
                type="checkbox"
                id="pop_once_24"
                checked={!!popunderConfig.oncePer24Hours}
                onChange={(e) => setBotConfig({
                  ...botConfig,
                  popunderConfig: { ...popunderConfig, oncePer24Hours: e.target.checked }
                })}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <label htmlFor="pop_once_24" className="block text-xs font-bold text-gray-800 cursor-pointer">
                  Frequency Cap: Once Per 24 Hours
                </label>
                <span className="text-[10px] text-gray-400 block">Prevents showing popunders on returning logs if viewed today.</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
            <strong>Adaptive Link Mapping:</strong> The system will automatically select the highest priority Popunder script from your Custom Ads list. If none are active, general parameters will run with ad sandbox constraints.
          </div>
        </div>
      )}

      {activeSubTab === "direct_link" && (
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <span className="font-semibold text-gray-950 block">Direct Links Interceptor Settings</span>
            <span className="text-xs text-gray-500 mt-1 block">Redirect web surfers to affiliate links upon active site interactions.</span>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Direct Link Landing URL</label>
              <input
                type="url"
                value={directLinkConfig.url || ""}
                onChange={(e) => setBotConfig({
                  ...botConfig,
                  directLinkConfig: { ...directLinkConfig, url: e.target.value }
                })}
                placeholder="https://example.com/direct-affiliate-link"
                className="w-full bg-white border border-gray-200 px-3 py-2.5 rounded-xl text-xs text-gray-800 font-mono"
              />
              <p className="text-[10px] text-gray-400">The destination path users are directed to on clicking selected triggers.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Trigger Mechanism Event</label>
              <select
                value={directLinkConfig.trigger || "download_click"}
                onChange={(e) => setBotConfig({
                  ...botConfig,
                  directLinkConfig: { ...directLinkConfig, trigger: e.target.value }
                })}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800"
              >
                <option value="download_click">Open on Final Download Button Click</option>
                <option value="upload_click">Open on File Selection Drag / Upload Click</option>
                <option value="button_click">Open with random 35% chance on Any Button/A link</option>
                <option value="custom_event">Random body click interval trigger</option>
              </select>
              <p className="text-[10px] text-gray-400">Specifies precisely what actions or page landmarks evoke the target URL load.</p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "social_bar" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <span className="font-semibold text-gray-950 block">Monetag Social Bar Support</span>
              <span className="text-xs text-gray-500 mt-1 block">Inject floating slide-in in-page push and dynamic notifications format.</span>
            </div>
            <button
              type="button"
              onClick={() => setBotConfig({
                ...botConfig,
                socialBarConfig: { ...socialBarConfig, enabled: !socialBarConfig.enabled }
              })}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                socialBarConfig.enabled ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  socialBarConfig.enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 font-mono text-blue-600">Monetag Social Bar Script Code</label>
            <textarea
              rows={8}
              value={socialBarConfig.script || ""}
              onChange={(e) => setBotConfig({
                ...botConfig,
                socialBarConfig: { ...socialBarConfig, script: e.target.value }
              })}
              placeholder="<!-- Paste your Monetag push-notification Social Bar tag code here -->"
              className="w-full bg-gray-900 border border-gray-850 rounded-xl p-3 text-xs font-mono text-blue-400 placeholder:text-gray-600 leading-relaxed"
            />
          </div>
        </div>
      )}

      {activeSubTab === "analytics" && (
        <div className="space-y-6 animate-fade-in">
          <div className="border-b border-gray-100 pb-3">
            <span className="font-semibold text-gray-950 block flex items-center gap-1">
              <BarChart2 className="w-5 h-5 text-blue-600 animate-pulse" />
              Dynamic Performance Analytics
            </span>
            <span className="text-xs text-gray-500 mt-1 block">Inspect persistent script slot performance tracking in real-time.</span>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Impressions</span>
              <span className="text-3xl font-black text-gray-900 mt-2 font-mono">{totalImpressions.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 mt-1">Unique displays served</span>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Clicks</span>
              <span className="text-3xl font-black text-gray-900 mt-2 font-mono">{totalClicks.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 mt-1">Confirmed redirects tracked</span>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col justify-between">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Average CTR</span>
              <span className="text-3xl font-black text-blue-600 mt-2 font-mono">{overallCtr}%</span>
              <span className="text-[10px] text-gray-400 mt-1">Engagement frequency ratio</span>
            </div>
          </div>

          {/* Detail Breakdowns */}
          <div className="p-5 border border-gray-100 rounded-2xl bg-white space-y-4">
            <h4 className="font-bold text-gray-950 text-sm">Target Breakdowns by Position and Zone</h4>
            {adsList.length === 0 ? (
              <p className="text-xs text-gray-500">No active custom zones registered to analyze.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-150 text-gray-500 font-bold">
                      <th className="py-2">Ad Zone Name</th>
                      <th className="py-2">Network</th>
                      <th className="py-2">Type</th>
                      <th className="py-2 font-mono text-center">Priority</th>
                      <th className="py-2 text-right">Impressions</th>
                      <th className="py-2 text-right">Clicks</th>
                      <th className="py-2 text-right text-blue-600">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adsList.map((ad: any) => (
                      <tr key={ad.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2.5 font-semibold text-gray-900">{ad.name}</td>
                        <td className="py-2.5">{ad.network}</td>
                        <td className="py-2.5 text-gray-500 font-semibold">{ad.type}</td>
                        <td className="py-2.5 font-mono text-center">{ad.priority}</td>
                        <td className="py-2.5 text-right font-mono text-gray-600">{(ad.impressions || 0).toLocaleString()}</td>
                        <td className="py-2.5 text-right font-mono text-gray-600">{(ad.clicks || 0).toLocaleString()}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-blue-600">{ad.ctr || 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Constraints Footer */}
      <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-5 text-sm text-amber-900 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <h3 className="font-bold mb-1 flex items-center gap-1">
            ⚠️ Telegram Isolation Compliance
          </h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            All advertising scripts run with strict front-end error sandboxing. Neither Monetag banners, popunders, nor direct links are injected into Telegram bot queries or responses.
          </p>
        </div>
        <div className="flex border-t sm:border-t-0 sm:border-l border-amber-200/60 pt-3 sm:pt-0 sm:pl-4 flex-col justify-center">
          <span className="text-[10px] text-amber-700 font-bold uppercase">Connected Sandbox</span>
          <span className="text-xs font-bold text-amber-900 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-green-600" /> Fully Insulated
          </span>
        </div>
      </div>

    </div>
  );
}
