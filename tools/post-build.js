const fs = require('fs');
const path = require('path');
const distManifest = require('../dist/manifest.json');
distManifest.content_scripts.forEach((csEntry, i) => {
  if (csEntry.js.some((jsPath) => jsPath.indexOf('assets/content-script-loader.content.js') !== -1)) {
    csEntry.js = csEntry.js.map((jsPath, j) => {
      if (jsPath.indexOf('assets/content-script-loader.content.js') !== -1) {
        return distManifest.web_accessible_resources[i].resources[j];
      }
      return jsPath;
    });
  }
});
delete distManifest.web_accessible_resources;
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'manifest.json'), JSON.stringify(distManifest, null, 2), { flag: 'w+' });
