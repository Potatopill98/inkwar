// 破城/壁垒 离屏近景渲染：直接调 models.js 建模型，THREE 离屏相机拍特写
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9405;

async function main() {
  const profile = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_cu_${Date.now()}`;
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
  const send = (method, params = {}, timeout = 10000) => new Promise((res) => {
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
  await send('Page.navigate', { url: 'http://localhost:8087/index.html?v=cu93' });
  await new Promise((r) => setTimeout(r, 3000));

  const dataUrl = await ev(`
    (async () => {
      const THREE = await import('/lib/three.module.js');
      const M = await import('/src/models.js');
      const U = await import('/src/data/units.js');
      const W = 1400, H = 700;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(W, H, false);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xe8dfc8);
      const amb = new THREE.AmbientLight(0xffffff, 1.1);
      const dir = new THREE.DirectionalLight(0xfff2d8, 1.6);
      dir.position.set(3, 6, 4);
      scene.add(amb, dir);
      const cam = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
      cam.position.set(4.6, 3.2, 7.2);
      cam.lookAt(0.2, 1.0, 0);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ color: 0xd8cdb2 }));
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);
      const mk = (id, x, z) => {
        const m = M.createUnitModel(U.getUnit(id), 'player');
        m.group.position.set(x, 0, z);
        scene.add(m.group);
        return m;
      };
      // 破城：静止 + 撞击中段（吊锤前摆）
      mk('pocheng', -2.6, -0.9);
      const pc2 = mk('pocheng', -0.2, 0.9);
      if (pc2.weaponPivot) pc2.weaponPivot.rotation.z = 0.34;
      // 壁垒：挥锤中段 + 震撼脉动放大
      const bl1 = mk('bilei', 2.4, -0.7);
      if (bl1.weaponPivot) bl1.weaponPivot.rotation.x = -1.0;
      const bl2 = mk('bilei', 4.6, 1.1);
      bl2.group.scale.set(1.16 * 1.12, 1.16 * 1.12, 1.16 * 1.12);
      renderer.render(scene, cam);
      return canvas.toDataURL('image/png');
    })()
  `);
  if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png')) {
    writeFileSync('scratch/shot_closeup.png', Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('[closeup] saved scratch/shot_closeup.png');
  } else {
    console.log('[closeup] FAILED', String(dataUrl).slice(0, 300));
  }
  ws.close();
  edge.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
