const fs = require('fs');
let s = fs.readFileSync('server.ts', 'utf8');

const targetObj = 'function getAdHTML(label: string): string {';
const newFunc = `function renderAdsForPlacement(placementKey: string): string {
  if (!Array.isArray(adsList)) return "";
  const bgPlacements = ["popunder", "push_notification", "in_page_push", "vignette", "direct_link"];
  const isBg = bgPlacements.includes(placementKey.toLowerCase());
  
  const matchedAds = adsList.filter(ad => {
    if (!ad || !ad.enabled) return false;
    return (ad.placement || "").toLowerCase() === placementKey.toLowerCase();
  });

  if (matchedAds.length === 0) return "";

  matchedAds.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  let html = "";
  
  if (isBg) {
    if (placementKey.toLowerCase() === "in_page_push") {
       html += \`\\n<div class="test-border-in-page-push border-4 border-dashed border-red-500 p-4 my-4 relative z-50 bg-black/50">
          <div class="absolute top-0 left-0 bg-red-500 text-white text-xs font-bold px-2 py-1">IN_PAGE_PUSH MOUNT ZONE</div>\`;
       matchedAds.forEach(ad => {
         html += "\\n<!-- Background Ad Script: " + ad.name + " -->\\n<div class=\\"monetag-mount\\" style=\\"min-height: 50px;\\">" + ad.scriptCode + "</div>\\n";
       });
       html += \`\\n</div>\\n\`;
    } else {
       matchedAds.forEach(ad => {
         html += "\\n<!-- Background Ad Script: " + ad.name + " -->\\n" + '<div style="display:none;">' + ad.scriptCode + '</div>' + "\\n";
       });
    }
  } else {
    // Visible Box
    html += \`<div class="w-full my-6 flex flex-col items-center justify-center p-4 bg-gray-800/80 border border-gray-700/60 rounded-3xl shadow-lg relative overflow-hidden" style="min-height: 120px; text-align: center;">
      <div class="absolute top-0 right-0 bg-gray-700/50 text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-widest z-10">Advertisement</div>
      <div class="w-full h-full flex flex-col justify-center items-center relative z-20">\`;
      
    matchedAds.forEach(ad => {
      html += \`
        <div class="ad-wrapper-dynamic w-full max-w-full overflow-hidden flex justify-center py-2" data-ad-id="\${ad.id}">
          \${ad.scriptCode}
          <script>
            (function() {
              try {
                fetch('/api/ads/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ adId: "\${ad.id}", eventType: "impression" })
                }).catch(e => {});
              } catch(e) {}
            })();
          </script>
        </div>
      \`;
    });
    
    html += \`</div></div>\`;
  }

  return html;
}

`;

if (s.includes('function getAdHTML(label: string): string {')) {
  s = s.replace(targetObj, newFunc + targetObj);
  fs.writeFileSync('server.ts', s);
  console.log('Restored function!');
} else {
  console.log('Not found');
}
