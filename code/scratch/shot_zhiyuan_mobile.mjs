// 纸鸢手机端观感验证：iPhone 横屏 844x390@2x 实拍 + 透明底卡面资产导出
import { spawn } from 'child_process';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9405;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_kitem_${Date.now()}`;
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
  // iPhone 12/13/14 横屏逻辑分辨率 @2x
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=kitem92' });
  await new Promise((r) => setTimeout(r, 4000));

  await ev(`
    (() => {
      const a = window.__MOZHEN_APP__;
      a.save.progress.unlockedLevel = 20;
      a.save.settings.firstGuideDone = true; a.save.settings.tutorialDone = true;
      a.openPrep(5); a.beginBattleFromPrep();
      return 'ok';
    })()
  `);
  await new Promise((r) => setTimeout(r, 2200));

  await ev(`
    (async () => {
      const b = window.__MOZHEN_APP__.battle;
      const U = await import('/src/data/units.js');
      for (const o of b.entities) if (o.side === 'enemy') { o.hp = 0; b.removeEntity(o); }
      b.state = 'running'; b.introT = 0; b.paused = true; b.speed = 0;
      b.heroX = -6; b.heroZ = 0;
      const air = b.createEntity({ unit: U.getUnit('zhiyuan'), side: 'player', x: -3.6, z: -0.6, kind: 'unit' });
      const gun = b.createEntity({ unit: U.getUnit('zhiyuan'), side: 'player', x: -7.6, z: 1.4, kind: 'unit' });
      for (const o of b.entities) if (o.isHero) o.model.group.visible = false;
      b.startKiteFall(gun);
      gun.fallT = 5;
      b.updateKiteFall(gun, 0.02);
      air.model.group.position.y = air.airHeight;
      b.updateHealthBars(0.2);
      b.scene && b.scene.render && b.scene.render();
      const cam = b.scene.camera;
      const el = b.scene.renderer.domElement;
      const proj = (ent, dy) => {
        const v = ent.model.group.position.clone();
        v.y += dy;
        v.project(cam);
        return { x: Math.round((v.x * 0.5 + 0.5) * el.width), y: Math.round((-v.y * 0.5 + 0.5) * el.height) };
      };
      window.__KITE_POS__ = { air: proj(air, 1.0), gun: proj(gun, 0.9), size: { w: el.width, h: el.height } };
      return 'ok';
    })()
  `);
  await new Promise((r) => setTimeout(r, 700));

  // 全屏（物理像素 = CSS 像素 x 2）
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    const out = 'E:/taptapgame/inkwar/code/scratch/shot_zhiyuan_mobile.png';
    fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log('[saved]', out, fs.statSync(out).size);
  }
  // 局部放大（clip 用 CSS 像素，输出再乘 deviceScaleFactor）
  const pos = await ev('window.__KITE_POS__');
  console.log('[pos]', JSON.stringify(pos));
  const dpr = pos && pos.size ? pos.size.w / 844 : 2;
  const clipAround = (p, w, h, scale) => ({
    x: Math.max(0, Math.round(p.x / dpr - w / 2)), y: Math.max(0, Math.round(p.y / dpr - h / 2)), width: w, height: h, scale,
  });
  if (pos && pos.air) {
    const z1r = await send('Page.captureScreenshot', { format: 'png', clip: clipAround(pos.air, 90, 70, 4) });
    if (z1r.result?.data) {
      const z1 = 'E:/taptapgame/inkwar/code/scratch/shot_zhiyuan_mobile_air.png';
      fs.writeFileSync(z1, Buffer.from(z1r.result.data, 'base64'));
      console.log('[saved]', z1, fs.statSync(z1).size);
    }
  }
  if (pos && pos.gun) {
    const z2r = await send('Page.captureScreenshot', { format: 'png', clip: clipAround(pos.gun, 70, 55, 5) });
    if (z2r.result?.data) {
      const z2 = 'E:/taptapgame/inkwar/code/scratch/shot_zhiyuan_mobile_gun.png';
      fs.writeFileSync(z2, Buffer.from(z2r.result.data, 'base64'));
      console.log('[saved]', z2, fs.statSync(z2).size);
    }
  }
  // 透明底卡面资产（thumb renderer: alpha + 透明清屏）
  const thumb = await ev(`
    (async () => {
      const a = window.__MOZHEN_APP__;
      const U = await import('/src/data/units.js');
      return a.ui ? a.ui.unitThumb(U.getUnit('zhiyuan')) : 'NO_UI';
    })()
  `, 15000);
  if (typeof thumb === 'string' && thumb.startsWith('data:image')) {
    const p = 'E:/taptapgame/inkwar/code/scratch/zhiyuan_card.png';
    fs.writeFileSync(p, Buffer.from(thumb.split(',')[1], 'base64'));
    console.log('[saved]', p, fs.statSync(p).size);
  } else {
    console.log('[thumb]', String(thumb).slice(0, 120));
  }
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
