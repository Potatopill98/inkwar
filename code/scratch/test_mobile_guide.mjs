import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9334;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_guide_check_${Date.now()}`;
  const edge = spawn(edgePath, [
    '--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox',
    `--user-data-dir=${profile}`, 'about:blank',
  ]);
  await new Promise(r => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const mid = id++;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJS = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    return r.result?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');

  for (const [w, h] of [[844, 390], [667, 375], [992, 626]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 2600));

    const started = await evalJS(`
      (() => {
        const app = window.__MOZHEN_APP__;
        if (!app) return 'no app';
        try {
          if (!app.firstGuide) app.enterGame();
          if (!app.firstGuide || !app.firstGuide.el) return 'guide inactive';
          app.firstGuide.handleTargetClick();
          return 'clicked step=' + app.firstGuide.step;
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    await new Promise(r => setTimeout(r, 900));

    const info = await evalJS(`
      (() => {
       try {
        const spot = document.querySelector('.fg-spot');
        const tip = document.querySelector('.fg-tip');
        const go = document.getElementById('btn-level-go');
        const s = spot ? spot.getBoundingClientRect() : null;
        const t = tip ? tip.getBoundingClientRect() : null;
        const g = go ? go.getBoundingClientRect() : null;
        const overlap = (a, b) => a && b && !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
        return JSON.stringify({
          step: window.__MOZHEN_APP__.firstGuide ? window.__MOZHEN_APP__.firstGuide.step : -9,
          spot: s && { l: Math.round(s.left), t: Math.round(s.top), w: Math.round(s.width), h: Math.round(s.height) },
          go: g && { l: Math.round(g.left), t: Math.round(g.top), w: Math.round(g.width), h: Math.round(g.height) },
          tip: t && { l: Math.round(t.left), t: Math.round(t.top), w: Math.round(t.width), h: Math.round(t.height) },
          spotCoversGo: overlap(s, g),
          tipCoversGo: overlap(t, g),
          tipInsideViewport: t ? (t.left >= 0 && t.right <= innerWidth && t.top >= 0 && t.bottom <= innerHeight) : null,
        });
       } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log(`--- guide ${w}x${h} ---`);
    console.log(info);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot.result?.data) fs.writeFileSync(`C:\\Users\\45803\\AppData\\Local\\Temp\\guide_${w}x${h}.png`, Buffer.from(shot.result.data, 'base64'));
  }

  ws.close();
  edge.kill();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
