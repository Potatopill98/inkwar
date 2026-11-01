// 死士对建筑 800 / 大本营 500 验证
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9402;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_kam_${Date.now()}`;
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
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 640, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=kam' });
  await new Promise((r) => setTimeout(r, 3200));

  await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.enterGame();
      a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
      a.save.progress.unlockedLevel = 20;
      a.save.unlocks.units = [...new Set([...a.save.unlocks.units, 'sishi'])];
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
      const sishi = U.getUnit('sishi');
      b.state = 'running'; b.introT = 0; b.speed = 1;
      // 清空场上敌军，避免误选目标
      for (const e of b.entities.filter((x) => x.side === 'enemy')) b.removeEntity(e);

      // A. 建筑：敌军箭塔
      const tower = b.createEntity({ unit: U.getUnit('arrowtower'), side: 'enemy', x: 9, z: 0, kind: 'building' });
      const towerHpBefore = tower.hp;
      const z1 = b.createEntity({ unit: sishi, side: 'player', x: 8, z: 0, kind: 'unit' });
      b.updateMartyr(z1, 1.0);
      const towerAfter = tower.hp;

      // B. 大本营：贴寨引爆（关闭“先破首领”护盾以单测伤害）
      b.bossShield = false;
      const baseBefore = b.enemyBaseHp;
      const z2 = b.createEntity({ unit: sishi, side: 'player', x: 14.5, z: 0, kind: 'unit' });
      b.martyrDetonate(z2, null);
      const baseAfter = b.enemyBaseHp;

      return JSON.stringify({
        towerHpBefore: Math.round(towerHpBefore),
        towerHpAfter: Math.round(towerAfter),
        towerDelta: Math.round(towerHpBefore - towerAfter),
        baseBefore: Math.round(baseBefore),
        baseAfter: Math.round(baseAfter),
        baseDelta: Math.round(baseBefore - baseAfter),
      });
    })()
  `);
  console.log('[damage]', res);
  console.log('[errors]', JSON.stringify(errors.slice(0, 4)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
