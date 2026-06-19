const fs = require('fs');

const panelHTML = `function AdsAdminPanel({
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

  const [activeTab, setActiveTab] = useState(AD_TYPES[0].id);

  const adsList = Array.isArray(botConfig.adsList) ? botConfig.adsList : [];
  const currentAd = adsList.find((a: any) => a.placement === activeTab);

  const [formData, setFormData] = useState({
    enabled: false,
    name: "",
    network: "Adsterra",
    scriptCode: "",
  });

  useEffect(() => {
    const ad = adsList.find((a: any) => a.placement === activeTab);
    if (ad) {
      setFormData({
        enabled: ad.enabled !== false,
        name: ad.name || "",
        network: ad.network || "Adsterra",
        scriptCode: ad.scriptCode || "",
      });
    } else {
      setFormData({
        enabled: false,
        name: "",
        network: "Adsterra",
        scriptCode: "",
      });
    }
  }, [activeTab, botConfig.adsList]);

  const onSaveAd = () => {
    if (!formData.name.trim() || !formData.scriptCode.trim()) {
      alert("Please enter Ad Name and Script!");
      return;
    }
    const updatedList = [...adsList];
    const existingIndex = updatedList.findIndex((a: any) => a.placement === activeTab);
    
    const payload = {
      id: currentAd?.id || Math.random().toString(36).substring(2, 9),
      placement: activeTab,
      type: AD_TYPES.find(t => t.id === activeTab)?.label || "Banner",
      priority: 10,
      impressions: currentAd?.impressions || 0,
      clicks: currentAd?.clicks || 0,
      ctr: currentAd?.ctr || 0,
      ...formData
    };

    if (existingIndex >= 0) {
      updatedList[existingIndex] = payload;
    } else {
      updatedList.push(payload);
    }

    const newConfig = { ...botConfig, adsList: updatedList };
    setBotConfig(newConfig);
    handleSave(newConfig);
  };

  const onDeleteAd = () => {
    if (!confirm("Are you sure you want to delete this ad?")) return;
    const updatedList = adsList.filter((a: any) => a.placement !== activeTab);
    const newConfig = { ...botConfig, adsList: updatedList };
    setBotConfig(newConfig);
    handleSave(newConfig);
  };

  const activeTypeDef = AD_TYPES.find(t => t.id === activeTab);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 animate-fade-in text-gray-800">
      
      {/* Sidebar / Vertical Tabs */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest px-2 mb-2">Ad Sections</h3>
        {AD_TYPES.map(type => {
          const Icon = type.icon;
          const isActive = activeTab === type.id;
          const hasAd = adsList.some((a: any) => a.placement === type.id);
          return (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between",
                isActive ? "bg-blue-600 text-white shadow-md" : "hover:bg-gray-100 text-gray-700 bg-gray-50"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4", isActive ? "text-blue-200" : "text-gray-400")} />
                {type.label}
              </div>
              {hasAd && (
                <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-white" : "bg-green-500")} />
              )}
            </button>
          );
        })}
      </div>

      {/* Editor Main Content */}
      <div className="flex-1 border border-gray-200 rounded-2xl p-6 bg-gray-50/50">
        <div className="flex justify-between items-center mb-6">
           <div>
             <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
               {activeTypeDef?.label}
               {currentAd?.enabled && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">Active</span>}
             </h2>
             <p className="text-sm text-gray-500 mt-1">Configure parameters for {activeTypeDef?.label.toLowerCase()}</p>
           </div>
           
           <div className="flex items-center gap-3">
             {activeTypeDef?.bg ? (
               <span className="text-xs font-mono font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                 <Zap className="w-3.5 h-3.5" /> Background Script
               </span>
             ) : (
               <span className="text-xs font-mono font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
                 <Eye className="w-3.5 h-3.5" /> Visible Display Box
               </span>
             )}
           </div>
        </div>

        <div className="space-y-5">
           
           {/* Enable / Disable */}
           <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
             <div>
               <span className="font-bold text-gray-900 block">Enable Ad Placement</span>
               <span className="text-xs text-gray-500">Turn this specific ad slot on or off independently.</span>
             </div>
             <button
                type="button"
                onClick={() => setFormData(prev => ({...prev, enabled: !prev.enabled}))}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  formData.enabled ? "bg-green-500" : "bg-gray-200"
                )}
              >
                <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200", formData.enabled ? "translate-x-5" : "translate-x-0")} />
              </button>
           </div>

           {/* Name & Network */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="block text-sm font-bold text-gray-700">Ad Name</label>
                 <input 
                   type="text" 
                   value={formData.name} 
                   onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                   placeholder="e.g. Adsterra Direct Link 1" 
                   className="w-full border border-gray-200 px-4 py-2.5 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                 />
              </div>
              <div className="space-y-1">
                 <label className="block text-sm font-bold text-gray-700">Ad Network Name</label>
                 <input 
                   type="text" 
                   value={formData.network} 
                   onChange={(e) => setFormData(prev => ({...prev, network: e.target.value}))}
                   placeholder="e.g. Adsterra, Monetag" 
                   className="w-full border border-gray-200 px-4 py-2.5 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                 />
              </div>
           </div>

           {/* Script Box */}
           <div className="space-y-1">
              <label className="block text-sm font-bold text-gray-700">Ad Script Box (HTML/JS)</label>
              <textarea 
                rows={5} 
                value={formData.scriptCode} 
                onChange={(e) => setFormData(prev => ({...prev, scriptCode: e.target.value}))}
                placeholder="<!-- Paste exact script code provided by your network here -->"
                className="w-full border border-gray-200 px-4 py-3 rounded-xl bg-gray-900 text-green-400 font-mono text-sm leading-snug shadow-inner"
              />
           </div>

           {/* Actions */}
           <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200">
             <div className="flex items-center gap-3">
               <button 
                 onClick={onSaveAd}
                 disabled={saving}
                 className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
               >
                 <Check className="w-4 h-4" />
                 {saving ? "Deploying..." : "Save Configuration"}
               </button>
               {currentAd && (
                 <button 
                   onClick={onDeleteAd}
                   className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-200 transition-all flex items-center gap-2 cursor-pointer"
                 >
                   <Trash2 className="w-4 h-4" /> Delete
                 </button>
               )}
             </div>
             
             {currentAd && (
               <button
                  onClick={() => window.open("/file/preview?preview_ad=" + currentAd.id, "_blank")}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 border border-gray-700 text-white rounded-xl font-bold shadow transition-all flex items-center gap-2 cursor-pointer"
               >
                  <Eye className="w-4 h-4" />
                  Live Validation Mode
               </button>
             )}
           </div>

        </div>
      </div>

    </div>
  );
}
`;

const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
let start = -1;
let end = -1;
let openBraces = 0;
for(let i=0; i<lines.length; i++) {
   if (lines[i].includes('function AdsAdminPanel')) {
       start = i;
   }
   if (start !== -1) {
       openBraces += (lines[i].match(/\{/g) || []).length;
       openBraces -= (lines[i].match(/\}/g) || []).length;
       if (openBraces === 0) {
           end = i;
           break;
       }
   }
}

if(start !== -1 && end !== -1) {
   lines.splice(start, end - start + 1, panelHTML);
   fs.writeFileSync('src/App.tsx', lines.join('\n'));
   console.log('Successfully replaced AdsAdminPanel');
} else {
   console.log('Could not find boundaries');
}
