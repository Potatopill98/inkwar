// 死士 / 半仙 / 点兵池 / 陌刀兵克制特效 综合验证
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9401;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_pool_${Date.now()}`;
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 680, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=pool' });
  await new Promise((r) => setTimeout(r, 3200));

  // ===== 1. 点兵池 UI =====
  const gacha = await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.enterGame();
      a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
      if (a.firstGuide) { a.firstGuide.hide(); if (a.firstGuide.el) a.firstGuide.el.remove(); }
      a.openGacha();
      const ui = a.ui;
      ui.setGachaTab('unit');
      const unitCards = ui.gachaUnitGrid ? ui.gachaUnitGrid.children.length : -1;
      const heroVisible = ui.gachaGrid ? ui.gachaGrid.style.display : 'na';
      return JSON.stringify({
        unitCards,
        gridMode: ui.gachaGrid ? ui.gachaGrid.style.display : 'na',
        unitMode: ui.gachaUnitGrid ? ui.gachaUnitGrid.style.display : 'na',
        tabs: ui.gachaTabs ? ui.gachaTabs.children.length : -1,
      });
    })()
  `);
  console.log('[gacha-ui]', gacha);

  const redeem = await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.save.tokens = 250;
      const before = a.save.tokens;
      const ok1 = a.redeemUnit('sishi');
      const ok2 = a.redeemUnit('banxian');
      return JSON.stringify({
        ok1, ok2,
        tokensBefore: before,
        tokensAfter: a.save.tokens,
        unlocked: a.save.unlocks.units.filter((x) => ['sishi', 'banxian'].includes(x)),
      });
    })()
  `);
  console.log('[redeem]', redeem);

  // ===== 2. 进战斗 =====
  const boot = await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.save.progress.unlockedLevel = 20;
      a.openPrep(5); a.beginBattleFromPrep();
      return 'ok';
    })()
  `);
  console.log('[boot]', boot);
  await new Promise((r) => setTimeout(r, 1800));

  // ===== 3. 死士：绕过前排、爆杀后排远程 =====
  const sishiSeed = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      if (!b) return 'NO_BATTLE';
      const U = await import('/src/data/units.js');
      const sishi = U.getUnit('sishi');
      b.spawnPlayerTroops(sishi, 0, 0);
      // 前排近战 + 后排远程
      const front = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 2.5, z: 0, kind: 'unit' });
      const back = b.createEntity({ unit: U.getUnit('archer'), side: 'enemy', x: 11.5, z: 0, kind: 'unit' });
      b.state = 'running'; b.introT = 0; b.speed = 1;
      b.heroX = -10; b.heroZ = 0; b.heroTargetX = -10; b.heroTargetZ = 0;
      if (b.heroModel && b.heroModel.group) b.heroModel.group.position.set(-10, 0, 0);
      const squad = b.entities.filter((e) => e.unit.id === 'sishi');
      return JSON.stringify({ squad: squad.length, frontHp: Math.round(front.hp), backHp: Math.round(back.hp), baseHp: Math.round(b.enemyBaseHp) });
    })()
  `);
  console.log('[sishi-seed]', sishiSeed);

  await new Promise((r) => setTimeout(r, 7000));
  const sishiAfter = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const squad = b.entities.filter((e) => e.unit.id === 'sishi' && e.alive).length;
      const back = b.entities.find((e) => e.side === 'enemy' && e.unit.id === 'archer');
      const front = b.entities.find((e) => e.side === 'enemy' && e.unit.id === 'swordsman');
      return JSON.stringify({
        squadLeft: squad,
        backAlive: back ? back.alive : 'removed',
        frontAlive: front ? front.alive : 'removed',
        frontHp: front ? Math.round(front.hp) : 0,
        baseHp: Math.round(b.enemyBaseHp),
      });
    })()
  `);
  console.log('[sishi-after]', sishiAfter);

  // ===== 4. 半仙：僵尸随行 + 魂印复生 =====
  const necroSeed = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      const banxian = U.getUnit('banxian');
      b.spawnPlayerTroops(banxian, -1, 0);
      b.spawnNecroEscorts(banxian, -1, 0);
      const foes = [];
      for (let i = 0; i < 3; i++) {
        foes.push(b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 3.0 + i * 0.5, z: (i - 1) * 0.9, kind: 'unit' }));
      }
      const zombies = b.entities.filter((e) => e.unit.id === 'zombie').length;
      return JSON.stringify({ zombies, foes: foes.length, tolerance: 'ok' });
    })()
  `);
  console.log('[necro-seed]', necroSeed);

  await new Promise((r) => setTimeout(r, 5000));
  const marked = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const list = b.entities.filter((e) => e.alive && e.side === 'enemy' && (e.buffs.mark || 0) > 0)
        .map((e) => ({ id: e.unit.id, mark: Math.round((e.buffs.mark || 0) * 10) / 10, hp: Math.round(e.hp) }));
      return JSON.stringify({ markedCount: list.length, list, zombies: b.entities.filter((e) => e.unit.id === 'zombie').length });
    })()
  `);
  console.log('[necro-mark]', marked);

  const killMarked = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const priest = b.entities.find((e) => e.side === 'player' && e.unit.id === 'banxian');
      const target = b.entities.find((e) => e.alive && e.side === 'enemy' && (e.buffs.mark || 0) > 0);
      if (!target) return 'NO_MARKED';
      const before = b.entities.filter((e) => e.unit.id === 'zombie' && e.alive).length;
      b.applyDamage(target, target.hp + 999, priest);
      return JSON.stringify({ killed: target.unit.id, zombiesBefore: before });
    })()
  `);
  console.log('[kill-marked]', killMarked);

  await new Promise((r) => setTimeout(r, 1200));
  const revived = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const zs = b.entities.filter((e) => e.unit.id === 'zombie' && e.alive);
      return JSON.stringify({ zombies: zs.length, sample: zs.slice(-1).map((e) => ({ side: e.side, hp: Math.round(e.maxHp), x: Math.round(e.x * 10) / 10 })) });
    })()
  `);
  console.log('[necro-revive]', revived);

  console.log('[errors]', JSON.stringify(errors.slice(0, 5)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
