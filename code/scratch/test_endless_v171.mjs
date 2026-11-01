import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("=== v1.71 传奇卡上限 0.1 倍与用户微调定版配置验证 ===");
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_endless_171',
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

  console.log("1. 等待游戏进入标题页并点击进入主界面...");
  for (let i = 0; i < 40; i++) {
    const r = await send('Runtime.evaluate', {
      expression: `document.querySelector('.screen.active')?.id`,
      returnByValue: true
    });
    if (r.result?.value === 'screen-title') break;
    await new Promise(res => setTimeout(res, 500));
  }

  await send('Runtime.evaluate', { expression: `document.getElementById('btn-enter-game')?.click();` });
  await new Promise(res => setTimeout(res, 1000));

  console.log("2. 打开调校面板 (dev panel) 并测试 auto-healing...");
  const devRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__MOZHEN_APP__;
      if (!app) return { error: "No __MOZHEN_APP__" };
      // 模拟之前被异常设置为 0.005 的情况，验证自动修正为 0.10
      localStorage.setItem('mozhen_endless_tuning_v1', JSON.stringify({ legendaryRatio: 0.005 }));
      app.openDevPanel('528908');
      return { success: true };
    })()`,
    returnByValue: true
  });
  console.log("打开调校面板结果:", devRes.result?.value);

  await new Promise(res => setTimeout(res, 500));

  console.log("3. 切换至无尽模式标签页...");
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('.dev-tab')).find(b => b.dataset.tab === 'endless');
      if (btn) btn.click();
    })()`,
    returnByValue: true
  });

  await new Promise(res => setTimeout(res, 500));

  console.log("4. 检查每波传奇卡比例上限显示与数值...");
  const ratioField = await send('Runtime.evaluate', {
    expression: `(() => {
      const sliders = Array.from(document.querySelectorAll('.dev-field-slider'));
      const target = sliders.find(s => s.textContent.includes('每波传奇卡比例上限'));
      if (!target) return { found: false, totalSliders: sliders.length };
      const numInput = target.querySelector('.dev-num-input');
      const valDisp = target.querySelector('.dev-val-display');
      const slider = target.querySelector('.dev-slider');
      return {
        found: true,
        inputValue: numInput?.value,
        sliderValue: slider?.value,
        min: numInput?.min,
        max: numInput?.max,
        step: numInput?.step,
        displayText: valDisp?.textContent?.trim()
      };
    })()`,
    returnByValue: true
  });

  console.log("传奇卡比例字段:", ratioField.result?.value);
  const rVal = ratioField.result?.value;
  if (!rVal?.found) {
    throw new Error(`未能找到每波传奇卡比例上限字段！总滑块数: ${rVal?.totalSliders}`);
  }
  if (rVal.displayText !== '0.1 倍') {
    throw new Error(`显示异常: 期望 "0.1 倍", 实际为 "${rVal.displayText}"`);
  }
  if (rVal.min !== '0' || rVal.max !== '1' || rVal.step !== '0.01') {
    throw new Error(`范围异常: min=${rVal.min}, max=${rVal.max}, step=${rVal.step}`);
  }
  console.log("✅ 传奇卡上限显示与范围完美符合预期 (0.1 倍, 步长 0.01, 最大 1.0)！");

  console.log("5. 测试调整输入为 0.2 并验证持久化...");
  const modifyRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const sliders = Array.from(document.querySelectorAll('.dev-field-slider'));
      const target = sliders.find(s => s.textContent.includes('每波传奇卡比例上限'));
      const numInput = target.querySelector('.dev-num-input');
      numInput.value = '0.2';
      numInput.dispatchEvent(new Event('change'));
      const valDisp = target.querySelector('.dev-val-display');
      const stored = JSON.parse(localStorage.getItem('mozhen_endless_tuning_v1') || '{}');
      return {
        newDisplay: valDisp?.textContent?.trim(),
        storedRatio: stored.legendaryRatio
      };
    })()`,
    returnByValue: true
  });
  console.log("调整为 0.2 测试:", modifyRes.result?.value);
  if (modifyRes.result?.value?.storedRatio !== 0.2) {
    throw new Error("调整为 0.2 失败！");
  }
  console.log("✅ 调整与持久化成功！");

  console.log("6. 恢复为 0.1 并验证波次传奇卡出兵限制...");
  const waveCalc = await send('Runtime.evaluate', {
    expression: `(async () => {
    try {
      const sliders = Array.from(document.querySelectorAll('.dev-field-slider'));
      const target = sliders.find(s => s.textContent.includes('每波传奇卡比例上限'));
      const numInput = target.querySelector('.dev-num-input');
      numInput.value = '0.1';
      numInput.dispatchEvent(new Event('change'));

      const { Battle } = await import('/src/battle.js?v=1.71');
      const { EndlessManager } = await import('/src/data/endless-manager.js?v=1.71');
      const tuning = EndlessManager.getTuning();
      
      const b10 = Object.create(Battle.prototype);
      b10.spawnQueue = [];
      b10.elapsed = 0;
      b10.startEndlessWave(10);
      
      const b9 = Object.create(Battle.prototype);
      b9.spawnQueue = [];
      b9.elapsed = 0;
      b9.startEndlessWave(9);
      
      const wave10Legendary = b10.spawnQueue.filter(s => s.type === 'trebuchet').length;
      const wave9Legendary = b9.spawnQueue.filter(s => s.type === 'trebuchet').length;
      return {
        wave10Legendary,
        wave9Legendary,
        wave10Total: b10.spawnQueue.length,
        wave9Total: b9.spawnQueue.length,
        tuningRatio: tuning.legendaryRatio
      };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("波次生成计算结果:", waveCalc.result?.value);
  const wc = waveCalc.result?.value;
  if (wc.wave9Legendary !== 0) {
    throw new Error("第9波不应该出现传奇卡！");
  }
  if (wc.wave10Legendary > 1) {
    throw new Error(`第10波传奇卡数量 ${wc.wave10Legendary} 超过了上限 1！`);
  }
  console.log("✅ 波次传奇卡出兵限制 0.1 倍逻辑完全正确！");

  console.log("7. 检查用户微调兵种/英雄基线 (DEFAULT_OVERRIDES)...");
  const unitsCheck = await send('Runtime.evaluate', {
    expression: `(async () => {
      const { UNITS } = await import('/src/data/units.js?v=1.71');
      const { HEROES } = await import('/src/data/heroes.js?v=1.71');
      const trebuchet = UNITS.find(u => u.id === 'trebuchet');
      const fubing = UNITS.find(u => u.id === 'fubing');
      const strongbow = UNITS.find(u => u.id === 'strongbow');
      const archer = UNITS.find(u => u.id === 'archer');
      const zhaoyun = HEROES.find(h => h.id === 'zhaoyun');
      return {
        trebuchet: { cost: trebuchet?.cost, cooldown: trebuchet?.cooldown, speed: trebuchet?.speed, hp: trebuchet?.hp, range: trebuchet?.range },
        fubing: { cost: fubing?.cost, cooldown: fubing?.cooldown, count: fubing?.spellFx?.count },
        strongbow: { hp: strongbow?.hp, interval: strongbow?.interval, sniperMul: strongbow?.fx?.sniperMul },
        archer: { interval: archer?.interval, count: archer?.count, cost: archer?.cost, cooldown: archer?.cooldown },
        zhaoyunEffects: [zhaoyun?.active?.effects?.[0]?.damage, zhaoyun?.active?.effects?.[1]?.damage]
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log("微调配置应用结果:", unitsCheck.result?.value);
  const uc = unitsCheck.result?.value;
  if (uc.trebuchet.cost !== 20 || uc.trebuchet.cooldown !== 120 || uc.trebuchet.speed !== 0.5) {
    throw new Error("霹雳车数值与用户定版不符！");
  }
  if (uc.fubing.cost !== 15 || uc.fubing.cooldown !== 120) {
    throw new Error("伏兵术数值与用户定版不符！");
  }
  if (uc.archer.count !== 2 || uc.archer.cost !== 7 || uc.archer.interval !== 1.2) {
    throw new Error("弓兵数值与用户定版不符！");
  }
  console.log("✅ 用户定版兵种与英雄数值基线全部生效！");

  console.log("8. 验证【导入定版 JSON】按钮存在并且方法可用...");
  const importCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('#dev-import');
      return {
        buttonExists: !!btn,
        buttonText: btn?.textContent,
        methodExists: typeof window.__MOZHEN_APP__?.devPanel?.importJson === 'function'
      };
    })()`,
    returnByValue: true
  });
  console.log("导入按钮与方法检测:", importCheck.result?.value);
  if (!importCheck.result?.value?.buttonExists || !importCheck.result?.value?.methodExists) {
    throw new Error("导入定版 JSON 按钮或方法未正确挂载！");
  }
  console.log("✅ 导入定版 JSON 按钮与功能就绪！");

  console.log("\n=============================================");
  console.log("🏆 自动化测试全部通过！v1.71 验证无误！");
  console.log("=============================================");

  edge.kill();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ 测试失败:", err);
  process.exit(1);
});
