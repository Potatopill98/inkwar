// 普通士兵：击杀目标后仍完成攻击动画
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9412;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_anims_${Date.now()}`;
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
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=anims' });
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

  await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      b.state = 'running'; b.introT = 0; b.speed = 1;
      for (const e of b.entities.filter((x) => x.side === 'enemy')) b.removeEntity(e);
      b.heroX = -10; b.heroZ = 0; b.heroTargetX = -10; b.heroTargetZ = 0;
      const sw = b.createEntity({ unit: U.getUnit('swordsman'), side: 'player', x: 0, z: 0, kind: 'unit' });
      sw.attackTimer = 0.35;
      const foe = b.createEntity({ unit: U.getUnit('militia'), side: 'enemy', x: 1.1, z: 0, kind: 'unit', hpOverride: 1 });
      return 'ok';
    })()
  `);

  const samples = [];
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 80));
    const s = await ev(`
      (() => {
        const b = window.__MOZHEN_APP__.battle;
        const sw = b.entities.find((e) => e.unit.id === 'swordsman' && e.side === 'player');
        const foe = b.entities.find((e) => e.side === 'enemy');
        return JSON.stringify({
          anim: sw ? Math.round((sw.attackAnim || 0) * 100) / 100 : -1,
          dur: sw ? sw.attackDuration : -1,
          foeAlive: foe ? foe.alive : false,
        });
      })()
    `);
    if (s === 'HANG') break;
    samples.push(JSON.parse(s));
  }
  const killedIdx = samples.findIndex((x) => !x.foeAlive && x.anim > 0);
  const finished = samples.slice(killedIdx).find((x) => x.anim === 0);
  console.log('[samples]', JSON.stringify(samples.filter((x, i) => i < 12 || i % 3 === 0)));
  console.log('[verdict]', JSON.stringify({
    killFrameWithAnim: killedIdx >= 0 ? samples[killedIdx] : null,
    animToZeroAfterKill: !!finished,
  }));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
