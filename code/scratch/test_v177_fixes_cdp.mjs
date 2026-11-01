import { spawn } from 'child_process';
import assert from 'assert';

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("=== 启动无头 Edge 测试 v1.77 修复项 ===");
  const profileDir = `C:\\Users\\45803\\AppData\\Local\\Temp\\edge_debug_profile_v177_${Date.now()}`;
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${profileDir}`,
    'http://127.0.0.1:8087/index.html'
  ]);

  await new Promise(r => setTimeout(r, 2200));
  const res = await fetch('http://127.0.0.1:9224/json/list');
  const tabs = await res.json();
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('8087'));
  if (!pageTab) {
    throw new Error('Could not find 8087 page tab!');
  }
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
    if (data.method === 'Runtime.exceptionThrown') {
      console.log(`[BROWSER EXCEPTION]:`, JSON.stringify(data.params.exceptionDetails));
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
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // 1. 检查 TUTORIALS.l1 中刀盾兵是否已彻底更正为剑兵，且 targetWorld 存在
  const resTut = await send('Runtime.evaluate', {
    expression: `(async () => {
      const { TUTORIALS } = await import('./src/tutorial.js?v=1.77');
      const l1 = TUTORIALS.l1;
      const str = JSON.stringify(l1);
      return {
        hasDaoDun: str.includes('刀盾'),
        s0Title: l1.steps[0].title,
        s0Text: l1.steps[0].text,
        s1TargetWorld: l1.steps[1].targetWorld,
        s1ZoneMinX: l1.steps[1].zoneMinX,
        s1ZoneMaxX: l1.steps[1].zoneMaxX,
        s3TargetWorld: l1.steps[3].targetWorld,
        s3ZoneMinX: l1.steps[3].zoneMinX,
        s3ZoneMaxX: l1.steps[3].zoneMaxX,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  console.log("【测试项 1】第一关教程数据:", resTut.result?.value);
  const v1 = resTut.result?.value;
  assert.strictEqual(v1.hasDaoDun, false, 'Level 1 教程不得含有“刀盾”字样！');
  assert(v1.s0Text.includes('剑兵'), 'Step 0 必须为剑兵！');
  assert.deepStrictEqual(v1.s1TargetWorld, { x: -5, z: 0 });
  assert.deepStrictEqual(v1.s3TargetWorld, { x: -10, z: 0 });
  console.log("✓ 【问题 1 & 问题 4】教程数据验证通过！");

  // 2. 检查 FirstGuide 步骤定义（移除容易死锁的步骤，悬赏下一步直连祈将台）
  const resFg = await send('Runtime.evaluate', {
    expression: `(async () => {
      const { FIRST_GUIDE_STEPS } = await import('./src/first-guide.js?v=1.77');
      return {
        totalSteps: FIRST_GUIDE_STEPS.length,
        s8Title: FIRST_GUIDE_STEPS[8]?.title,
        s9Title: FIRST_GUIDE_STEPS[9]?.title,
        s9ShowNext: FIRST_GUIDE_STEPS[9]?.showNextBtn,
        s10Title: FIRST_GUIDE_STEPS[10]?.title,
        s10Target: FIRST_GUIDE_STEPS[10]?.target,
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  const v2 = resFg.result?.value;
  console.log("【测试项 2】新手引导 FirstGuide 步骤结构:", v2);
  assert.strictEqual(v2.s9ShowNext, true);
  assert(v2.s10Title.includes('祈将'));
  assert.strictEqual(v2.s10Target, '#btn-gacha');
  console.log("✓ 【问题 3】FirstGuide 步骤链已优化，悬赏关闭后直连祈将台！");

  // 3. 实机验证战斗引导与高亮指针
  // 辅助函数：触发 pointerdown 点击
  const clickSpot = async () => {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const spot = document.querySelector('#first-guide .fg-spot');
        if (spot) {
          spot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        }
      })()`
    });
  };

  const clickNext = async () => {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('#first-guide .fg-next-btn');
        if (btn) {
          btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        }
      })()`
    });
  };

  console.log("3. 模拟点击进入第 1 关战斗...");
  const getState = async () => {
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const app = (window.app || window.__MOZHEN_APP__);
        const fg = app ? app.firstGuide : null;
        return {
          screen: document.querySelector('.screen.active')?.id,
          step: fg?.step,
          target: fg?.activeTarget?.id || fg?.activeTarget?.className,
          spotVis: fg?.spot?.style.display !== 'none',
        };
      })()`,
      returnByValue: true,
    });
    return r.result?.value;
  };

  console.log('Step 0 State:', await getState());
  await clickSpot();
  await new Promise(r => setTimeout(r, 600));
  console.log('After Step 0 Click State:', await getState());

  // Step 1: click 第一关
  await clickSpot();
  await new Promise(r => setTimeout(r, 800));
  console.log('After Step 1 Click State:', await getState());

  // Step 2: click 出战
  await clickSpot();
  await new Promise(r => setTimeout(r, 800));
  console.log('After Step 2 Click State:', await getState());
  
  // 等待战斗场景初始化完成
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    const check = await send('Runtime.evaluate', {
      expression: `!!((window.app || window.__MOZHEN_APP__) && (window.app || window.__MOZHEN_APP__).battle && (window.app || window.__MOZHEN_APP__).battle.hud)`,
      returnByValue: true,
    });
    if (check.result?.value) break;
  }
  await new Promise(r => setTimeout(r, 800));

  // 战斗内检查
  const resBattle = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = (window.app || window.__MOZHEN_APP__);
      const b = app ? app.battle : null;
      if (!b) return { error: 'No battle', hasApp: !!app, battleKey: app ? Object.keys(app) : [] };
      const hud = b.hud;
      const scene = b.scene;
      return {
        inBattle: true,
        handDisplay: hud.tutorialHand?.style.display,
        handHtml: hud.tutorialHand?.innerHTML.includes('width="54"'),
        zoneHintDisplay: hud.zoneHint?.style.display,
      };
    })()`,
    returnByValue: true,
  });
  const vBattle = resBattle.result?.value;
  console.log("【测试项 3】战斗内 HUD 与发光指针:", vBattle);
  assert.strictEqual(vBattle.handHtml, true, '发光箭头已升级为高亮黄金/绯红材质！');

  // 点选剑兵卡牌
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.card[data-unit="swordsman"]')?.click()`
  });
  await new Promise(r => setTimeout(r, 500));

  // 验证出兵指引与 3D 目标点
  const resDeployGuidance = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = (window.app || window.__MOZHEN_APP__);
      const b = app.battle;
      const scene = b.scene;
      const hud = b.hud;
      const markerVisible = scene.tutorialMarkerGroup && scene.tutorialMarkerGroup.visible;
      const markerPos = scene.tutorialMarkerGroup?.position;
      const zoneText = hud.zoneHint?.querySelector('.zone-hint-text')?.textContent;
      return {
        markerVisible,
        markerPos: markerPos ? { x: markerPos.x, z: markerPos.z } : null,
        zoneText,
      };
    })()`,
    returnByValue: true,
  });
  const vGuidance = resDeployGuidance.result?.value;
  console.log("【测试项 4】剑兵指定阵位 3D 高亮光柱:", vGuidance);
  assert.strictEqual(resDeployDeployMarkerOk(vGuidance), true);

  // 尝试在 (-5, 0) 出兵
  const resDeployExec = await send('Runtime.evaluate', {
    expression: `(() => {
      const b = (window.app || window.__MOZHEN_APP__).battle;
      return b.deployUnit('swordsman', -5.0, 0.0);
    })()`,
    returnByValue: true,
  });
  const vExec = resDeployExec.result?.value;
  console.log("【测试项 5】高亮处 (-5, 0) 出兵判定结果:", vExec);
  assert.strictEqual(vExec, true, '指定阵位部署必须成功！');

  // 秒杀敌基地完成第一关
  await send('Runtime.evaluate', {
    expression: `(() => {
      const b = (window.app || window.__MOZHEN_APP__).battle;
      b.enemyBaseHp = 0;
      b.victory();
    })()`
  });
  await new Promise(r => setTimeout(r, 1200));

  // Step 3: 返回
  await clickSpot();
  await new Promise(r => setTimeout(r, 500));

  // Step 4: 巡视库府下一步
  await clickNext();
  await new Promise(r => setTimeout(r, 500));

  // Step 5: 巩固大营
  await clickSpot();
  await new Promise(r => setTimeout(r, 500));

  // Step 6: 升级大本营
  await clickSpot();
  await new Promise(r => setTimeout(r, 500));

  // Step 7: 返回大厅
  await clickSpot();
  await new Promise(r => setTimeout(r, 500));

  // Step 8: 打开悬赏
  await clickSpot();
  await new Promise(r => setTimeout(r, 600));

  // Step 9: 悬赏要略，点击下一步！
  console.log("4. 测试悬赏要略点击下一步...");
  await clickNext();
  await new Promise(r => setTimeout(r, 600));

  // 验证第十步（祈将台）是否流畅高亮，绝无卡死
  const resStep10 = await send('Runtime.evaluate', {
    expression: `(() => {
      const fg = (window.app || window.__MOZHEN_APP__).firstGuide;
      return {
        curStep: fg.step,
        tipTitle: fg.tip?.querySelector('.fg-title')?.textContent,
        spotVisible: fg.spot?.style.display !== 'none',
        targetId: fg.activeTarget?.id,
        bountyDisplay: document.getElementById('bounty-modal')?.style.display,
      };
    })()`,
    returnByValue: true,
  });

  const vStep10 = resStep10.result?.value;
  console.log("【测试项 6】第十一步 (祈将求贤) 状态:", vStep10);
  assert.strictEqual(vStep10.bountyDisplay, 'none', '悬赏弹窗已正确关闭！');
  assert.strictEqual(vStep10.targetId, 'btn-gacha', '聚光灯正确对准祈将台 #btn-gacha！');
  assert.strictEqual(vStep10.spotVisible, true, '高亮光斑处于显示状态！');

  console.log("==============================================");
  console.log("  ALL 4 ISSUES FIXED & VERIFIED PASS 100%!   ");
  console.log("==============================================");

  edge.kill();
  process.exit(0);
}

function resDeployDeployMarkerOk(val) {
  return val.markerVisible === true && val.markerPos && val.markerPos.x === -5 && val.zoneText.includes('剑兵');
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
