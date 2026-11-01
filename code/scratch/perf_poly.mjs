// 降面验证：加载第 5 关，统计场景三角面/绘制调用，并逐个施放大招确认特效正常
import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9351;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_poly_${Date.now()}`;
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
    if (r.result?.exceptionDetails) return 'EXC ' + r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || '');
    return r.result?.result?.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map((a) => a.value || a.description).join(' '));
    }
  });

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=poly' });
  await new Promise((r) => setTimeout(r, 2800));

  const boot = await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.save.settings.firstGuideDone = true;
      a.save.settings.tutorialDone = true;
      a.save.settings.tourDone = true;
      a.save.unlocks.heroes = ['zhaoyun','hanxin','guanyu','zhugeliang','lvbu','libai','sunwu','weiqing','huoqubing','wuzetian','mengtian','diaochan'];
      a.save.progress.unlockedLevel = 20;
      try { a.openPrep(5); a.beginBattleFromPrep(); return 'ok'; } catch (e) { return 'ERR ' + e.message; }
    })()
  `);
  if (typeof boot === 'string' && boot.startsWith('ERR')) { console.log('BOOT', boot); }
  await new Promise((r) => setTimeout(r, 2000));

  const stats = await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      const b = a.battle; if (!b) return 'NO_BATTLE';
      b.state = 'running'; b.introT = 0; b.speed = 4;
      let tris = 0, verts = 0, meshes = 0;
      b.scene.scene.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        meshes++;
        const g = o.geometry;
        const v = g.attributes.position ? g.attributes.position.count : 0;
        verts += v;
        tris += g.index ? g.index.count / 3 : v / 3;
      });
      const r = b.scene.renderer.info.render;
      return JSON.stringify({
        scene: { meshes, verts, tris: Math.round(tris) },
        lastFrame: { calls: r.calls, triangles: r.triangles },
        quality: b.scene.quality,
      });
    })()
  `);
  console.log('[poly]', stats);

  // 逐个主将施放大招，检查特效链路
  const ids = ['zhaoyun','hanxin','guanyu','zhugeliang','lvbu','libai','sunwu','weiqing','huoqubing','wuzetian','mengtian','diaochan'];
  for (const hid of ids) {
    const r = await ev(`
      (() => {
        const b = window.__MOZHEN_APP__.battle; if (!b) return 'NO_BATTLE';
        try {
          b.heroId = '${hid}';
          b.heroSuperCharge = 100;
          b.useSkill && b.useSkill();
          return 'ok';
        } catch (e) { return 'ERR ' + e.message; }
      })()
    `);
    if (r !== 'ok') console.log('[skill]', hid, r);
  }
  await new Promise((r) => setTimeout(r, 1600));
  console.log('[errors]', JSON.stringify(errors.slice(0, 8)));
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
