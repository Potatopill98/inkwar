import puppeteer from 'puppeteer';
import assert from 'assert';

async function run() {
  console.log('--- Starting v1.77 Verification Tests ---');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[FirstGuide]') || text.includes('Error') || text.includes('TUTORIAL')) {
      console.log('BROWSER LOG:', text);
    }
  });

  await page.goto('http://127.0.0.1:8087/index.html', { waitUntil: 'networkidle0' });

  // 1. Verify static tutorial data inside browser runtime
  const l1Data = await page.evaluate(async () => {
    const { TUTORIALS } = await import('./src/tutorial.js?v=1.77');
    const l1 = TUTORIALS.l1;
    const jsonStr = JSON.stringify(l1);
    const hasDaoDun = jsonStr.includes('刀盾');
    const s0 = l1.steps[0];
    const s1 = l1.steps[1];
    const s2 = l1.steps[2];
    const s3 = l1.steps[3];
    return {
      hasDaoDun,
      s0Title: s0.title,
      s0Text: s0.text,
      s1TargetWorld: s1.targetWorld,
      s1ZoneMinX: s1.zoneMinX,
      s1ZoneMaxX: s1.zoneMaxX,
      s3TargetWorld: s3.targetWorld,
      s3ZoneMinX: s3.zoneMinX,
      s3ZoneMaxX: s3.zoneMaxX,
    };
  });

  console.log('L1 Tutorial check:', l1Data);
  assert.strictEqual(l1Data.hasDaoDun, false, 'Level 1 tutorial must not mention 刀盾!');
  assert(l1Data.s0Text.includes('剑兵'), 'Step 0 text must mention 剑兵!');
  assert.deepStrictEqual(l1Data.s1TargetWorld, { x: -5, z: 0 }, 'Step 1 must have targetWorld (-5, 0)');
  assert.deepStrictEqual(l1Data.s3TargetWorld, { x: -10, z: 0 }, 'Step 3 must have targetWorld (-10, 0)');
  console.log('✓ Bug #1 & Bug #4 (Tutorial data) PASS');

  // 2. Check FirstGuide steps definition
  const fgData = await page.evaluate(async () => {
    const { FIRST_GUIDE_STEPS } = await import('./src/first-guide.js?v=1.77');
    return {
      totalSteps: FIRST_GUIDE_STEPS.length,
      step8: FIRST_GUIDE_STEPS[8],
      step9: FIRST_GUIDE_STEPS[9],
      step10: FIRST_GUIDE_STEPS[10],
    };
  });

  console.log('FirstGuide step 9 & 10 check:', {
    total: fgData.totalSteps,
    step9Title: fgData.step9.title,
    step9ShowNext: fgData.step9.showNextBtn,
    step10Title: fgData.step10.title,
    step10Target: fgData.step10.target,
  });

  assert.strictEqual(fgData.step9.showNextBtn, true, 'Step 9 must show Next button');
  assert.strictEqual(fgData.step10.target, '#btn-gacha', 'Step 10 must directly target #btn-gacha');
  console.log('✓ Bug #3 (FirstGuide step transition) PASS');

  // 3. Test Full FirstGuide flow up to Step 10 in live game
  await page.evaluate(() => {
    localStorage.clear();
    location.reload();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Wait for FirstGuide to show step 0
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  console.log('FirstGuide active at step 0');

  // Step 0: click 征战
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 400));

  // Step 1: click 第一关
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 400));

  // Step 2: click 出战
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 600));

  console.log('Battle launched, testing in-battle tutorial visuals...');

  // Wait for tutorial step 0 (select 剑兵)
  await page.waitForSelector('.tutorial-hand-pointer.show', { visible: true, timeout: 5000 });
  const handStyle = await page.evaluate(() => {
    const hand = document.querySelector('.tutorial-hand-pointer');
    const svg = hand.querySelector('svg');
    return {
      display: hand.style.display,
      svgWidth: svg.getAttribute('width'),
      filter: window.getComputedStyle(hand).filter,
    };
  });
  console.log('Tutorial hand style in battle:', handStyle);
  assert(handStyle.svgWidth === '54', 'SVG pointer must be upgraded to 54px');

  // Click card swordsman
  await page.click('.card[data-unit="swordsman"]');
  await new Promise((r) => setTimeout(r, 400));

  // Now tutorial step 1 (zone deploy)
  const zoneGuide = await page.evaluate(() => {
    const app = window.app;
    const hud = app.battle.hud;
    const scene = app.battle.scene;
    const markerVisible = scene.tutorialMarkerGroup && scene.tutorialMarkerGroup.visible;
    const markerPos = scene.tutorialMarkerGroup ? scene.tutorialMarkerGroup.position : null;
    const zoneText = hud.zoneHint.querySelector('.zone-hint-text')?.textContent;
    return {
      markerVisible,
      markerPos: markerPos ? { x: markerPos.x, z: markerPos.z } : null,
      zoneText,
    };
  });
  console.log('Step 1 Zone Guide in battle:', zoneGuide);
  assert.strictEqual(zoneGuide.markerVisible, true, '3D Tutorial target marker must be visible on ground!');
  assert.deepStrictEqual(zoneGuide.markerPos, { x: -5, z: 0 }, '3D marker position must be (-5, 0)');
  assert(zoneGuide.zoneText.includes('剑兵'), 'Zone text must say 剑兵!');

  // Now deploy swordsman at (-5.0, 0)
  const deployResult = await page.evaluate(() => {
    const battle = window.app.battle;
    return battle.deployUnit('swordsman', -5.0, 0.0);
  });
  console.log('Deploy swordsman at (-5, 0) result:', deployResult);
  assert.strictEqual(deployResult, true, 'Deployment at (-5, 0) must succeed without being restricted!');

  // Fast forward battle victory
  await page.evaluate(() => {
    window.app.battle.enemyBaseHp = 0;
    window.app.battle.victory();
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Step 3: Return to levels
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 500));

  // Step 4: 巡视库府 -> Next
  console.log('At Step 4 (巡视库府)...');
  await page.waitForSelector('#first-guide .fg-next-btn', { visible: true });
  await page.click('#first-guide .fg-next-btn');
  await new Promise((r) => setTimeout(r, 400));

  // Step 5: 巩固大营 -> Click
  console.log('At Step 5 (巩固大营)...');
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 400));

  // Step 6: 升级大本营 -> Click
  console.log('At Step 6 (升级大本营)...');
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 400));

  // Step 7: 返回大厅 -> Click
  console.log('At Step 7 (大营巩固返回)...');
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 400));

  // Step 8: 山河悬赏 -> Click
  console.log('At Step 8 (山河悬赏)...');
  await page.waitForSelector('#first-guide .fg-spot', { visible: true });
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 400));

  // Step 9: 悬赏要略 -> Click 下一步
  console.log('At Step 9 (悬赏要略)...');
  await page.waitForSelector('#first-guide .fg-next-btn', { visible: true });
  await page.click('#first-guide .fg-next-btn');
  await new Promise((r) => setTimeout(r, 500));

  // Step 10: MUST BE AT 祈将台 (#btn-gacha), NOT STUCK!
  console.log('Testing Step 10 transition (祈将求贤)...');
  const step10State = await page.evaluate(() => {
    const fg = window.app.firstGuide;
    const tipTitle = fg.tip?.querySelector('.fg-title')?.textContent;
    const tipCount = fg.tip?.querySelector('.fg-count')?.textContent;
    const spotVisible = fg.spot?.style.display !== 'none';
    const activeTarget = fg.activeTarget ? fg.activeTarget.id : null;
    const bountyModalDisplay = document.getElementById('bounty-modal')?.style.display;
    return {
      tipTitle,
      tipCount,
      spotVisible,
      activeTarget,
      bountyModalDisplay,
    };
  });
  console.log('Step 10 State:', step10State);

  assert.strictEqual(step10State.bountyModalDisplay, 'none', 'Bounty modal must be closed!');
  assert(step10State.tipTitle.includes('祈将'), 'Step 10 must be 祈将求贤!');
  assert.strictEqual(step10State.activeTarget, 'btn-gacha', 'Active target must be #btn-gacha!');
  assert.strictEqual(step10State.spotVisible, true, 'Spot must be visible highlighting #btn-gacha!');

  // Click #btn-gacha via spot
  await page.click('#first-guide .fg-spot');
  await new Promise((r) => setTimeout(r, 500));

  const gachaScreenVisible = await page.evaluate(() => {
    return document.getElementById('screen-gacha')?.classList.contains('active');
  });
  console.log('Gacha screen opened:', gachaScreenVisible);
  assert.strictEqual(gachaScreenVisible, true, 'Clicking #btn-gacha must open Gacha screen without error!');

  console.log('=============================================');
  console.log(' ALL 4 ISSUES VERIFIED FIXED AND WORKING 100%!');
  console.log('=============================================');

  await browser.close();
}

run().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
