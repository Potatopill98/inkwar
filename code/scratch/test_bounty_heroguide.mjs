import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9339;
const OUT = 'C:\\Users\\45803\\AppData\\Local\\Temp\\ui_audit2';
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_fix2_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise(r => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1; const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const mid = id++; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + r.result.exceptionDetails.text;
    return r.result?.result?.value;
  };
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' });
    if (s.result?.data) fs.writeFileSync(`${OUT}\\${name}.png`, Buffer.from(s.result.data, 'base64'));
  };
  await send('Page.enable'); await send('Runtime.enable');

  for (const [w, h] of [[844, 390], [667, 375], [992, 626]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url: 'http://localhost:8087/index.html' });
    await new Promise(r => setTimeout(r, 2600));
    await ev("(() => { const a=window.__MOZHEN_APP__; a.enterGame(); a.save.settings.firstGuideDone=true; if(a.firstGuide){a.firstGuide.hide(); if(a.firstGuide.el)a.firstGuide.el.remove();} return 'ok'; })()");

    // 1) 悬赏弹窗：0 次免费刷新，检查广告按钮状态
    await ev("(() => { const a=window.__MOZHEN_APP__; a.save.bounties && (a.save.bounties.dailyRefreshCount=0); a.ui.openBountyModal('daily'); return 'ok'; })()");
    await new Promise(r => setTimeout(r, 500));
    let info = await ev(`
      (() => {
        try {
          const paper = document.querySelector('.bounty-paper');
          const list = document.getElementById('bounty-modal-list');
          const cards = list ? list.querySelectorAll('.bounty-card-large') : [];
          const btns = list ? Array.from(list.querySelectorAll('.btn-refresh-single-bounty')).map(b => b.textContent.trim() + '|' + b.dataset.ad) : [];
          const footer = document.querySelector('.bounty-modal-footer');
          const p = paper.getBoundingClientRect(), l = list.getBoundingClientRect();
          const lastCard = cards.length ? cards[cards.length-1].getBoundingClientRect() : null;
          return JSON.stringify({
            vw: innerWidth, vh: innerHeight,
            paper: { t: Math.round(p.top), b: Math.round(p.bottom), h: Math.round(p.height) },
            list: { t: Math.round(l.top), b: Math.round(l.bottom), h: Math.round(l.height), sh: list.scrollHeight, ch: list.clientHeight },
            cardCount: cards.length,
            refreshBtns: btns,
            footerVisible: footer ? footer.getBoundingClientRect().bottom <= innerHeight && footer.getBoundingClientRect().top >= 0 : null,
            lastCardVisible: lastCard ? (lastCard.top >= l.top && lastCard.bottom <= l.bottom) : null,
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log(`[bounty ${w}x${h}] ${info}`);
    await shot(`${w}x${h}_bounty`);

    // 2) 无尽解锁弹窗
    await ev("(() => { const a=window.__MOZHEN_APP__; a.ui.openEndlessUnlockModal(); return 'ok'; })()");
    await new Promise(r => setTimeout(r, 400));
    info = await ev(`
      (() => {
        try {
          const paper = document.querySelector('.unlock-modal-paper');
          const btn = document.getElementById('btn-go-endless-first');
          const p = paper.getBoundingClientRect(), b = btn.getBoundingClientRect();
          return JSON.stringify({
            paper: { t: Math.round(p.top), b: Math.round(p.bottom), h: Math.round(p.height), sh: paper.scrollHeight, ch: paper.clientHeight },
            btn: { t: Math.round(b.top), b: Math.round(b.bottom) },
            btnVisible: b.top >= 0 && b.bottom <= innerHeight,
            needScroll: paper.scrollHeight > paper.clientHeight + 2,
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log(`[endless ${w}x${h}] ${info}`);
    await shot(`${w}x${h}_endless`);
    await ev("(() => { const m=document.getElementById('endless-unlock-modal'); if(m) m.style.display='none'; return 'ok'; })()");

    // 2.5) 无尽 5 波肉鸽三选一弹窗
    await ev("(() => { const a=window.__MOZHEN_APP__; a.ui.hideBountyModal(); a.ui.showScreen('screen-battle'); a.ui.showEndlessBuffSelection({ paused:false, endlessBuffSelecting:false, endlessBuffCounts:{}, lastFrame:0 }); return 'ok'; })()");
    await new Promise(r => setTimeout(r, 500));
    info = await ev(`
      (() => {
        try {
          const paper = document.querySelector('.endless-buff-paper');
          const cards = Array.from(document.querySelectorAll('.endless-buff-card')).map(c => {
            const r = c.getBoundingClientRect();
            return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) };
          });
          const p = paper.getBoundingClientRect();
          return JSON.stringify({
            paper: { t: Math.round(p.top), b: Math.round(p.bottom), h: Math.round(p.height) },
            cards,
            allCardsInView: cards.every(c => c.l >= 0 && c.r <= innerWidth && c.t >= 0 && c.b <= innerHeight),
            cardsCount: cards.length,
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log(`[endless-buff ${w}x${h}] ${info}`);
    await shot(`${w}x${h}_endlessbuff`);
    await ev("(() => { const m=document.getElementById('endless-buff-modal'); if(m){m.style.display='none'; m.classList.remove('show');} const a=window.__MOZHEN_APP__; a.ui.showScreen('screen-home'); return 'ok'; })()");

    // 3) 点将升阶引导：直接启动，逐步点击
    await ev("(() => { const a=window.__MOZHEN_APP__; if(a.firstGuide){ a.firstGuide.finish(); } a.save.mobao = 10; a.firstGuide.startHeroUpgradeGuide(); return 'started'; })()");
    await new Promise(r => setTimeout(r, 600));
    info = await ev(`
      (() => {
        try {
          const a = window.__MOZHEN_APP__;
          const spot = document.querySelector('.fg-spot');
          const s = spot ? spot.getBoundingClientRect() : null;
          const go = document.getElementById('btn-heroes');
          const g = go ? go.getBoundingClientRect() : null;
          return JSON.stringify({
            step: a.firstGuide ? a.firstGuide.step : -1,
            mode: a.firstGuide ? a.firstGuide.mode : 'none',
            spot: s && { t: Math.round(s.top), l: Math.round(s.left), w: Math.round(s.width), h: Math.round(s.height) },
            target: g && { t: Math.round(g.top), l: Math.round(g.left), w: Math.round(g.width), h: Math.round(g.height) },
            spotCoversTarget: s && g ? !(s.right < g.left || s.left > g.right || s.bottom < g.top || s.top > g.bottom) : null,
          });
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    console.log(`[hero-guide ${w}x${h}] ${info}`);
    await shot(`${w}x${h}_heroguide`);

    // 点击三步
    await ev("(() => { window.__MOZHEN_APP__.firstGuide.handleTargetClick(); return 'c1'; })()");
    await new Promise(r => setTimeout(r, 700));
    await ev("(() => { window.__MOZHEN_APP__.firstGuide.handleTargetClick(); return 'c2'; })()");
    await new Promise(r => setTimeout(r, 800));
    const step2 = await ev("(() => { const a=window.__MOZHEN_APP__; return JSON.stringify({ step:a.firstGuide.step, mode:a.firstGuide.mode, screen:document.querySelector('.screen.active')?.id, heroLv: a.save.hero.levels.zhaoyun, mobao: a.save.mobao, upgradeBtn: !!document.getElementById('btn-hero-upgrade') }); })()");
    console.log(`[hero-guide-after ${w}x${h}] ${step2}`);
    await ev("(() => { window.__MOZHEN_APP__.firstGuide.handleTargetClick(); return 'c3'; })()");
    await new Promise(r => setTimeout(r, 600));
    const done = await ev("(() => { const a=window.__MOZHEN_APP__; const els=document.querySelectorAll('#first-guide'); return JSON.stringify({ done:a.save.settings.heroGuideDone, guideCount:els.length, display: els[0] ? els[0].style.display : null, mode:a.firstGuide.mode, step:a.firstGuide.step, elNull: !a.firstGuide.el }); })()");
    console.log(`[hero-guide-finish ${w}x${h}] ${done}`);
  }
  ws.close(); edge.kill(); process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
