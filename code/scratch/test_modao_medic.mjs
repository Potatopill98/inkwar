// 陌刀兵重挥砍 & 军医全场治疗验证
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9391;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_mm_${Date.now()}`;
  const edge = spawn(edgePath, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`, 'about:blank']);
  await new Promise((r) => setTimeout(r, 1800));
  const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 1;
  const pending = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
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
  await send('Page.enable'); await send('Runtime.enable');
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 640, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=mm' });
  await new Promise((r) => setTimeout(r, 3200));

  const boot = await ev(`
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
  console.log('[boot]', boot);
  await new Promise((r) => setTimeout(r, 1800));

  const seeded = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      if (!b) return 'NO_BATTLE';
      const U = await import('/src/data/units.js');
      // 我方陌刀兵 + 敌军（近战剑兵 / 远程弓兵）
      const modao = b.createEntity({ unit: U.getUnit('modao'), side: 'player', x: 7.6, z: 0, kind: 'unit' });
      const foeMelee = b.createEntity({ unit: U.getUnit('swordsman'), side: 'enemy', x: 8.6, z: 0, kind: 'unit' });
      const foeRanged = b.createEntity({ unit: U.getUnit('archer'), side: 'enemy', x: 8.6, z: 1.6, kind: 'unit' });
      // 军医 + 近处满血友军 + 远处重伤友军
      const medic = b.createEntity({ unit: U.getUnit('medic'), side: 'player', x: -6, z: 0, kind: 'unit' });
      const fullAlly = b.createEntity({ unit: U.getUnit('swordsman'), side: 'player', x: -5.4, z: 1.2, kind: 'unit' });
      const hurtAlly = b.createEntity({ unit: U.getUnit('swordsman'), side: 'player', x: 0.5, z: -1.0, kind: 'unit' });
      hurtAlly.hp = Math.round(hurtAlly.maxHp * 0.3);
      b.state = 'running'; b.introT = 0; b.speed = 1;
      return JSON.stringify({
        modao: { atk: modao.atk, interval: modao.interval, dur: modao.attackDuration, style: modao.currentAttackStyle },
        medicInterval: medic.interval, medicX: medic.x,
        hurtHp: Math.round(hurtAlly.hp), hurtMax: Math.round(hurtAlly.maxHp),
        calcVsMelee: Math.round(b.calcDamage(modao, foeMelee, modao.atk)),
        calcVsRanged: Math.round(b.calcDamage(modao, foeRanged, modao.atk)),
        tagsMelee: foeMelee.unit.tags, tagsRanged: foeRanged.unit.tags,
      });
    })()
  `);
  console.log('[seed]', seeded);

  for (let i = 0; i < 7; i++) {
    await new Promise((r) => setTimeout(r, 900));
    const s = await ev(`
      (() => {
        const b = window.__MOZHEN_APP__.battle;
        const modao = b.entities.find((e) => e.unit.id === 'modao' && e.side === 'player');
        const foes = b.entities.filter((e) => e.side === 'enemy' && (e.unit.id === 'swordsman' || e.unit.id === 'archer'));
        const medic = b.entities.find((e) => e.unit.id === 'medic' && e.side === 'player');
        const hurt = b.entities.find((e) => e.side === 'player' && e.unit.id === 'swordsman' && Math.abs(e.x - 0.5) < 0.6);
        const full = b.entities.find((e) => e.side === 'player' && e.unit.id === 'swordsman' && Math.abs(e.x + 5.4) < 0.6);
        return JSON.stringify({
          modaoStyle: modao && modao.currentAttackStyle,
          modaoDur: modao && Math.round(modao.attackDuration * 100) / 100,
          modaoAnim: modao && Math.round(modao.attackAnim * 100) / 100,
          foeHp: foes.map((f) => ({ id: f.unit.id, hp: Math.round(f.hp), max: Math.round(f.maxHp) })),
          medicX: medic && Math.round(medic.x * 10) / 10,
          hurtHp: hurt && Math.round(hurt.hp),
          hurtMax: hurt && Math.round(hurt.maxHp),
          fullHp: full && Math.round(full.hp),
          fullMax: full && Math.round(full.maxHp),
        });
      })()
    `, 3000);
    console.log('[' + i + ']', s);
    if (s === 'HANG') break;
  }
  console.log('[errors]', JSON.stringify(errors.slice(0, 4)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
