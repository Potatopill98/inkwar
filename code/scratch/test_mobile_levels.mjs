import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_mobile_check_${Date.now()}`;
  const edge = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${profile}`,
    'about:blank',
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

  const sizes = [[844, 390], [667, 375], [992, 626]];

  for (const [w, h] of sizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 2500));

    await evalJS(`
      (() => {
        const app = window.__MOZHEN_APP__;
        if (!app) return 'no app';
        try {
          app.save.settings.firstGuideDone = true;
          const fg = document.getElementById('first-guide');
          if (fg) fg.remove();
          app.ui.openLevels();
          app.ui.selectLevelDetail(1);
          return 'ok';
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    await new Promise(r => setTimeout(r, 700));

    const info = await evalJS(`
      (() => {
        const go = document.getElementById('btn-level-go');
        const bar = document.querySelector('.detail-actions');
        const panel = document.getElementById('level-detail');
        const body = document.querySelector('.levels-body');
        if (!go) return { found: false };
        const g = go.getBoundingClientRect();
        const b = body.getBoundingClientRect();
        const p = panel.getBoundingClientRect();
        return {
          found: true,
          vw: innerWidth, vh: innerHeight,
          goTop: Math.round(g.top), goBottom: Math.round(g.bottom),
          goVisible: g.top >= 0 && g.bottom <= innerHeight && g.left >= 0 && g.right <= innerWidth,
          barPosition: bar ? getComputedStyle(bar).position : 'none',
          panel: { top: Math.round(p.top), bottom: Math.round(p.bottom), h: Math.round(p.height) },
          body: { top: Math.round(b.top), bottom: Math.round(b.bottom) },
          panelScrollable: panel.scrollHeight > panel.clientHeight,
          panelScrollTop: panel.scrollTop,
          bodyDirection: getComputedStyle(body).flexDirection,
        };
      })()
    `);
    console.log(`--- ${w}x${h} ---`);
    console.log(JSON.stringify(info));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot.result?.data) {
      const fs = await import('fs');
      fs.writeFileSync(`C:\\Users\\45803\\AppData\\Local\\Temp\\levels_${w}x${h}.png`, Buffer.from(shot.result.data, 'base64'));
    }
  }

  ws.close();
  edge.kill();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
