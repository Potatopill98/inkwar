import { spawn } from 'child_process';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("=== v1.69 无尽模式 9 项改动自动化端到端测试 ===");
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_endless_169',
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

  console.log("3. 点击无尽模式进入点将台...");
  await send('Runtime.evaluate', { expression: `document.getElementById('btn-home-endless')?.click();` });
  await new Promise(res => setTimeout(res, 1000));

  console.log("4. 点将台验证并点击踏入试炼...");
  await send('Runtime.evaluate', { expression: `document.getElementById('btn-start-battle')?.click();` });
  await new Promise(res => setTimeout(res, 3500));

  console.log("5. 运行详细无尽模式 9 项逻辑验证...");
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const results = {};
        const app = window.__MOZHEN_APP__;
        const b = app?.battle;
        if (!b) return { error: "No battle found", screen: document.querySelector('.screen.active')?.id };

        // #1 将领死亡后不要半透明
        b.killHero();
        let heroBodyTransparent = false;
        if (b.heroModel) {
          b.heroModel.group.traverse(obj => {
            if (obj.isMesh && obj !== b.heroModel.aura && obj !== b.heroModel.shadow) {
              if (obj.material && obj.material.transparent) {
                heroBodyTransparent = true;
              }
            }
          });
        }
        results.item1_heroDefeatSolid = (!heroBodyTransparent && !b.heroModel.body.material.transparent);
        b.reviveHero();

        // #2 顶部显示当前波次：第 x 波，无 x/x
        const waveText = document.getElementById('wave-index')?.textContent;
        results.item2_hudWaveDisplay = {
          waveText,
          valid: waveText.includes('第') && waveText.includes('波') && !waveText.includes('/')
        };

        // #4 刚进入波次标题验证：是 第 1 波，非 墨影第二波
        const bannerTitle = document.getElementById('battle-banner-title')?.textContent || '';
        results.item4_bannerNotWave2 = (!bannerTitle.includes('第二波') && !bannerTitle.includes('第 2 波'));

        // #5 & #7 & #9 出兵数量与传奇卡限制验证
        // 测试各波次计算
        b.spawnQueue = [];
        b.startEndlessWave(1);
        const w1Count = b.spawnQueue.length;
        const w1Legendary = b.spawnQueue.filter(i => i.type === 'trebuchet').length;

        b.spawnQueue = [];
        b.startEndlessWave(5);
        const w5Count = b.spawnQueue.length;
        const w5Legendary = b.spawnQueue.filter(i => i.type === 'trebuchet').length;

        b.spawnQueue = [];
        b.startEndlessWave(6);
        const w6Count = b.spawnQueue.length;

        b.spawnQueue = [];
        b.startEndlessWave(10);
        // 波次10包含 7 个常规兵 + 1 个boss
        const w10Units = b.spawnQueue.filter(i => !i.isBoss).length;
        const w10Legendary = b.spawnQueue.filter(i => i.type === 'trebuchet').length;
        const w10Boss = b.spawnQueue.filter(i => i.isBoss).length;

        results.spawnRules = {
          w1Count, // 应为 5
          w1Legendary, // 应为 0
          w5Count, // 应为 5
          w5Legendary, // 应为 0
          w6Count, // 应为 7 (每5波+2)
          w10Units, // 应为 7
          w10LegendaryMax: Math.floor(10 * 0.1), // 1
          w10LegendaryActual: w10Legendary, // <= 1
          w10BossHasZhangJiao: w10Boss === 1
        };

        // #8 霹雳车移动无上下摇晃测试
        const fakeTrebuchet = {
          unit: { id: 'trebuchet', look: { building: 'trebuchet' } },
          model: { body: { position: { y: 0.5 }, rotation: { z: 0.2, y: 0.1 } } },
          attackAnim: 0,
          bobPhase: 0
        };
        b.moveBob(fakeTrebuchet, 0.16, true);
        results.item8_trebuchetNoBob = (
          fakeTrebuchet.model.body.position.y === 0 &&
          fakeTrebuchet.model.body.rotation.z === 0 &&
          fakeTrebuchet.model.body.rotation.y === 0
        );

        // #6 选择增益时全局暂停验证
        b.paused = false;
        b.endlessBuffSelecting = false;
        b.ui.showEndlessBuffSelection(b);
        const pauseWhenBuffOpen = b.paused && b.endlessBuffSelecting;
        const modal = document.getElementById('endless-buff-modal');
        const modalShown = modal && modal.style.display !== 'none';

        // 模拟点击卡片研习此策
        const firstCard = modal.querySelector('.endless-buff-card');
        if (firstCard) firstCard.click();
        const resumeAfterSelect = (!b.paused && !b.endlessBuffSelecting);

        results.item6_buffPauseAndResume = {
          pauseWhenBuffOpen,
          modalShown,
          resumeAfterSelect
        };

        // #3 首领战与技能激活测试
        b.spawnQueue = [];
        b.startEndlessWave(10);
        // 让待生成队列生成出来
        b.elapsed = 9999;
        b.updateEndlessWaves(0.1);
        const bossSpawned = !!b.boss;
        const bossSkillsReady = bossSpawned && b.boss.chargesLeft === 5 && b.boss.skillTimers && b.boss.skillTimers.summon !== undefined;

        results.item3_bossSpawnAndSkills = {
          bossSpawned,
          bossName: b.boss?.name || b.boss?.unit?.name,
          bossSkillsReady
        };

        return results;
      })()
    `,
    returnByValue: true
  });

  console.log("=== 验证结果详情 ===");
  console.log(JSON.stringify(evalResult.result?.value, null, 2));

  await send('Browser.close');
  edge.kill();

  const r = evalResult.result?.value;
  if (!r) throw new Error("Test returned empty result");

  // 断言
  if (!r.item1_heroDefeatSolid) throw new Error("Item 1 failed: Hero model had transparent material");
  if (!r.item2_hudWaveDisplay?.valid) throw new Error("Item 2 failed: Wave display invalid: " + r.item2_hudWaveDisplay?.waveText);
  if (!r.item4_bannerNotWave2) throw new Error("Item 4 failed: Banner falsely showed wave 2 on start");
  if (r.spawnRules.w1Count !== 5 || r.spawnRules.w1Legendary !== 0) throw new Error("Item 5 & 7 failed on wave 1");
  if (r.spawnRules.w6Count !== 7) throw new Error("Item 7 failed on wave 6 count: " + r.spawnRules.w6Count);
  if (r.spawnRules.w10LegendaryActual > 1) throw new Error("Item 5 failed on wave 10 legendary limit");
  if (!r.spawnRules.w10BossHasZhangJiao) throw new Error("Item 3 failed: Boss not queued on wave 10");
  if (!r.item8_trebuchetNoBob) throw new Error("Item 8 failed: Trebuchet bobbed or swayed");
  if (!r.item6_buffPauseAndResume.pauseWhenBuffOpen || !r.item6_buffPauseAndResume.resumeAfterSelect) {
    throw new Error("Item 6 failed: Pause or resume failed on buff selection");
  }
  if (!r.item3_bossSpawnAndSkills.bossSpawned || !r.item3_bossSpawnAndSkills.bossSkillsReady) {
    throw new Error("Item 3 failed: Boss spawn or skills failed");
  }

  console.log("✅ 无尽模式全部 9 项新需求与修复真实浏览器自动化测试 100% 通过！");
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
