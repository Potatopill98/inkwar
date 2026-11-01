// 破城 & 壁垒 全机制验证：
// 破城 —— 首击4秒/仅攻建筑与大本营/同目标连撞+500/换目标重置/撞车模型+ramSwing动画
// 壁垒 —— 50%反伤/累积半血触发震撼(治疗不清零)/至多2次/0.5秒定身脉动/仅攻建筑40伤
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9403;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_ram_${Date.now()}`;
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
  const send = (method, params = {}, timeout = 8000) => new Promise((res) => {
    const mid = id++;
    const timer = setTimeout(() => { pending.delete(mid); res({ timedOut: true }); }, timeout);
    pending.set(mid, (m) => { clearTimeout(timer); res(m); });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const ev = async (expr, timeout = 8000) => {
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
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=ram93' });
  await new Promise((r) => setTimeout(r, 3200));

  // ===== 0. 单位数据 / 点兵池收录 =====
  const data = await ev(`
    (async () => {
      const U = await import('/src/data/units.js');
      const p = U.getUnit('pocheng');
      const l = U.getUnit('bilei');
      return JSON.stringify({
        p: { name: p.name, rarity: p.rarity, cost: p.cost, hp: p.hp, atk: p.atk, armor: p.armor, interval: p.interval, speed: p.speed, special: p.special, firstDelay: p.fx.firstDelay, rampStep: p.fx.rampStep, inGacha: U.GACHA_UNITS.some((x) => x.id === 'pocheng') },
        l: { name: l.name, rarity: l.rarity, cost: l.cost, hp: l.hp, atk: l.atk, interval: l.interval, speed: l.speed, special: l.special, reflect: l.fx.reflect, shockThreshold: l.fx.shockThreshold, maxShocks: l.fx.maxShocks, inGacha: U.GACHA_UNITS.some((x) => x.id === 'bilei') },
      });
    })()
  `);
  console.log('[data]', data);

  // ===== 1. 进战斗并冻结战场 =====
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
  await new Promise((r) => setTimeout(r, 1500));

  const freeze = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      if (!b) return 'NO_BATTLE';
      b.level.waves = []; b.spawnQueue = []; b.level.boss = null;
      for (const o of b.entities) if (o.side === 'enemy') { o.hp = 0; b.removeEntity(o); }
      b.state = 'running'; b.introT = 0; b.speed = 1;
      return JSON.stringify({ entities: b.entities.length, state: b.state });
    })()
  `);
  console.log('[freeze]', freeze);

  // ===== 2. 破城入场：首击4秒 / 撞车模型与吊锤挂点 =====
  const seedRam = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      const e = b.createEntity({ unit: U.getUnit('pocheng'), side: 'player', x: -6, z: 0, kind: 'unit' });
      return JSON.stringify({
        attackTimer: e.attackTimer, ramKey: e.ramKey, ramStacks: e.ramStacks,
        hp: e.hp, armor: e.armor, interval: e.interval,
        hasPivot: !!e.weaponPivot, pivotY: e.weaponPivot ? Math.round(e.weaponPivot.position.y * 100) / 100 : null,
        modelKids: e.model.group.children.length,
      });
    })()
  `);
  console.log('[ram-seed]', seedRam);

  // ===== 3. 破城对建筑连撞递增 / 换目标重置 =====
  const ramp = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      const e = b.entities.find((x) => x.unit.id === 'pocheng');
      const bar = b.createEntity({ unit: U.getUnit('barricade'), side: 'enemy', x: 8, z: 0, kind: 'building' });
      bar.armor = 0; bar.hp = bar.maxHp = 100000;
      const drops = [];
      let last = bar.hp;
      for (let i = 0; i < 3; i++) { b.performAttack(e, bar); drops.push(Math.round(last - bar.hp)); last = bar.hp; }
      const style = e.currentAttackStyle;
      const dur = e.attackDuration;
      const tower = b.createEntity({ unit: U.getUnit('arrowtower'), side: 'enemy', x: 12, z: 2, kind: 'building' });
      tower.armor = 0; tower.hp = tower.maxHp = 100000;
      const tLast = tower.hp;
      b.performAttack(e, tower);
      const resetDrop = Math.round(tLast - tower.hp);
      b.removeEntity(bar); b.removeEntity(tower);
      return JSON.stringify({ drops, resetDrop, style, dur, stacks: e.ramStacks });
    })()
  `);
  console.log('[ram-ramp]', ramp);

  // ===== 4. 破城对大本营递增（与建筑各自计档） =====
  const base = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const e = b.entities.find((x) => x.unit.id === 'pocheng');
      const hits = [];
      const orig = b.damageEnemyBase.bind(b);
      b.damageEnemyBase = (d, s) => { hits.push(Math.round(d)); };
      b.attackBase(e); b.attackBase(e); b.attackBase(e);
      b.damageEnemyBase = orig;
      return JSON.stringify({ hits, ramKey: e.ramKey, stacks: e.ramStacks });
    })()
  `);
  console.log('[ram-base]', base);

  // ===== 5. 破城行为：无视敌兵直奔建筑，进入射程后约4秒首撞 =====
  const behave = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      for (const o of [...b.entities]) b.removeEntity(o);
      const e = b.createEntity({ unit: U.getUnit('pocheng'), side: 'player', x: 2.0, z: 0, kind: 'unit' });
      const foe = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 1.0, z: 1.6, kind: 'unit' });
      const bar = b.createEntity({ unit: U.getUnit('barricade'), side: 'enemy', x: 4.0, z: 0, kind: 'building' });
      bar.armor = 0; bar.hp = bar.maxHp = 100000;
      window.__ramTest = { e, foe, bar, barHp0: bar.hp, foeHp0: foe.hp };
      return 'seeded';
    })()
  `);
  console.log('[ram-behave-seed]', behave);
  await new Promise((r) => setTimeout(r, 2400));
  const behaveMid = await ev(`
    (() => {
      const t = window.__ramTest;
      return JSON.stringify({ t: '2.4s', combo: t.e.comboCount || 0, x: Math.round(t.e.x * 100) / 100, foeHp: Math.round(t.foe.hp), foeHp0: Math.round(t.foeHp0), barLost: Math.round(t.barHp0 - t.bar.hp) });
    })()
  `);
  console.log('[ram-behave-2.4s]', behaveMid);
  await new Promise((r) => setTimeout(r, 3200));
  const behaveEnd = await ev(`
    (() => {
      const t = window.__ramTest;
      return JSON.stringify({ t: '5.6s', combo: t.e.comboCount || 0, barLost: Math.round(t.barHp0 - t.bar.hp), foeHp: Math.round(t.foe.hp), style: t.e.currentAttackStyle, x: Math.round(t.e.x * 100) / 100 });
    })()
  `);
  console.log('[ram-behave-5.6s]', behaveEnd);

  // ===== 6. 壁垒入场 =====
  const seedBul = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      for (const o of [...b.entities]) b.removeEntity(o);
      const e = b.createEntity({ unit: U.getUnit('bilei'), side: 'player', x: -6, z: 0, kind: 'unit' });
      return JSON.stringify({ hp: e.hp, atk: e.atk, shockAcc: e.shockAcc, shocksUsed: e.shocksUsed, shockT: e.shockT, hasPivot: !!e.weaponPivot, barY: Math.round(e.barY * 100) / 100, size: e.unit.look.size, fat: e.unit.look.fat });
    })()
  `);
  console.log('[bulwark-seed]', seedBul);

  // ===== 7. 壁垒反伤 + 累积半血震撼（同步块内完成，含治疗验证累积制） =====
  const shock = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      const e = b.entities.find((x) => x.unit.id === 'bilei');
      e.armor = 0; e.x = -6; e.z = 0;
      const foe = b.createEntity({ unit: U.getUnit('pocheng'), side: 'enemy', x: -4.5, z: 0, kind: 'unit' });
      foe.armor = 0; foe.speed = 0;
      const log = {};
      // —— 反伤：1000 伤害 → 敌手反吃 500 ——
      b.applyDamage(e, 1000, foe);
      log.afterReflect = { eHp: Math.round(e.hp), foeHp: Math.round(foe.hp), shockAcc: e.shockAcc, shocksUsed: e.shocksUsed };
      // —— 治疗回满，验证震撼按累积伤害而非当前血量 ——
      e.hp = e.maxHp;
      b.applyDamage(e, 4200, null);   // 累积 1000+4200=5200 ≥ 5000 → 第 1 次震撼
      log.afterShock1 = { eHp: Math.round(e.hp), foeHp: Math.round(foe.hp), shockAcc: Math.round(e.shockAcc), shocksUsed: e.shocksUsed, shockT: Math.round(e.shockT * 100) / 100 };
      b.applyDamage(e, 4800, null);   // 累积 200+4800=5000 → 第 2 次震撼（敌手退场）
      log.afterShock2 = { eHp: Math.round(e.hp), foeAlive: foe.alive, shockAcc: Math.round(e.shockAcc), shocksUsed: e.shocksUsed, shockT: Math.round(e.shockT * 100) / 100 };
      b.applyDamage(e, 500, null);    // 已封顶：不再释放
      log.afterCap = { eHp: Math.round(e.hp), shocksUsed: e.shocksUsed, shockAcc: Math.round(e.shockAcc) };
      window.__bulTest = { e };
      return JSON.stringify(log);
    })()
  `);
  console.log('[bulwark-shock]', shock);

  // 震撼定身期间模型脉动 & 0.5 秒后恢复
  const pulseNow = await ev(`
    (() => {
      const t = window.__bulTest;
      const sx = Math.abs(t.e.model.group.scale.x);
      const bs = Math.abs(t.e.baseScale || 1.12);
      return JSON.stringify({ shockT: Math.round(t.e.shockT * 100) / 100, scaleK: Math.round((sx / bs) * 1000) / 1000 });
    })()
  `);
  console.log('[bulwark-pulse]', pulseNow);
  await new Promise((r) => setTimeout(r, 700));
  const pulseEnd = await ev(`
    (() => {
      const t = window.__bulTest;
      return JSON.stringify({ shockT: Math.round(t.e.shockT * 100) / 100 });
    })()
  `);
  console.log('[bulwark-pulse-end]', pulseEnd);

  // ===== 8. 壁垒无视敌兵；射程内对建筑每击 40 =====
  const bulIgnore = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      for (const o of [...b.entities]) b.removeEntity(o);
      const e = b.createEntity({ unit: U.getUnit('bilei'), side: 'player', x: -6, z: 0, kind: 'unit' });
      const foe = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: -5, z: 0.6, kind: 'unit' });
      foe.armor = 0;
      window.__bulTest2 = { e, foe };
      return 'seeded';
    })()
  `);
  console.log('[bulwark-ignore-seed]', bulIgnore);
  await new Promise((r) => setTimeout(r, 2500));
  const bulIgnoreR = await ev(`
    (() => {
      const t = window.__bulTest2;
      return JSON.stringify({ combo: t.e.comboCount || 0, target: t.e.target ? t.e.target.unit.id : null, x: Math.round(t.e.x * 100) / 100 });
    })()
  `);
  console.log('[bulwark-ignore]', bulIgnoreR);

  const bulAtk = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      const t = window.__bulTest2;
      for (const o of [...b.entities]) if (o !== t.e) b.removeEntity(o);
      t.e.x = -6; t.e.attackTimer = 0;
      const bar = b.createEntity({ unit: U.getUnit('barricade'), side: 'enemy', x: -4.2, z: 0, kind: 'building' });
      bar.armor = 0; bar.hp = bar.maxHp = 100000;
      t.bar = bar; t.barHp0 = bar.hp; t.combo0 = t.e.comboCount || 0;
      return 'seeded';
    })()
  `);
  console.log('[bulwark-atk-seed]', bulAtk);
  await new Promise((r) => setTimeout(r, 3000));
  const bulAtkR = await ev(`
    (() => {
      const t = window.__bulTest2;
      const hits = (t.e.comboCount || 0) - t.combo0;
      const lost = Math.round(t.barHp0 - t.bar.hp);
      return JSON.stringify({ hits, lost, perHit: hits > 0 ? Math.round(lost / hits) : null, style: t.e.currentAttackStyle, dur: t.e.attackDuration });
    })()
  `);
  console.log('[bulwark-atk]', bulAtkR);

  console.log('[errors]', JSON.stringify(errors.slice(0, 6)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
