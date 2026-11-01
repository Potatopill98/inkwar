import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9336;
const SHOT_DIR = 'C:\\Users\\45803\\AppData\\Local\\Temp\\ui_audit';
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_ui_audit_${Date.now()}`;
  const edge = spawn(edgePath, [
    '--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox',
    `--user-data-dir=${profile}`, 'about:blank',
  ]);
  await new Promise(r => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1; const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const mid = id++; pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJS = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + r.result.exceptionDetails.text;
    return r.result?.result?.value;
  };
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    if (s.result?.data) fs.writeFileSync(`${SHOT_DIR}\\${name}.png`, Buffer.from(s.result.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');

  const sizes = [[844, 390], [667, 375], [992, 626]];
  const steps = [
    ['home', "app.enterGame(); app.ui.refreshHome();"],
    ['levels', "app.ui.openLevels();"],
    ['prep', "app.openPrep(1);"],
    ['codex-units', "app.openCodex('units');"],
    ['codex-heroes', "app.openCodex('heroes');"],
    ['camp', "app.openCamp();"],
    ['gacha', "app.openGacha();"],
    ['leaderboard', "app.openLeaderboardScreen();"],
    ['settings', "app.openSettings();"],
  ];

  const measure = `
    (() => {
      const scr = document.querySelector('.screen.active');
      if (!scr) return JSON.stringify({ screen: 'none' });
      const vw = innerWidth, vh = innerHeight;
      const desc = (el) => {
        if (!el) return '?';
        if (el.id) return '#' + el.id;
        const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\\s+/).slice(0, 2).join('.') : '';
        return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
      };
      const badX = [], badBtn = [];
      const all = scr.querySelectorAll('button, .btn, input, .uc-card, .hero-pick, .card');
      let overflowRight = 0, overflowLeft = 0;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
        if (r.right > vw + 2 || r.left < -2) {
          const isBtn = el.tagName === 'BUTTON' || el.className.includes('btn');
          if (isBtn) badBtn.push(desc(el) + ' l=' + Math.round(r.left) + ' r=' + Math.round(r.right));
          else if (badX.length < 6) badX.push(desc(el) + ' l=' + Math.round(r.left) + ' r=' + Math.round(r.right));
          overflowRight = Math.max(overflowRight, Math.round(r.right - vw));
          overflowLeft = Math.min(overflowLeft, Math.round(r.left));
        }
      }
      // 滚动容器里的按钮是否在可视区内
      const outY = [];
      for (const el of scr.querySelectorAll('button')) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (r.bottom < 0 || r.top > vh) outY.push(desc(el) + ' top=' + Math.round(r.top));
      }
      const bodyLike = ['.home-main','.prep-body','.codex-body','.camp-body','.gacha-body','.leaderboard-body','.settings-body'].map(sel => {
        const el = scr.querySelector(sel);
        if (!el) return null;
        return { sel, h: Math.round(el.getBoundingClientRect().height), sh: el.scrollHeight, ch: el.clientHeight, canScroll: el.scrollHeight > el.clientHeight + 2 };
      }).filter(Boolean);
      return JSON.stringify({
        screen: scr.id,
        vw, vh,
        badBtn: badBtn.slice(0, 8),
        badX: badX.slice(0, 6),
        overflowRight, overflowLeft,
        buttonsOutsideY: outY.slice(0, 6),
        containers: bodyLike,
      });
    })()
  `;

  for (const [w, h] of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 2600));
    await evalJS("(() => { const a=window.__MOZHEN_APP__; if(!a) return 'no app'; a.save.settings.firstGuideDone = true; if (a.firstGuide) { a.firstGuide.hide(); if (a.firstGuide.el) a.firstGuide.el.remove(); } return 'ok'; })()");

    for (const [name, code] of steps) {
      await evalJS(`(() => { const app = window.__MOZHEN_APP__; try { ${code} return 'ok'; } catch (e) { return 'ERR ' + e.message; } })()`);
      await new Promise(r => setTimeout(r, 450));
      const info = await evalJS(measure);
      console.log(`[${w}x${h}] ${name} -> ${info}`);
      if (['home', 'prep', 'camp', 'codex-units', 'gacha'].includes(name)) {
        await shot(`${w}x${h}_${name}`);
      }
    }
  }

  ws.close(); edge.kill(); process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
