// 貂蝉魅惑专项验证：范围内最强 3 名敌军定身 15s，并生成属性 2 倍的我方幻影
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9371;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_charm_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise((r) => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 1;
  const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res) => { const mid = id++; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + (r.result.exceptionDetails.exception?.description || '');
    return r.result?.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=charm' });
  await new Promise((r) => setTimeout(r, 2800));

  const boot = await ev(`
    (() => {
      try {
        const a = window.__MOZHEN_APP__;
        a.enterGame();
        a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
        a.save.progress.unlockedLevel = 20;
        a.save.unlocks.heroes = ['zhaoyun','diaochan'];
        if (a.firstGuide) { a.firstGuide.hide(); if (a.firstGuide.el) a.firstGuide.el.remove(); }
        a.openPrep(5);
        const st1 = { level: a.currentLevel && a.currentLevel.id, deck: a.save.deck, working: a.workingDeck, hero: a.selectedHeroId };
        a.selectHero('diaochan');
        a.beginBattleFromPrep();
        const b = a.battle;
        if (b) { b.state = 'running'; b.introT = 0; b.speed = 4; }
        return JSON.stringify({ st1, hero: a.selectedHeroId, battle: !!b, battleHero: b && b.heroData && b.heroData.name });
      } catch (e) { return 'ERR ' + e.message + ' | ' + e.stack.split('\\n')[1]; }
    })()
  `);
  console.log('[boot]', boot);
  await new Promise((r) => setTimeout(r, 1800));

  // 直接生成一批敌军（不同兵种，便于校验“最强三名”的挑选）
  const seeded = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js?v=1.84');
      const ids = ['militia','archer','swordsman','heavyguard','lightcav','cataphract','modao'];
      ids.forEach((uid, i) => {
        const u = U.getUnit(uid);
        b.createEntity({ unit: u, side: 'enemy', x: 7 + i * 0.4, z: (i % 3 - 1) * 1.0, kind: 'unit' });
      });
      b.heroX = 8; b.heroZ = 0; b.heroTargetX = 8; b.heroTargetZ = 0;
      if (b.heroModel && b.heroModel.group) b.heroModel.group.position.set(8, 0, 0);
      const foes = b.entities.filter((e) => e.alive && e.side === 'enemy' && !e.unit.building && !e.isBoss);
      return JSON.stringify({ spawned: ids.length, foes: foes.length });
    })()
  `);
  console.log('[seed]', seeded);

  const before = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const foes = b.entities.filter((e) => e.alive && e.side === 'enemy' && !e.unit.building).length;
      return JSON.stringify({ hero: b.heroData.name, foes, heroX: b.heroX });
    })()
  `);
  console.log('[before]', before);

  // 把主将放到敌群中央，充能满并释放大招
  const cast = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const foes = b.entities.filter((e) => e.alive && e.side === 'enemy' && !e.unit.building && !e.isBoss);
      if (!foes.length) return 'NO_FOES';
      const cx = foes.reduce((s, e) => s + e.x, 0) / foes.length;
      b.heroX = cx; b.heroZ = 0; b.heroTargetX = cx; b.heroTargetZ = 0;
      if (b.heroModel && b.heroModel.group) b.heroModel.group.position.set(cx, 0, 0);
      b.heroSuperCharge = 100; b.skillCd = 0;
      b.runSkill();
      return 'cast';
    })()
  `);
  console.log('[cast]', cast);

  await new Promise((r) => setTimeout(r, 700));

  const res = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const rooted = b.entities.filter((e) => e.alive && e.side === 'enemy' && (e.buffs.stun || 0) > 10)
        .map((e) => ({ name: e.unit.name, stun: Math.round((e.buffs.stun || 0) * 10) / 10, maxHp: Math.round(e.maxHp) }));
      const mirrors = b.entities.filter((e) => e.alive && e.side === 'player' && e.timedLife > 0)
        .map((e) => ({ name: e.unit.name, life: Math.round(e.timedLife * 10) / 10, maxHp: Math.round(e.maxHp), atk: Math.round(e.atk) }));
      return JSON.stringify({ rooted: rooted.length, rootedList: rooted, mirrors: mirrors.length, mirrorList: mirrors });
    })()
  `);
  console.log('[after]', res);

  // 走 2 秒后再看时间是否递减
  await new Promise((r) => setTimeout(r, 2000));
  const later = await ev(`
    (() => {
      const b = window.__MOZHEN_APP__.battle;
      const m = b.entities.filter((e) => e.alive && e.side === 'player' && e.timedLife > 0);
      return JSON.stringify({ mirrors: m.length, minLife: m.length ? Math.min(...m.map((e) => Math.round(e.timedLife * 10) / 10)) : 0 });
    })()
  `);
  console.log('[later]', later);
  console.log('[errors]', JSON.stringify(errors.slice(0, 6)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
