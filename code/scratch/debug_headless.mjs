import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_10',
    'http://localhost:8087/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await res.json();
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('8087'));
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  await new Promise(r => ws.onopen = r);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const args = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(`[CONSOLE ${data.params.type.toUpperCase()}]:`, args);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error(`[EXCEPTION]:`, JSON.stringify(data.params.exceptionDetails, null, 2));
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  // Wait until app is ready and title screen is up
  console.log("Waiting for app boot...");
  for (let i = 0; i < 20; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `!!window.__MOZHEN_APP__ && document.querySelector('.screen.active')?.id === 'screen-title'`,
      returnByValue: true
    });
    if (r.result?.value) break;
    await new Promise(res => setTimeout(res, 500));
  }

  console.log("Clicking enter game...");
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-enter-game').click();`
  });

  // Wait until home screen is active
  console.log("Waiting for home screen...");
  for (let i = 0; i < 20; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `document.querySelector('.screen.active')?.id === 'screen-home'`,
      returnByValue: true
    });
    if (r.result?.value) break;
    await new Promise(res => setTimeout(res, 500));
  }

  console.log("--- TEST 1: Home screen endless button click ---");
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-home-endless').click();`
  });

  // Wait for battle to start
  await new Promise(res => setTimeout(res, 2500));

  const endlessState = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const app = window.__MOZHEN_APP__;
        return {
          currentScreen: document.querySelector('.screen.active')?.id,
          hasBattle: !!app.battle,
          battleState: app.battle?.state,
          isEndless: app.battle?.isEndless,
          endlessWave: app.battle?.endlessWave,
          heroHp: app.battle?.heroHp,
          enemyBaseHp: app.battle?.enemyBaseHp,
          toast: document.querySelector('.toast')?.textContent
        };
      })()
    `,
    returnByValue: true
  });
  console.log("Endless battle state:", JSON.stringify(endlessState, null, 2));

  console.log("--- TEST 2: Retreat from endless battle ---");
  await send('Runtime.evaluate', {
    expression: `window.__MOZHEN_APP__.battle.requestRetreat();`
  });

  await new Promise(res => setTimeout(res, 1500));

  const afterRetreat = await send('Runtime.evaluate', {
    expression: `document.querySelector('.screen.active')?.id`,
    returnByValue: true
  });
  console.log("Screen after retreat:", afterRetreat.result?.value);

  console.log("--- TEST 3: Campaign battle (Level 1) from Levels screen ---");
  await send('Runtime.evaluate', {
    expression: `
      window.__MOZHEN_APP__.openLevels();
      const node = document.querySelector('.level-node[data-id="1"]');
      if (node) node.click();
      const startBtn = document.getElementById('btn-start-battle');
      if (startBtn) startBtn.click();
    `
  });

  await new Promise(res => setTimeout(res, 2500));

  const normalState = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const app = window.__MOZHEN_APP__;
        return {
          currentScreen: document.querySelector('.screen.active')?.id,
          hasBattle: !!app.battle,
          battleState: app.battle?.state,
          levelId: app.battle?.level?.id,
          levelName: app.battle?.level?.name
        };
      })()
    `,
    returnByValue: true
  });
  console.log("Normal battle state:", JSON.stringify(normalState, null, 2));

  ws.close();
  edge.kill();
  console.log("ALL REAL BROWSER TESTS COMPLETED!");
}

run().catch(console.error);
