// 陌刀兵：范围横扫 + 出手动画完整播放验证
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9411;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_modao2_${Date.now()}`;
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
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=modao2' });
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

  const seed = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      b.state = 'running'; b.introT = 0; b.speed = 1;
      for (const e of b.entities.filter((x) => x.side === 'enemy')) b.removeEntity(e);
      b.heroX = -10; b.heroZ = 0; b.heroTargetX = -10; b.heroTargetZ = 0;
      if (b.heroModel && b.heroModel.group) b.heroModel.group.position.set(-10, 0, 0);
      const modao = b.createEntity({ unit: U.getUnit('modao'), side: 'player', x: 6, z: 0, kind: 'unit' });
      const n1 = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 7.2, z: -0.8, kind: 'unit' });
      const n2 = b.createEntity({ unit: U.getUnit('archer'), side: 'enemy', x: 7.6, z: 0.6, kind: 'unit' });
      const far = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 7.4, z: 2.2, kind: 'unit' });
      return JSON.stringify({ modaoHp: Math.round(modao.maxHp), n1: Math.round(n1.maxHp), n2: Math.round(n2.maxHp), farZ: far.z });
    })()
  `);
  console.log('[seed]', seed);

  let animationSeen = null;
  let motionSeen = null;
  for (let i = 0; i < 22; i++) {
    await new Promise((r) => setTimeout(r, 220));
    const s = await ev(`
      (() => {
        const b = window.__MOZHEN_APP__.battle;
        const m = b.entities.find((e) => e.unit.id === 'modao' && e.side === 'player');
        const foes = b.entities.filter((e) => e.side === 'enemy');
        return JSON.stringify({
          anim: m ? Math.round((m.attackAnim || 0) * 100) / 100 : -1,
          dur: m ? m.attackDuration : -1,
          style: m ? m.currentAttackStyle : '',
          mx: m ? Math.round(m.x * 100) / 100 : -1,
          foeHp: foes.map((f) => ({ id: f.unit.id, z: f.z, hp: Math.round(f.hp), alive: f.alive })),
        });
      })()
    `, 3000);
    if (s === 'HANG') { console.log('HANG at', i); break; }
    const parsed = JSON.parse(s || '{}');
    if (!animationSeen && parsed.anim > 0 && parsed.foeHp.length && parsed.foeHp.every((f) => !f.alive)) {
      animationSeen = { i, anim: parsed.anim, mx: parsed.mx, foes: parsed.foeHp };
    }
    if (i === 3 || i === 6 || i === 10) console.log('[' + i + ']', s);
    if (animationSeen) break;
  }
  console.log('[anim-after-kill]', JSON.stringify(animationSeen));

  // 非陌刀兵：普通剑兵击杀目标后动画是否播完
  const swordCheck = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      for (const e of b.entities.filter((x) => x.side === 'enemy')) b.removeEntity(e);
      const sw = b.createEntity({ unit: U.getUnit('swordsman'), side: 'player', x: 0, z: 0, kind: 'unit' });
      const foe = b.createEntity({ unit: U.getUnit('militia'), side: 'enemy', x: 1.0, z: 0, kind: 'unit', hpOverride: 1 });
      return JSON.stringify({ foeHp: foe.hp });
    })()
  `);
  console.log('[sword-seed]', swordCheck);
  await new Promise((r) => setTimeout(r, 900));
  const swordAnim = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const sw = b.entities.find((e) => e.unit.id === 'swordsman' && e.side === 'player');
      const foe = b.entities.find((e) => e.side === 'enemy');
      return JSON.stringify({ anim: sw ? Math.round((sw.attackAnim || 0) * 100) / 100 : -1, foeAlive: foe ? foe.alive : 'removed' });
    })()
  `);
  console.log('[sword-anim]', swordAnim);
  console.log('[errors]', JSON.stringify(errors.slice(0, 4)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
