// 点兵点将页面截图（桌面 + 手机）
import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9404;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_gshot_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise((r) => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 1;
  const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}, timeout = 5000) => new Promise((res) => {
    const mid = id++;
    const timer = setTimeout(() => { pending.delete(mid); res({ timedOut: true }); }, timeout);
    pending.set(mid, (m) => { clearTimeout(timer); res(m); });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + (r.result.exceptionDetails.exception?.description || '');
    return r.result?.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1.4, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=gshot' });
  await new Promise((r) => setTimeout(r, 3000));
  await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.enterGame();
      a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
      a.save.tokens = 260;
      if (a.firstGuide) { a.firstGuide.hide(); if (a.firstGuide.el) a.firstGuide.el.remove(); }
      a.openGacha();
      a.ui.setGachaTab('unit');
      return 'ok';
    })()
  `);
  await new Promise((r) => setTimeout(r, 700));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('e:\\taptapgame\\inkwar\\code\\scratch\\gacha_unit_pc.png', Buffer.from(shot.result.data, 'base64'));

  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await new Promise((r) => setTimeout(r, 400));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('e:\\taptapgame\\inkwar\\code\\scratch\\gacha_unit_mobile.png', Buffer.from(shot.result.data, 'base64'));
  console.log('saved');
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
