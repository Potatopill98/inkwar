// 一次性批处理：统一压低程序化几何体的细分段数（移动端降面）
const fs = require('fs');

const BUDGET = {
  CylinderGeometry: { 3: 8 },              // radialSegments
  ConeGeometry: { 2: 8 },                  // radialSegments
  SphereGeometry: { 1: 10, 2: 8 },         // width/height
  TorusGeometry: { 2: 6, 3: 12 },          // radial/tubular
  RingGeometry: { 2: 24 },                 // thetaSegments
  CircleGeometry: { 1: 16 },               // segments
  CapsuleGeometry: { 2: 4, 3: 8 },         // cap/radial
};

function splitArgs(body) {
  const parts = [];
  let depth = 0, cur = '', inStr = false, q = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) { cur += ch; if (ch === q) inStr = false; continue; }
    if (ch === '"' || ch === "'") { inStr = true; q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

function processFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const re = /new THREE\.(\w+Geometry)\(/g;
  let out = '', last = 0, m, changed = 0;
  while ((m = re.exec(src))) {
    const name = m[1];
    const budget = BUDGET[name];
    if (!budget) continue;
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) break; }
    }
    if (depth !== 0) continue;
    const body = src.slice(start, i);
    const args = splitArgs(body);
    let touched = false;
    for (const [idx, max] of Object.entries(budget)) {
      const raw = args[Number(idx)];
      if (raw === undefined) continue;
      const trimmed = raw.trim();
      if (!/^\d+$/.test(trimmed)) continue;
      const v = Number(trimmed);
      if (v > max) { args[Number(idx)] = raw.replace(trimmed, String(max)); touched = true; }
    }
    if (!touched) continue;
    out += src.slice(last, start) + args.join(',') + ')';
    last = i + 1;
    changed++;
  }
  out += src.slice(last);
  fs.writeFileSync(file, out, 'utf8');
  return changed;
}

const files = process.argv.slice(2);
for (const f of files) {
  const n = processFile(f);
  console.log(`${f}: ${n} geometry calls reduced`);
}
