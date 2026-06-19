const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

let newContent = content.replace(/function renderAdsForPlacement\([\s\S]*?return html;\n\}/g, `function renderAdsForPlacement(placementKey: string): string {
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
    matchedAds.forEach(ad => {
      html += "\\n<!-- Background Ad Script: " + ad.name + " -->\\n" + ad.scriptCode + "\\n";
    });
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
}`);

// Inject background ads right before </body> or after footer_banner
if (newContent.includes('\\${getAdHTML("footer_banner")}')) {
    newContent = newContent.replace(/\\\$\{getAdHTML\("footer_banner"\)\}/g, `\${getAdHTML("footer_banner")}
  \${getAdHTML("popunder")}
  \${getAdHTML("push_notification")}
  \${getAdHTML("in_page_push")}
  \${getAdHTML("vignette")}
  \${getAdHTML("direct_link")}`);
}

fs.writeFileSync('server.ts', newContent);
console.log('Successfully updated server.ts');
