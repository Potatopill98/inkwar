// 纸鸢落地火铳形态专项：强制落地 → 贴身敌军 → 检查开火与范围溅射
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9403;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_kite2_${Date.now()}`;
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
  const send = (method, params = {}, timeout = 6000) => new Promise((res) => {
    const mid = id++;
    const timer = setTimeout(() => { pending.delete(mid); res({ timedOut: true }); }, timeout);
    pending.set(mid, (m) => { clearTimeout(timer); res(m); });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const ev = async (expr, timeout = 6000) => {
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 680, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=kite92b' });
  await new Promise((r) => setTimeout(r, 3200));

  const boot = await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.save.progress.unlockedLevel = 20;
      a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
      a.openPrep(5); a.beginBattleFromPrep();
      return 'ok';
    })()
  `);
  console.log('[boot]', boot);
  await new Promise((r) => setTimeout(r, 1800));

  const setup = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      if (!b) return 'NO_BATTLE';
      const U = await import('/src/data/units.js');
      for (const o of b.entities) if (o.side === 'enemy') { o.hp = 0; b.removeEntity(o); }
      b.state = 'running'; b.introT = 0; b.speed = 1;
      b.heroX = -13; b.heroZ = 0;
      const e = b.createEntity({ unit: U.getUnit('zhiyuan'), side: 'player', x: -6, z: 0, kind: 'unit' });
      b.startKiteFall(e);
      return 'falling';
    })()
  `);
  console.log('[setup]', setup);
  await new Promise((r) => setTimeout(r, 1400));

  const gunnerState = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      if (!e) return 'GONE';
      return JSON.stringify({ form: e.form, atk: e.atk, timer: Math.round(e.attackTimer * 100) / 100, invulnT: Math.round(e.invulnT * 100) / 100 });
    })()
  `);
  console.log('[gunner-state]', gunnerState);

  const spawnFoes = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      for (const o of b.entities) if (o.side === 'enemy' && o.alive) { o.hp = 0; b.removeEntity(o); }
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      e.x = -1; e.z = 0; e.model.group.position.x = e.x;
      const a = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 1.4, z: 0.4, kind: 'unit' });
      const c = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 2.4, z: -0.6, kind: 'unit' });
      return JSON.stringify({ foes: [a.hp, c.hp], gunnerX: e.x });
    })()
  `);
  console.log('[spawn-foes]', spawnFoes);

  await new Promise((r) => setTimeout(r, 3000));
  const result = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      if (!e) return 'GONE';
      const foes = b.entities.filter((o) => o.side === 'enemy').map((o) => ({ id: o.unit.id, hp: Math.round(o.hp), alive: o.alive }));
      return JSON.stringify({ form: e.form, style: e.currentAttackStyle, shots: e.shotCount, anim: Math.round(e.attackAnim * 100) / 100, hp: Math.round(e.hp), foes });
    })()
  `);
  console.log('[result]', result);

  console.log('[errors]', JSON.stringify(errors.slice(0, 6)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
