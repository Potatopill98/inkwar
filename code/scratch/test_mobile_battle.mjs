import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9335;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_battle_check_${Date.now()}`;
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

  await send('Page.enable');
  await send('Runtime.enable');
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      logs.push(m.params.args.map(a => a.value || a.description).join(' '));
    }
  });

  for (const [w, h] of [[844, 390], [667, 375], [1280, 720]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 6000));

    const boot = await evalJS(`
      (() => {
        const app = window.__MOZHEN_APP__;
        if (!app) return 'no app';
        try {
          app.enterGame();
          app.save.settings.firstGuideDone = true;
          if (app.firstGuide) { app.firstGuide.hide(); if (app.firstGuide.el) app.firstGuide.el.remove(); }
          app.openPrep(1);
          setTimeout(() => app.beginBattleFromPrep(), 300);
          return 'booted';
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    await new Promise(r => setTimeout(r, 6000));

    const info = await evalJS(`
      (() => {
        try {
          const tip = document.getElementById('guide-tip');
          const hand = document.querySelector('.tutorial-hand-pointer');
          const card = document.querySelector('.card[data-unit="swordsman"]');
          const tray = document.getElementById('card-tray');
          const state = window.__MOZHEN_APP__.battle ? window.__MOZHEN_APP__.battle.state : 'none';
          const t = tip && tip.classList.contains('show') ? tip.getBoundingClientRect() : null;
          const c = card ? card.getBoundingClientRect() : null;
          const tr = tray ? tray.getBoundingClientRect() : null;
          const cs = tip ? getComputedStyle(tip) : null;
          return JSON.stringify({
            boot: ${JSON.stringify(boot)},
            battleState: state,
            tipCss: cs && { top: cs.top, bottom: cs.bottom, height: cs.height, position: cs.position },
            tipRect: t && { t: Math.round(t.top), b: Math.round(t.bottom), h: Math.round(t.height), w: Math.round(t.width) },
            tipStretched: t ? t.height > innerHeight * 0.55 : null,
            cardRect: c && { l: Math.round(c.left), t: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height) },
            cardInView: c ? (c.top >= 0 && c.bottom <= innerHeight) : null,
            trayRect: tr && { t: Math.round(tr.top), b: Math.round(tr.bottom), h: Math.round(tr.height) },
            handShown: hand ? hand.classList.contains('show') : null,
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log(`--- battle ${w}x${h} ---`);
    console.log(info);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    if (shot.result?.data) fs.writeFileSync(`C:\\Users\\45803\\AppData\\Local\\Temp\\battle_${w}x${h}.png`, Buffer.from(shot.result.data, 'base64'));
  }

  console.log('console errors:', logs.slice(0, 5));
  ws.close(); edge.kill(); process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

