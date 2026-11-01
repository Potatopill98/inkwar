import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9337;
const OUT = 'C:\\Users\\45803\\AppData\\Local\\Temp\\ui_audit';
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_modal_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise(r => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const mid = id++; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  const evalJS = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + r.result.exceptionDetails.text;
    return r.result?.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');

  for (const [w, h] of [[844, 390], [667, 375], [992, 626]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 2600));
    await evalJS("(() => { const a=window.__MOZHEN_APP__; a.enterGame(); a.save.settings.firstGuideDone=true; if(a.firstGuide){a.firstGuide.hide(); if(a.firstGuide.el)a.firstGuide.el.remove();} a.ui.openBountyModal('daily'); return 'ok'; })()");
    await new Promise(r => setTimeout(r, 500));

    const info = await evalJS(`
      (() => {
        const modal = document.getElementById('bounty-modal');
        const paper = modal && modal.querySelector('.bounty-paper, .modal-paper');
        if (!modal || !paper) return JSON.stringify({ found: false });
        const m = modal.getBoundingClientRect(), p = paper.getBoundingClientRect();
        const closeBtn = modal.querySelector('.modal-close, [id*="close"]');
        const cb = closeBtn ? closeBtn.getBoundingClientRect() : null;
        const scrollers = Array.from(paper.querySelectorAll('*')).filter(el => el.scrollHeight > el.clientHeight + 2).slice(0, 4).map(el => el.className || el.id);
        return JSON.stringify({
          found: true, vw: innerWidth, vh: innerHeight,
          modal: { t: Math.round(m.top), b: Math.round(m.bottom) },
          paper: { l: Math.round(p.left), t: Math.round(p.top), r: Math.round(p.right), b: Math.round(p.bottom), h: Math.round(p.height) },
          paperInside: p.left >= 0 && p.right <= innerWidth && p.top >= 0 && p.bottom <= innerHeight,
          paperScrollable: paper.scrollHeight > paper.clientHeight + 2,
          closeVisible: cb ? (cb.top >= 0 && cb.bottom <= innerHeight && cb.left >= 0 && cb.right <= innerWidth) : null,
          scrollers,
        });
      })()
    `);
    console.log(`[modal ${w}x${h}] ${info}`);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    if (s.result?.data) fs.writeFileSync(`${OUT}\\${w}x${h}_bounty.png`, Buffer.from(s.result.data, 'base64'));
  }
  ws.close(); edge.kill(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
