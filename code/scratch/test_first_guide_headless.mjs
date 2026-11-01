import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("=== 测试无头 Edge 浏览器中 FirstGuide 点击征战与步骤推进 ===");
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_fg_${Date.now()}`,
    'http://localhost:8087/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9223/json/list');
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
  let uncaughtErrors = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const msg = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.log(`[BROWSER ${data.params.type}]:`, msg);
      if (data.params.type === 'error') uncaughtErrors.push(msg);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  console.log("1. 等待游戏加载并进入主界面...");
  await new Promise(r => setTimeout(r, 1000));
  await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      if (app && app.enterGame) app.enterGame();
      else {
        const btn = document.querySelector('#btn-start-game');
        if (btn) btn.click();
      }
    })()`,
    returnByValue: true
  });
  await new Promise(r => setTimeout(r, 1500));

  // 检查当前状态
  const checkState = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      const fg = app ? app.firstGuide : null;
      const spot = document.querySelector('#first-guide .fg-spot');
      const tipTitle = document.querySelector('#first-guide .fg-title');
      const activeScreen = document.querySelector('.screen.active');
      return {
        hasApp: !!app,
        fgStep: fg ? fg.step : null,
        fgDone: fg ? fg.done : null,
        spotVisible: spot ? spot.style.display : null,
        tipTitle: tipTitle ? tipTitle.textContent : null,
        activeScreen: activeScreen ? activeScreen.id : null,
      };
    })()`,
    returnByValue: true
  });

  console.log("初始状态:", JSON.stringify(checkState.result.value, null, 2));

  if (checkState.result.value.activeScreen !== 'screen-home') {
    throw new Error('未在主界面');
  }
  if (!checkState.result.value.spotVisible || checkState.result.value.spotVisible === 'none') {
    throw new Error('聚光灯未显示');
  }

  console.log("2. 模拟玩家点击高亮征战按钮 (.fg-spot)...");
  const clickRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const spot = document.querySelector('#first-guide .fg-spot');
      if (!spot) return { ok: false, err: 'no spot' };
      const evt = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      spot.dispatchEvent(evt);
      return { ok: true };
    })()`,
    returnByValue: true
  });
  console.log("点击结果:", clickRes.result.value);

  // 等待切换到关卡列表并推进引导
  await new Promise(r => setTimeout(r, 600));

  const checkState2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      const fg = app ? app.firstGuide : null;
      const spot = document.querySelector('#first-guide .fg-spot');
      const tipTitle = document.querySelector('#first-guide .fg-title');
      const activeScreen = document.querySelector('.screen.active');
      return {
        fgStep: fg ? fg.step : null,
        spotVisible: spot ? spot.style.display : null,
        tipTitle: tipTitle ? tipTitle.textContent : null,
        activeScreen: activeScreen ? activeScreen.id : null,
      };
    })()`,
    returnByValue: true
  });

  console.log("点击征战后状态:", JSON.stringify(checkState2.result.value, null, 2));

  if (checkState2.result.value.activeScreen !== 'screen-levels') {
    throw new Error(`预期切换至 screen-levels，实际在: ${checkState2.result.value.activeScreen}`);
  }
  if (checkState2.result.value.fgStep !== 1) {
    throw new Error(`预期引导步骤为 1（初阵破敌），实际为: ${checkState2.result.value.fgStep}`);
  }

  console.log("3. 模拟点击第 1 关节点...");
  const clickRes2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const spot = document.querySelector('#first-guide .fg-spot');
      if (!spot) return { ok: false, err: 'no spot' };
      const evt = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      spot.dispatchEvent(evt);
      return { ok: true };
    })()`,
    returnByValue: true
  });
  console.log("点击第 1 关结果:", clickRes2.result.value);

  await new Promise(r => setTimeout(r, 600));

  const checkState3 = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      const fg = app ? app.firstGuide : null;
      const activeScreen = document.querySelector('.screen.active');
      return {
        fgStep: fg ? fg.step : null,
        tipTitle: document.querySelector('#first-guide .fg-title')?.textContent,
        activeScreen: activeScreen ? activeScreen.id : null,
      };
    })()`,
    returnByValue: true
  });

  console.log("点击第 1 关后状态 (点将台/出战):", JSON.stringify(checkState3.result.value, null, 2));

  if (checkState3.result.value.activeScreen !== 'screen-prep') {
    throw new Error(`预期切换至 screen-prep，实际在: ${checkState3.result.value.activeScreen}`);
  }
  if (checkState3.result.value.fgStep !== 2) {
    throw new Error(`预期引导步骤为 2（擂鼓开战），实际为: ${checkState3.result.value.fgStep}`);
  }

  // 等待 800ms 确保 show(2) 完成并找到 #btn-start-battle
  await new Promise(r => setTimeout(r, 800));

  console.log("4. 检查点将台状态并点击【出战】按钮...");
  const prepDiag = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      const fg = app ? app.firstGuide : null;
      const target = fg ? fg.activeTarget : null;
      return {
        hasApp: !!app,
        currentLevel: app ? !!app.currentLevel : false,
        levelId: app && app.currentLevel ? app.currentLevel.id : null,
        workingDeck: app ? app.workingDeck : null,
        saveDeck: app && app.save ? app.save.deck : null,
        fgStep: fg ? fg.step : null,
        activeTargetTag: target ? target.tagName + '#' + target.id : null,
        rawBtnExists: !!document.querySelector('#btn-start-battle'),
        rawBtnOffsetParent: !!(document.querySelector('#btn-start-battle')?.offsetParent),
        rawBtnRect: document.querySelector('#btn-start-battle')?.getBoundingClientRect(),
        screenPrepClasses: document.querySelector('#screen-prep')?.className,
      };
    })()`,
    returnByValue: true
  });
  console.log("出战前诊断信息:", JSON.stringify(prepDiag.result.value, null, 2));

  const clickRes3 = await send('Runtime.evaluate', {
    expression: `(() => {
      const spot = document.querySelector('#first-guide .fg-spot');
      if (!spot) return { ok: false, err: 'no spot' };
      const evt = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      spot.dispatchEvent(evt);
      return { ok: true };
    })()`,
    returnByValue: true
  });
  console.log("点击出战结果:", clickRes3.result.value);

  await new Promise(r => setTimeout(r, 800));

  const checkState4 = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      const activeScreen = document.querySelector('.screen.active');
      const battleRunning = app && app.battle && app.battle.state;
      const fgDisplay = document.querySelector('#first-guide')?.style.display;
      return {
        activeScreen: activeScreen ? activeScreen.id : null,
        battleRunning,
        fgDisplay,
      };
    })()`,
    returnByValue: true
  });

  console.log("进入战斗状态:", JSON.stringify(checkState4.result.value, null, 2));

  if (checkState4.result.value.activeScreen !== 'screen-battle') {
    throw new Error(`预期切换至 screen-battle，实际在: ${checkState4.result.value.activeScreen}`);
  }
  if (checkState4.result.value.fgDisplay !== 'none') {
    throw new Error('进入战斗后局外引导应隐藏！');
  }

  console.log("\n=============================================");
  console.log("🎉🎉🎉 无头浏览器测试 100% 通过！征战->第一关->出战->战斗流程完美打通！");
  console.log("=============================================");

  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
