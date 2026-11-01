import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  const profileDir = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_chk_${Date.now()}`;
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:8087/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9225/json/list');
  const tabs = await res.json();
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('8087'));
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let msgId = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const curId = msgId++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === curId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  };

  await new Promise(r => ws.onopen = r);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const msg = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(`[BROWSER ${data.params.type}]:`, msg);
    }
  };

  await send('Runtime.enable');

  await send('Runtime.evaluate', {
    expression: `(() => {
      window.__MOZHEN_APP__.enterGame();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  // Directly start level 1 battle
  const startRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      const app = window.__MOZHEN_APP__;
      const { getLevel } = await import('./src/data/levels.js?v=1.77');
      const lvl = getLevel(1);
      app.startBattle(lvl, 'zhaoyun', lvl.fixedDeck);
      await new Promise(r => setTimeout(r, 150));
      const b = app.battle;
      b.paused = true; // pause game loop so test has exclusive control
      return {
        hasBattle: !!app.battle,
        battleState: app.battle?.state,
        hasScene: !!app.battle?.scene,
        hasHud: !!app.ui?.cardTray,
        markerGroup: !!app.battle?.scene?.tutorialMarkerGroup,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  // Test tutorial step 0 and 1
  const tutRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const app = window.__MOZHEN_APP__;
        const b = app.battle;
        b.paused = true;
        b.introT = 0;
        b.state = 'fighting';
        const tut = b.tutorial;
        // Start tutorial step 0 for Level 1 ('l1')
        tut.start('l1');
        tut.update(0.45); // resolves pendingNext -> starts delayTimer (0.5)
        tut.update(0.55); // resolves delayTimer -> executes showStep (Step 0 is waiting!)
        await new Promise(r => setTimeout(r, 100));

        const stateBefore = {
          waiting: tut.waiting,
          index: tut.index,
          currentEvent: tut.current?.event,
          currentUnit: tut.current?.unit,
        };

        // Simulate card selected (step 0 -> step 1)
        tut.handle('cardSelected', { id: 'swordsman' });
        tut.update(0.4); // advance timer to trigger next step!
        await new Promise(r => setTimeout(r, 100));

        const stateAfter = {
          waiting: tut.waiting,
          index: tut.index,
          currentEvent: tut.current?.event,
          currentKind: tut.current?.targetKind,
          currentWorld: tut.current?.targetWorld,
        };

        const markerVis = b.scene.tutorialMarkerGroup?.visible;
        const markerPos = b.scene.tutorialMarkerGroup?.position;
        const zoneBadge = b.ui.zoneHint?.querySelector('.zone-hint-text')?.textContent;
        const handPos = {
          left: b.ui.tutorialHand?.style.left,
          top: b.ui.tutorialHand?.style.top,
        };

        // Deploy swordsman at (-5, 0)
        b.energy = 20;
        b.selectedCard = 'swordsman';
        b.deployAt(-5.0, 0.0);
        tut.update(0.35); // advance to Step 2 (步弓合击 · 远程火力)
        tut.update(3.6);  // resolve delayBefore: 3.5 for Step 2

        const stateStep2 = {
          waiting: tut.waiting,
          index: tut.index,
          currentEvent: tut.current?.event,
          currentUnit: tut.current?.unit,
        };

        // Select archer card (step 2 -> step 3)
        tut.handle('cardSelected', { id: 'archer' });
        tut.update(0.35); // advance to Step 3

        const stateStep3 = {
          waiting: tut.waiting,
          index: tut.index,
          currentEvent: tut.current?.event,
          currentKind: tut.current?.targetKind,
          currentWorld: tut.current?.targetWorld,
        };

        const markerStep3Vis = b.scene.tutorialMarkerGroup?.visible;
        const markerStep3Pos = b.scene.tutorialMarkerGroup?.position;
        const zoneStep3Badge = b.ui.zoneHint?.querySelector('.zone-hint-text')?.textContent;
        const handStep3Pos = {
          left: b.ui.tutorialHand?.style.left,
          top: b.ui.tutorialHand?.style.top,
        };

        // Deploy archer at (-10, 0)
        b.energy = 20;
        b.selectedCard = 'archer';
        b.deployAt(-10.0, 0.0);

        return {
          stateBefore,
          stateAfter,
          markerVis,
          markerPos: markerPos ? { x: markerPos.x, z: markerPos.z } : null,
          zoneBadge,
          handPos,
          stateStep2,
          stateStep3,
          markerStep3Vis,
          markerStep3Pos: markerStep3Pos ? { x: markerStep3Pos.x, z: markerStep3Pos.z } : null,
          zoneStep3Badge,
        };
      } catch (err) {
        return { error: err.message, stack: err.stack };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log('In-battle Tutorial & 3D Target Marker Result:', JSON.stringify(tutRes.result.value, null, 2));

  edge.kill();
}

run().catch(console.error);
