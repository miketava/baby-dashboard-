// Builds index.html from src/ in the order listed in src/BUILD_ORDER, and inlines apps-script/Code.gs as the
// APPS_SCRIPT string (Settings shows and copies it). Then syntax-checks the page's script and Code.gs.
// Usage (from the repo root, any OS): node tools/build.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
const order = fs.readFileSync(path.join(src, 'BUILD_ORDER'), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const gs = fs.readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8'), rem = fs.readFileSync(path.join(root, 'apps-script', 'Reminders.gs'), 'utf8');
const fail = msg => { console.error('BUILD FAILED: ' + msg); process.exit(1); };
if (!/const SECRET = 'change-me-to-a-long-random-phrase'/.test(gs)) fail('apps-script/Code.gs must keep the placeholder SECRET (never commit the real one)');
try { new vm.Script(gs, { filename: 'apps-script/Code.gs' }); new vm.Script(rem, { filename: 'apps-script/Reminders.gs' }); } catch (e) { fail(e.stack); }
if (!/const NTFY_TOPIC = 'baby-routine-CHANGE-ME'/.test(rem)) fail('apps-script/Reminders.gs must keep the placeholder NTFY_TOPIC');
// Code.gs as a JS template literal: escape \ ` and ${ so the string is exactly the file
const asLiteral = s => '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
const seen = new Set();
const html = order.map(f => {
  if (f === '@apps-script') return `const APPS_SCRIPT = ${asLiteral(gs)};\n`;
  if (f === '@reminders') return `const REMINDERS_GS = ${asLiteral(rem)};\n`;
  const p = path.join(src, f); if (!fs.existsSync(p)) fail(`${f} is listed in BUILD_ORDER but doesn't exist`);
  seen.add(path.normalize(f)); return fs.readFileSync(p, 'utf8');
}).join('');
// every source file must be listed (a forgotten file would silently drop code)
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const missing = walk(src).map(p => path.relative(src, p)).filter(f => f !== 'BUILD_ORDER' && !seen.has(path.normalize(f)));
if (missing.length) fail('not listed in src/BUILD_ORDER: ' + missing.join(', '));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scripts.length) fail('no inline <script> in the output');
scripts.forEach((code, i) => { try { new vm.Script(code, { filename: `index.html <script> #${i + 1}` }); } catch (e) { fail(e.stack); } });
const ver = (html.match(/const APP_VERSION = '([^']+)'/) || [])[1];
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(`BUILD OK · v${ver} · index.html ${(html.length / 1024).toFixed(0)} KB from ${order.length} files`);
