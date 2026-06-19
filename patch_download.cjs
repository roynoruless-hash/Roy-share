const fs = require('fs');
let s = fs.readFileSync('server.ts', 'utf8');

// 1. Rewrite renderGlobalAdScripts
const rgaStart = s.indexOf('function renderGlobalAdScripts(): string {');
const rgaEnd = s.indexOf('function getAdHTML(label: string): string {'); // actually let's find the end of it

if (rgaStart !== -1) {
   let curEnd = s.indexOf('function getAdHTML', rgaStart);
   if (curEnd !== -1) {
       let newRga = `function renderGlobalAdScripts(): string {
  let html = "";
  html += getAdHTML('popunder');
  html += getAdHTML('push_notification');
  html += getAdHTML('in_page_push');
  html += getAdHTML('vignette');
  html += getAdHTML('direct_link');

  // Legacy fallback
  if (typeof socialBarConfig !== 'undefined' && socialBarConfig && socialBarConfig.enabled && socialBarConfig.script) {
    html += \`<!-- Legacy Ads Social Bar -->\\n<div class="ads-social-bar" style="display:none;">\${socialBarConfig.script}</div>\\n\`;
  }
  return html;
}

`;
       s = s.substring(0, rgaStart) + newRga + s.substring(curEnd);
   }
}

// 2. Add header_banner right after <body class=\"bg-gray-900 ... min-h-screen\">
s = s.replace(
  /<body class="bg-gray-900 text-gray-100 flex flex-col relative overflow-x-hidden min-h-screen">/g,
  '<body class="bg-gray-900 text-gray-100 flex flex-col relative overflow-x-hidden min-h-screen">\n  ${getAdHTML("header_banner")}'
);

// 3. Add footer_banner right before <!-- FOOTER -->
s = s.replace(
  /<!-- FOOTER -->/g,
  '${getAdHTML("footer_banner")}\n    <!-- FOOTER -->'
);

fs.writeFileSync('server.ts', s);
console.log('Fixed download page injections!');
