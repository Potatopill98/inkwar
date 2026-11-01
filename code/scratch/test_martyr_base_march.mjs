// 死士抵寨自爆验证（无护盾场景）
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9413;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_base2_${Date.now()}`;
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
  const ev = async (expr, timeout = 5000) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, timeout);
    if (r.timedOut) return 'HANG';
    if (r.result?.exceptionDetails) return 'EXC ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=base2' });
  await new Promise((r) => setTimeout(r, 3200));
  await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.enterGame();
      a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
      a.save.progress.unlockedLevel = 20;
      if (a.firstGuide) { a.firstGuide.hide(); if (a.firstGuide.el) a.firstGuide.el.remove(); }
      a.openPrep(5); a.beginBattleFromPrep();
      return 'ok';
    })()
  `);
  await new Promise((r) => setTimeout(r, 1800));

  const res = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      b.state = 'running'; b.introT = 0;
      b.bossShield = false; // 单测大本营受击
      for (const e of b.entities.filter((x) => x.side === 'enemy')) b.removeEntity(e);
      const sishi = U.getUnit('sishi');
      const z = b.createEntity({ unit: sishi, side: 'player', x: 10.5, z: 0, kind: 'unit' });
      const baseBefore = b.enemyBaseHp;
      const path = [];
      for (let i = 0; i < 12; i++) {
        if (!z.alive) break;
        b.updateMartyr(z, 0.1);
        path.push(Math.round(z.x * 100) / 100);
        // 每步清掉可能新生成的敌军，保证目标只剩大本营
        for (const e of b.entities.filter((x) => x.side === 'enemy')) b.removeEntity(e);
      }
      return JSON.stringify({
        path,
        alive: z.alive,
        baseBefore: Math.round(baseBefore),
        baseAfter: Math.round(b.enemyBaseHp),
        baseDelta: Math.round(baseBefore - b.enemyBaseHp),
      });
    })()
  `);
  console.log('[march]', res);
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
