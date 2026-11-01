import { spawn } from 'child_process';
import fs from 'fs';
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9338;
const OUT = 'C:\\Users\\45803\\AppData\\Local\\Temp\\ui_audit';

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_shots_${Date.now()}`;
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

  for (const [w, h] of [[992, 626]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 2600));
    await ev("(() => { const a=window.__MOZHEN_APP__; a.enterGame(); a.save.settings.firstGuideDone=true; if(a.firstGuide){a.firstGuide.hide(); if(a.firstGuide.el)a.firstGuide.el.remove();} return 'ok'; })()");

    for (const [name, code] of [
      ['prep', "app.openPrep(1);"],
      ['leaderboard', "app.openLeaderboardScreen();"],
      ['settings', "app.openSettings();"],
      ['codex-heroes', "app.openCodex('heroes');"],
      ['camp', "app.openCamp();"],
      ['title', "app.ui.showScreen('screen-title');"],
    ]) {
      await ev(`(() => { const app=window.__MOZHEN_APP__; try{ ${code} return 'ok';}catch(e){return e.message;} })()`);
      await new Promise(r => setTimeout(r, 500));
      const s = await send('Page.captureScreenshot', { format: 'png' });
      if (s.result?.data) fs.writeFileSync(`${OUT}\\${w}x${h}_${name}.png`, Buffer.from(s.result.data, 'base64'));
    }
  }
  ws.close(); edge.kill(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
