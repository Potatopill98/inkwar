// 纸鸢（air kite）全机制验证：飞行投弹 / 3% 自损 / 仅远程可击 / 坠地无敌 / 火铳形态 / 火坑
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9402;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_kite_${Date.now()}`;
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
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=kite92' });
  await new Promise((r) => setTimeout(r, 3200));

  // ===== 0. 单位数据 / 点兵池收录 =====
  const data = await ev(`
    (async () => {
      const U = await import('/src/data/units.js');
      const u = U.getUnit('zhiyuan');
      const inGacha = U.GACHA_UNITS.some((x) => x.id === 'zhiyuan');
      return JSON.stringify({ name: u.name, rarity: u.rarity, hp: u.hp, speed: u.speed, air: u.air, special: u.special, inGacha, cost: u.cost });
    })()
  `);
  console.log('[data]', data);

  // ===== 1. 进战斗并清场 =====
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

  const seed = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      if (!b) return 'NO_BATTLE';
      const U = await import('/src/data/units.js');
      const kite = U.getUnit('zhiyuan');
      for (const o of b.entities) if (o.side === 'enemy') { o.hp = 0; b.removeEntity(o); }
      b.state = 'running'; b.introT = 0; b.speed = 1;
      b.heroX = -12; b.heroZ = 0;
      const e = b.createEntity({ unit: kite, side: 'player', x: -6, z: 0, kind: 'unit' });
      return JSON.stringify({ form: e.form, airForm: e.airForm, airHeight: e.airHeight, y: Math.round(e.model.group.position.y * 100) / 100, hp: Math.round(e.hp), maxHp: e.maxHp, barY: e.barY, atk: e.atk });
    })()
  `);
  console.log('[seed]', seed);

  await new Promise((r) => setTimeout(r, 2500));
  const decay = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      if (!e) return 'GONE';
      return JSON.stringify({ form: e.form, hp: Math.round(e.hp * 10) / 10, maxHp: e.maxHp, y: Math.round(e.model.group.position.y * 100) / 100, x: Math.round(e.x * 10) / 10, projectiles: b.projectiles.filter((p) => p.type === 'powder').length, fireZones: b.fireZones.length });
    })()
  `);
  console.log('[decay]', decay);

  // ===== 2. 近战免疫 / 远程可击落 =====
  const immune = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      const melee = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: -4.0, z: 0, kind: 'unit' });
      const archer = b.createEntity({ unit: U.getUnit('archer'), side: 'enemy', x: 2.0, z: 0, kind: 'unit' });
      const before = e.hp;
      b.applyDamage(e, 60, melee);
      const afterMelee = e.hp;
      b.applyDamage(e, 60, archer);
      const afterArcher = e.hp;
      const meleeCanSee = !!b.findTarget(melee, 14);
      const archerCanSee = !!b.findTarget(archer, 14);
      return JSON.stringify({ before: Math.round(before), afterMelee: Math.round(afterMelee), afterArcher: Math.round(afterArcher), meleeCanSee, archerCanSee });
    })()
  `);
  console.log('[immune]', immune);

  await new Promise((r) => setTimeout(r, 3000));
  const bomb = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      const foes = b.entities.filter((o) => o.side === 'enemy' && o.alive).map((o) => ({ id: o.unit.id, hp: Math.round(o.hp) }));
      return JSON.stringify({ form: e.form, x: Math.round(e.x * 10) / 10, y: Math.round(e.model.group.position.y * 100) / 100, foes });
    })()
  `);
  console.log('[bomb]', bomb);

  // ===== 3. 坠落 1 秒无敌 → 火铳形态 =====
  const falling = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      e.hp = 0.4;
      return 'set';
    })()
  `);
  console.log('[force-fall]', falling);
  await new Promise((r) => setTimeout(r, 250));
  const fallState = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      if (!e) return 'GONE';
      const hpBefore = e.hp;
      b.applyDamage(e, 200, null);
      return JSON.stringify({ form: e.form, invulnT: Math.round(e.invulnT * 100) / 100, hpBefore: Math.round(hpBefore), hpAfterHit: Math.round(e.hp), airForm: e.airForm, y: Math.round(e.model.group.position.y * 100) / 100 });
    })()
  `);
  console.log('[falling]', fallState);

  await new Promise((r) => setTimeout(r, 1400));
  const landed = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      if (!e) return 'GONE';
      return JSON.stringify({ form: e.form, airForm: e.airForm, hp: Math.round(e.hp), maxHp: e.maxHp, atk: Math.round(e.atk), range: e.range, interval: e.interval, speed: e.speed, projectile: e.projectile, y: Math.round(e.model.group.position.y * 100) / 100, barY: Math.round(e.barY * 100) / 100, hasWeapon: !!e.weaponPivot });
    })()
  `);
  console.log('[landed]', landed);

  // ===== 4. 火铳范围伤害 =====
  await new Promise((r) => setTimeout(r, 2500));
  const gunner = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      if (!e) return 'GONE';
      const foes = b.entities.filter((o) => o.side === 'enemy' && o.alive).map((o) => ({ id: o.unit.id, hp: Math.round(o.hp), x: Math.round(o.x * 10) / 10 }));
      return JSON.stringify({ form: e.form, style: e.currentAttackStyle, shotCount: e.shotCount, hp: Math.round(e.hp), foes, powder: b.projectiles.filter((p) => p.type === 'powder').length });
    })()
  `);
  console.log('[gunner]', gunner);

  // ===== 5. 阵亡 → 3 秒火坑 =====
  const kill = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan' && x.alive);
      if (!e) return 'NO_GUNNER';
      const zonesBefore = b.fireZones.length;
      const foe = b.entities.find((o) => o.side === 'enemy' && o.alive);
      const foeHp = foe ? foe.hp : -1;
      b.applyDamage(e, 9999, null);
      const zones = b.fireZones.map((z) => ({ x: Math.round(z.x * 10) / 10, life: Math.round(z.life * 10) / 10, dps: z.dps, radius: z.radius, side: z.side }));
      return JSON.stringify({ zonesBefore, zonesAfter: zones.length, zones, foeHp: Math.round(foeHp), form: e.form });
    })()
  `);
  console.log('[kill-firepit]', kill);

  await new Promise((r) => setTimeout(r, 3000));
  const after = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'zhiyuan');
      return JSON.stringify({ kiteExists: !!e, zones: b.fireZones.length, foeLeft: b.entities.filter((o) => o.side === 'enemy' && o.alive).length });
    })()
  `);
  console.log('[after-3s]', after);

  console.log('[errors]', JSON.stringify(errors.slice(0, 6)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
