import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function test() {
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_diag',
    'http://localhost:8087/index.html'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9224/json/list');
  const tabs = await res.json();
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('8087'));
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const msgId = id++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === msgId) {
        ws.removeEventListener('message', handler);
        resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 1000));

  // Enter game
  await send('Runtime.evaluate', { expression: 'window.__MOZHEN_APP__.enterGame()' });
  await new Promise(r => setTimeout(r, 1000));

  // Call openPrep(1)
  await send('Runtime.evaluate', { expression: 'window.__MOZHEN_APP__.openPrep(1)' });
  await new Promise(r => setTimeout(r, 500));

  // Now call show(2)
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      app.firstGuide.show(2);
      const btn = document.querySelector('#btn-start-battle');
      return {
        step: app.firstGuide.step,
        targetDef: app.firstGuide.currentDef.target,
        btnFound: !!btn,
        btnOffsetParent: !!btn?.offsetParent,
        btnRect: btn ? { w: btn.getBoundingClientRect().width, h: btn.getBoundingClientRect().height } : null,
        activeTarget: !!app.firstGuide.activeTarget,
      };
    })()`,
    returnByValue: true
  });
  console.log('Immediate show(2):', evalRes.result.value);

  await new Promise(r => setTimeout(r, 500));

  const evalRes2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      return {
        step: app.firstGuide.step,
        activeTarget: !!app.firstGuide.activeTarget,
        activeTargetTag: app.firstGuide.activeTarget ? app.firstGuide.activeTarget.tagName + '#' + app.firstGuide.activeTarget.id : null,
        spotVisible: app.firstGuide.spot ? app.firstGuide.spot.style.display : null,
      };
    })()`,
    returnByValue: true
  });
  console.log('After 500ms show(2):', evalRes2.result.value);

  edge.kill();
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
