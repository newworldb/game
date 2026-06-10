'use strict';
// Concatenates the app sources into js/bundle.js (one script request —
// the free CDN we deploy on rate-limits parallel requests).
// Run after editing any js source file:  node tools/build.js
const fs = require('fs');
const path = require('path');

const ORDER = ['icons.js', 'config.js', 'data.js', 'picks.js', 'world.js', 'core.js', 'app.js'];
const src = ORDER.map(f => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  return '/* ===== ' + f + ' ===== */\n' + body.replace(/^'use strict';\n/, '');
}).join('\n');

const out = "'use strict';\n// GENERATED FILE — edit js/*.js and run: node tools/build.js\n" + src;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'bundle.js'), out);
console.log('bundle.js written:', out.length, 'bytes');
