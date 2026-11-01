// 破城 & 壁垒 模型截图：近景确认撞车吊锤与胖将军体型
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9404;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_shot_${Date.now()}`;
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
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) return 'EXC ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result?.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=shot93' });
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
  await new Promise((r) => setTimeout(r, 1500));

  const seed = await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      b.level.waves = []; b.spawnQueue = []; b.level.boss = null;
      for (const o of b.entities) if (o.side === 'enemy') { o.hp = 0; b.removeEntity(o); }
      b.state = 'running'; b.introT = 0;
      const U = await import('/src/data/units.js');
      b.createEntity({ unit: U.getUnit('pocheng'), side: 'player', x: -2, z: -1.2, kind: 'unit' });
      b.createEntity({ unit: U.getUnit('bilei'), side: 'player', x: -5, z: 1.2, kind: 'unit' });
      // 敌方镜像各一只，看红黑配色
      b.createEntity({ unit: U.getUnit('pocheng'), side: 'enemy', x: 3, z: 1.0, kind: 'unit' });
      b.createEntity({ unit: U.getUnit('bilei'), side: 'enemy', x: 6, z: -1.4, kind: 'unit' });
      // 触发破城攻击动画（对空气目标也行——直接设 attackAnim 看中段帧）
      const pc = b.entities.find((x) => x.unit.id === 'pocheng' && x.side === 'player');
      pc.currentAttackStyle = 'ramSwing'; pc.attackDuration = 0.9; pc.attackAnim = 0.45;
      const bl = b.entities.find((x) => x.unit.id === 'bilei' && x.side === 'player');
      bl.currentAttackStyle = 'heavySlash'; bl.attackDuration = 0.6; bl.attackAnim = 0.3;
      b.heroX = -14;
      return 'seeded';
    })()
  `);
  console.log('[seed]', seed);
  await new Promise((r) => setTimeout(r, 400));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    writeFileSync('scratch/shot_pocheng_bilei.png', Buffer.from(shot.result.data, 'base64'));
    console.log('[shot] saved scratch/shot_pocheng_bilei.png');
  } else {
    console.log('[shot] FAILED', JSON.stringify(shot).slice(0, 200));
  }
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
