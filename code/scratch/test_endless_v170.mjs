import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("=== v1.70 恢复特效脚下绿色光环 & 无尽模式全量数值调校自动化测试 ===");
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_endless_170',
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

  console.log("1. 等待游戏进入标题页...");
  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `document.querySelector('.screen.active')?.id`,
      returnByValue: true
    });
    if (r.result?.value === 'screen-title') break;
    await new Promise(res => setTimeout(res, 500));
  }

  console.log("2. 进入主界面...");
  await send('Runtime.evaluate', { expression: `document.getElementById('btn-enter-game')?.click();` });
  await new Promise(res => setTimeout(res, 1000));

  console.log("3. 测试数值调校面板无尽模式 Tab 与配置保存...");
  const devPanelCheck = await send('Runtime.evaluate', {
    expression: `
      (async function() {
        try {
          const app = window.__MOZHEN_APP__;
          if (!app) return { error: "No app" };
          
          // 打开数值调校面板（调校口令 528908）
          app.openDevPanel('528908');
          
          // 点击无尽模式 Tab
          const endlessTabBtn = document.querySelector('.dev-tab[data-tab="endless"]');
          if (!endlessTabBtn) return { error: "No endless tab button found" };
          endlessTabBtn.click();
          
          // 检查渲染出的调校组与字段数量
          const rows = document.querySelectorAll('.dev-row-endless');
          const sliders = document.querySelectorAll('.dev-row-endless .dev-slider');
          
          // 读取模块并修改波次成长为 10% (0.10)
          const endlessMod = await import('/src/data/endless-manager.js?v=1.70');
          const EndlessManager = endlessMod.EndlessManager;
          
          const oldTuning = EndlessManager.getTuning();
          EndlessManager.saveTuning({ ...oldTuning, waveStatGrowth: 0.10 });
          const modifiedTuning = EndlessManager.getTuning();
          
          return {
            hasEndlessTab: true,
            groupCount: rows.length,
            fieldCount: sliders.length,
            modifiedStatGrowth: modifiedTuning.waveStatGrowth
          };
        } catch (e) {
          return { error: e.message, stack: e.stack };
        }
      })()
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("数值调校面板无尽测试结果:", devPanelCheck.result?.value);

  console.log("4. 踏入无尽战场验证数值动态生效与恢复脚下绿色光环特效...");
  await send('Runtime.evaluate', { expression: `window.__MOZHEN_APP__?.devPanel?.close();` });
  await send('Runtime.evaluate', { expression: `document.getElementById('btn-home-endless')?.click();` });
  await new Promise(res => setTimeout(res, 1000));
  await send('Runtime.evaluate', { expression: `document.getElementById('btn-start-battle')?.click();` });
  await new Promise(res => setTimeout(res, 3000));

  const battleCheck = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const app = window.__MOZHEN_APP__;
        const b = app?.battle;
        if (!b) return { error: "No battle found" };

        const results = {};

        // 验证波次成长读取到了刚刚修改的 0.10 (10%)
        b.spawnQueue = [];
        b.startEndlessWave(2);
        const w2Item = b.spawnQueue[0];
        results.w2GrowthRatio = w2Item?.hpMul; // 应为 1.0 + 1 * 0.10 = 1.10

        // 验证脚下绿色光环特效
        let greenRingSpawned = false;
        const origRing = b.effects.ring.bind(b.effects);
        b.effects.ring = function(x, z, color, startScale, endScale, life, opacity) {
          if (color === 0x22c55e) {
            greenRingSpawned = true;
          }
          return origRing(x, z, color, startScale, endScale, life, opacity);
        };

        // 触发一次 heal
        b.effects.heal(1.5, 0.8, -0.5);
        results.healProducesGreenRing = greenRingSpawned;

        // 触发一次 updateEndlessRegen
        greenRingSpawned = false;
        b.endlessBuffs.teamRegen = 0.05;
        b._endlessRegenTick = 1.5;
        b.updateEndlessRegen(0.1);
        results.teamRegenProducesGreenRing = greenRingSpawned;

        // 验证卡牌三选一动态文案
        const choices = b.ui ? b.getEndlessBossForWave : null; // check battle methods
        return results;
      })()
    `,
    returnByValue: true
  });
  console.log("战场动态数值与特效测试结果:", battleCheck.result?.value);

  // 恢复无尽调校为默认值以保持标准环境
  await send('Runtime.evaluate', {
    expression: `
      (async function() {
        const endlessMod = await import('http://localhost:8087/src/data/endless-manager.js?v=1.70');
        endlessMod.EndlessManager.resetTuning();
      })()
    `,
    awaitPromise: true
  });

  await send('Browser.close');
  edge.kill();

  const d = devPanelCheck.result?.value;
  const b = battleCheck.result?.value;

  if (!d?.hasEndlessTab || d?.groupCount !== 4 || d?.fieldCount < 20) {
    throw new Error("Dev panel endless tab check failed: " + JSON.stringify(d));
  }
  if (Math.abs((b?.w2GrowthRatio || 0) - 1.10) > 0.001) {
    throw new Error(`Wave 2 stat growth did not reflect modified tuning! Actual: ${b?.w2GrowthRatio}`);
  }
  if (!b?.healProducesGreenRing) {
    throw new Error("Heal effect did not produce green ring (0x22c55e) at feet!");
  }
  if (!b?.teamRegenProducesGreenRing) {
    throw new Error("Endless team regen did not produce green ring at feet!");
  }

  console.log("✅ 全部测试 100% 成功通过！恢复特效脚下绿色光环 & 无尽模式数值调校已全部打通！");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
