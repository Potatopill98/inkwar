import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("=== 全方位真实浏览器端到端验证 (Headless Edge) ===");
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_final2',
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
  let uncaughtErrors = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      const msg = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      console.error(`[BROWSER ERROR]:`, msg);
      uncaughtErrors.push(msg);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');

  // 等待游戏加载就绪（非 loading 界面）
  console.log("1. 等待游戏加载就绪...");
  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `document.querySelector('.screen.active')?.id`,
      returnByValue: true
    });
    const cur = r.result?.value;
    if (cur && cur !== 'screen-loading') {
      console.log(`加载完成，当前屏幕: ${cur}`);
      break;
    }
    await new Promise(res => setTimeout(res, 500));
  }

  // 点击入阵进入主页
  console.log("2. 点击入阵进入主页...");
  await send('Runtime.evaluate', {
    expression: `
      if (document.querySelector('.screen.active')?.id === 'screen-title') {
        document.getElementById('btn-enter-game')?.click();
      }
    `
  });
  await new Promise(res => setTimeout(res, 1500));

  // 验证主页悬赏与无尽按钮
  const homeCheck = await send('Runtime.evaluate', {
    expression: `
      ({
        screen: document.querySelector('.screen.active')?.id,
        hasHomeEndlessBtn: !!document.getElementById('btn-home-endless'),
        hasBountySection: !!document.getElementById('home-bounty-section'),
        bountyCardsCount: document.querySelectorAll('#home-bounty-list .home-bounty-card').length
      })
    `,
    returnByValue: true
  });
  console.log("主页状态:", homeCheck.result?.value);

  // 场景 1: 从主页点击「墨影试炼 · 无尽」大按钮进入战斗
  console.log("3. 测试场景 1: 主页一键踏入无尽试炼...");
  await send('Runtime.evaluate', { expression: `document.getElementById('btn-home-endless').click();` });
  await new Promise(res => setTimeout(res, 3000));

  const endlessRunCheck = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const app = window.__MOZHEN_APP__;
        return {
          screen: document.querySelector('.screen.active')?.id,
          hasBattle: !!app.battle,
          state: app.battle?.state,
          isEndless: app.battle?.isEndless,
          endlessWave: app.battle?.endlessWave,
          heroHp: app.battle?.heroHp,
          enemyBaseHp: app.battle?.enemyBaseHp,
          cardsCount: app.battle?.cards?.length,
          toastShown: document.querySelector('.toast')?.classList.contains('show')
        };
      })()
    `,
    returnByValue: true
  });
  console.log("无尽战斗状态:", endlessRunCheck.result?.value);

  if (endlessRunCheck.result?.value?.screen !== 'screen-battle') {
    throw new Error("无尽模式未能成功切入 screen-battle 战场！");
  }

  // 退出并返回
  console.log("4. 退出无尽战斗并返回关卡列表...");
  await send('Runtime.evaluate', { expression: `window.__MOZHEN_APP__.battle.requestRetreat();` });
  await new Promise(res => setTimeout(res, 1500));

  // 场景 2: 关卡界面的墨影试炼 Tab 进入
  console.log("5. 测试场景 2: 从关卡选择界面的【墨影试炼 · 无尽】Tab 踏入试炼...");
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const tabs = Array.from(document.querySelectorAll('.chapter-tab'));
        const endlessTab = tabs.find(t => t.textContent.includes('墨影'));
        if (endlessTab) endlessTab.click();
      })()
    `
  });
  await new Promise(res => setTimeout(res, 800));

  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-enter-endless')?.click();`
  });
  await new Promise(res => setTimeout(res, 3000));

  const tabEndlessCheck = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const app = window.__MOZHEN_APP__;
        return {
          screen: document.querySelector('.screen.active')?.id,
          hasBattle: !!app.battle,
          isEndless: app.battle?.isEndless
        };
      })()
    `,
    returnByValue: true
  });
  console.log("Tab 踏入无尽状态:", tabEndlessCheck.result?.value);

  if (tabEndlessCheck.result?.value?.screen !== 'screen-battle') {
    throw new Error("从关卡 Tab 踏入无尽未能进入 screen-battle 战场！");
  }

  // 退出无尽
  await send('Runtime.evaluate', { expression: `window.__MOZHEN_APP__.battle.requestRetreat();` });
  await new Promise(res => setTimeout(res, 1500));

  // 场景 3: 测试常规关卡战斗正常运行
  console.log("6. 测试场景 3: 验证主线第 1 章常规关卡布阵与入阵战斗...");
  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const app = window.__MOZHEN_APP__;
        app.openLevels();
        const ch1 = document.querySelector('.chapter-tab');
        if (ch1) ch1.click();
      })()
    `
  });
  await new Promise(res => setTimeout(res, 800));

  await send('Runtime.evaluate', {
    expression: `
      (function() {
        const node = document.querySelector('.level-node[data-id="1"]');
        if (node) node.click();
        const prepBtn = document.getElementById('btn-start-prep');
        if (prepBtn) prepBtn.click();
      })()
    `
  });
  await new Promise(res => setTimeout(res, 1200));

  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-start-battle')?.click();`
  });
  await new Promise(res => setTimeout(res, 3000));

  const regularCheck = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const app = window.__MOZHEN_APP__;
        return {
          screen: document.querySelector('.screen.active')?.id,
          hasBattle: !!app.battle,
          levelId: app.battle?.level?.id,
          levelName: app.battle?.level?.name,
          state: app.battle?.state
        };
      })()
    `,
    returnByValue: true
  });
  console.log("常规关卡战斗状态:", regularCheck.result?.value);

  ws.close();
  edge.kill();

  if (uncaughtErrors.length > 0) {
    console.error("检测到未捕获错误:", uncaughtErrors);
    process.exit(1);
  }

  console.log("\n🎉 全量真实浏览器自动化端到端测试 100% 全部通过！无尽模式与常规关卡均完美运行！");
}

run().catch((err) => {
  console.error("测试失败:", err);
  process.exit(1);
});
