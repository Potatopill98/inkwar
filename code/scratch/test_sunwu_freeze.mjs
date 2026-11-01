// 孙武普攻卡死复现与定位
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9381;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_sunwu_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise((r) => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 1;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}, timeout = 4000) => new Promise((res) => {
    const mid = id++;
    const timer = setTimeout(() => { pending.delete(mid); res({ timedOut: true }); }, timeout);
    pending.set(mid, (m) => { clearTimeout(timer); res(m); });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const ev = async (expr, timeout = 4000) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, timeout);
    if (r.timedOut) return 'HANG';
    if (r.result?.exceptionDetails) return 'EXC ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  const exceptions = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=sunwu' });
  await new Promise((r) => setTimeout(r, 3200));

  const boot = await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.enterGame();
      a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
      a.save.progress.unlockedLevel = 20;
      a.save.unlocks.heroes = ['zhaoyun','sunwu'];
      if (a.firstGuide) { a.firstGuide.hide(); if (a.firstGuide.el) a.firstGuide.el.remove(); }
      a.openPrep(5); a.selectHero('sunwu'); a.beginBattleFromPrep();
      return 'ok';
    })()
  `);
  console.log('[boot]', boot);
  await new Promise((r) => setTimeout(r, 1800));

  const seeded = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      if (!b) return 'NO_BATTLE';
      const U = await import('/src/data/units.js');
      ['swordsman','militia','archer','modao'].forEach((uid, i) => {
        b.createEntity({ unit: U.getUnit(uid), side: 'enemy', x: 8.6 + i * 0.5, z: (i % 2 - 0.5) * 1.2, kind: 'unit' });
      });
      b.state = 'running'; b.introT = 0; b.speed = 1;
      b.heroX = 8; b.heroZ = 0; b.heroTargetX = 8; b.heroTargetZ = 0;
      b.heroRallyX = 8; b.heroRallyZ = 0;
      if (b.heroModel && b.heroModel.group) b.heroModel.group.position.set(8, 0, 0);
      return JSON.stringify({ hero: b.heroData.name, stealth: b.heroStealthT, ooc: b.heroOutOfCombatTimer, foes: b.entities.filter(e => e.alive && e.side === 'enemy').length });
    })()
  `);
  console.log('[seed]', seeded);

  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const s = await ev(`
      (() => {
        const b = window.__MOZHEN_APP__.battle;
        return JSON.stringify({
          stealth: Math.round((b.heroStealthT || 0) * 100) / 100,
          ooc: Math.round((b.heroOutOfCombatTimer || 0) * 100) / 100,
          atkAnim: Math.round((b.heroAttackAnim || 0) * 100) / 100,
          atkTimer: Math.round((b.heroAtkTimer || 0) * 100) / 100,
          blocked: b.heroBlockedFoes ? b.heroBlockedFoes.size : -1,
          target: b.heroEngageTarget ? b.heroEngageTarget.unit.name : null,
          hp: Math.round(b.heroHp),
          foes: b.entities.filter((e) => e.alive && e.side === 'enemy').length,
        });
      })()
    `, 3000);
    console.log('[' + i + ']', s);
    if (s === 'HANG') break;
  }
  console.log('[exceptions]', JSON.stringify(exceptions.slice(0, 6), null, 1));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
