'use strict';
// Concatenates the poker source files into poker/js/bundle.js.
// One script request instead of seven — the free CDN we deploy on
// rate-limits parallel requests (HTTP 425), which used to randomly
// break page loads. Run after editing any poker/js source file:
//   node tools/build.js
const fs = require('fs');
const path = require('path');

const ORDER = ['cards.js', 'ai.js', 'engine.js', 'save.js', 'ui.js', 'net.js', 'main.js'];
const src = ORDER.map(f => {
  const body = fs.readFileSync(path.join(__dirname, '..', 'poker', 'js', f), 'utf8');
  return '/* ===== ' + f + ' ===== */\n' + body.replace(/^'use strict';\n/, '');
}).join('\n');

const out = "'use strict';\n// GENERATED FILE — edit poker/js/*.js and run: node tools/build.js\n" + src;
fs.writeFileSync(path.join(__dirname, '..', 'poker', 'js', 'bundle.js'), out);
console.log('bundle.js written:', out.length, 'bytes');
