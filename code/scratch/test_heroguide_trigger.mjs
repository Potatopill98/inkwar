import { spawn } from 'child_process';
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9340;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_trigger_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise(r => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const mid = id++; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Page.enable'); await send('Runtime.enable');

  for (const [w, h] of [[844, 390], [667, 375]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 2600));
    const boot = await ev(`
      (() => {
        const a = window.__MOZHEN_APP__;
        try {
          a.enterGame();
          if (a.firstGuide) a.firstGuide.finish();
          a.save.settings.heroGuidePending = true;
          a.ui.openLevels();
          a.returnToLevels();
          return 'ok';
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    await new Promise(r => setTimeout(r, 1200));
    const info = await ev(`
      (() => {
        try {
          const a = window.__MOZHEN_APP__;
          const spot = document.querySelector('.fg-spot');
          const btn = document.getElementById('btn-heroes');
          const s = spot ? spot.getBoundingClientRect() : null;
          const b = btn ? btn.getBoundingClientRect() : null;
          return JSON.stringify({
            boot: ${JSON.stringify(boot)},
            screen: document.querySelector('.screen.active')?.id,
            pending: a.save.settings.heroGuidePending,
            mode: a.firstGuide ? a.firstGuide.mode : 'none',
            step: a.firstGuide ? a.firstGuide.step : -1,
            spot: s && { t: Math.round(s.top), b: Math.round(s.bottom), l: Math.round(s.left), r: Math.round(s.right) },
            btn: b && { t: Math.round(b.top), b: Math.round(b.bottom) },
            spotCovers: s && b ? !(s.right < b.left || s.left > b.right || s.bottom < b.top || s.top > b.bottom) : null,
            tipTitle: (document.querySelector('.fg-title') || {}).textContent,
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log(`[trigger ${w}x${h}] ${info}`);
  }
  ws.close(); edge.kill(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
