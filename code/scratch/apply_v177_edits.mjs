import fs from 'fs';
import path from 'path';

const root = 'E:/taptapgame/inkwar/code';

// 1. Edit src/scene.js
{
  const scenePath = path.join(root, 'src/scene.js');
  let content = fs.readFileSync(scenePath, 'utf8');

  // Add buildTutorialMarker() in constructor
  if (!content.includes('this.buildTutorialMarker();')) {
    content = content.replace(
      'this.buildDeployZone();',
      'this.buildDeployZone();\n    this.buildTutorialMarker();'
    );
  }

  // Add buildTutorialMarker, setTutorialMarker, worldToScreen
  if (!content.includes('buildTutorialMarker() {')) {
    const markerMethods = `
  buildTutorialMarker() {
    const group = new THREE.Group();
    // 1. 地面动态发光光环
    const ringGeo = new THREE.RingGeometry(0.85, 1.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    group.add(ring);

    // 2. 内部金光圆盘
    const coreGeo = new THREE.CircleGeometry(0.8, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.046;
    group.add(core);

    // 3. 向上散发的金辉光柱
    const beamGeo = new THREE.CylinderGeometry(0.8, 1.25, 2.5, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.25;
    group.add(beam);

    group.visible = false;
    this.scene.add(group);
    this.tutorialMarkerGroup = group;
    this.tutorialMarkerRing = ring;
    this.tutorialMarkerCore = core;
    this.tutorialMarkerBeam = beam;
  }

  setTutorialMarker(active, x = 0, z = 0) {
    if (!this.tutorialMarkerGroup) return;
    this.tutorialMarkerGroup.visible = !!active;
    if (active) {
      this.tutorialMarkerGroup.position.set(x, 0, z);
    }
  }

  worldToScreen(x, y = 0, z = 0) {
    if (!this.camera || !this.canvas) return null;
    const v = new THREE.Vector3(x, y, z);
    v.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    const sx = ((v.x + 1) / 2) * rect.width + rect.left;
    const sy = ((-v.y + 1) / 2) * rect.height + rect.top;
    return { x: sx, y: sy };
  }
`;
    content = content.replace('showDeploy(show, forBuilding = false, forSpell = false) {', markerMethods + '\n  showDeploy(show, forBuilding = false, forSpell = false) {');
  }

  // Animate tutorialMarkerGroup in update(dt)
  if (!content.includes('this.tutorialMarkerGroup.visible')) {
    const animCode = `
    if (this.tutorialMarkerGroup && this.tutorialMarkerGroup.visible) {
      const pulse = Math.sin(this.clockTime * 5.5);
      const s = 1.0 + pulse * 0.12;
      this.tutorialMarkerRing.scale.set(s, s, 1);
      this.tutorialMarkerCore.scale.set(s * 0.95, s * 0.95, 1);
      this.tutorialMarkerRing.rotation.z += dt * 1.5;
      this.tutorialMarkerBeam.material.opacity = 0.25 + pulse * 0.15;
    }
`;
    content = content.replace('// 军阵位呼吸', animCode + '    // 军阵位呼吸');
  }

  fs.writeFileSync(scenePath, content, 'utf8');
  console.log('src/scene.js updated.');
}

// 2. Edit src/ui/battle-hud.js
{
  const hudPath = path.join(root, 'src/ui/battle-hud.js');
  let content = fs.readFileSync(hudPath, 'utf8');

  // Upgrade tutorialHand SVG to bright gold & crimson
  const oldSvg = `<svg viewBox="0 0 48 48" width="48" height="48" fill="none">
          <path d="M24 6 L24 30 M16 22 L24 30 L32 22" stroke="#c9a25e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="38" r="4.5" fill="#c9a25e"/>
        </svg>`;
  const newSvg = `<svg viewBox="0 0 48 48" width="54" height="54" fill="none">
          <path d="M24 4 L24 32 M14 22 L24 32 L34 22" stroke="#fef08a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M24 4 L24 32 M14 22 L24 32 L34 22" stroke="#ea580c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="40" r="5" fill="#fef08a" stroke="#b91c1c" stroke-width="2"/>
        </svg>`;
  if (content.includes(oldSvg)) {
    content = content.replace(oldSvg, newSvg);
  }

  // Update showGuide to store currentGuideOpt and trigger 3D marker
  if (!content.includes('this.currentGuideOpt =')) {
    content = content.replace(
      'this.updateTutorialHand(targetEl, kind);',
      `this.currentGuideOpt = (opt && typeof opt === 'object') ? opt : { text, title, subText, kind };
    if (this.currentGuideOpt && this.currentGuideOpt.targetWorld && this.battle && this.battle.scene && this.battle.scene.setTutorialMarker) {
      this.battle.scene.setTutorialMarker(true, this.currentGuideOpt.targetWorld.x, this.currentGuideOpt.targetWorld.z);
    }
    this.updateTutorialHand(targetEl, kind);`
    );
  }

  // Update updateTutorialHand to project targetWorld
  const oldUpdateHand = `  updateTutorialHand(targetEl, kind) {
    if (!this.tutorialHand) return;
    if (targetEl && targetEl.isConnected) {
      const r = targetEl.getBoundingClientRect();
      this.tutorialHand.style.display = 'block';
      this.tutorialHand.style.left = \`\${r.left + r.width / 2 - 24}px\`;
      this.tutorialHand.style.top = \`\${r.top - 54}px\`;
      this.tutorialHand.classList.add('show');
    } else if (kind === 'zone' && this.zoneHint) {
      const r = this.zoneHint.getBoundingClientRect();
      this.tutorialHand.style.display = 'block';
      this.tutorialHand.style.left = \`\${r.left + r.width / 2 - 24}px\`;
      this.tutorialHand.style.top = \`\${r.top + r.height / 2 - 46}px\`;
      this.tutorialHand.classList.add('show');
    } else {
      this.tutorialHand.classList.remove('show');
      this.tutorialHand.style.display = 'none';
    }
  }`;

  const newUpdateHand = `  updateTutorialHand(targetEl, kind) {
    if (!this.tutorialHand) return;
    if (targetEl && targetEl.isConnected) {
      const r = targetEl.getBoundingClientRect();
      this.tutorialHand.style.display = 'block';
      this.tutorialHand.style.left = \`\${r.left + r.width / 2 - 27}px\`;
      this.tutorialHand.style.top = \`\${r.top - 58}px\`;
      this.tutorialHand.classList.add('show');
    } else if (this.currentGuideOpt && this.currentGuideOpt.targetWorld && this.battle && this.battle.scene && this.battle.scene.worldToScreen) {
      const pt = this.battle.scene.worldToScreen(this.currentGuideOpt.targetWorld.x, 0, this.currentGuideOpt.targetWorld.z);
      if (pt) {
        this.tutorialHand.style.display = 'block';
        this.tutorialHand.style.left = \`\${pt.x - 27}px\`;
        this.tutorialHand.style.top = \`\${pt.y - 74}px\`;
        this.tutorialHand.classList.add('show');

        if (this.zoneHint) {
          this.zoneHint.style.position = 'fixed';
          this.zoneHint.style.left = \`\${pt.x - 110}px\`;
          this.zoneHint.style.top = \`\${pt.y - 128}px\`;
          this.zoneHint.style.width = '220px';
          this.zoneHint.style.height = 'auto';
          this.zoneHint.style.border = 'none';
          this.zoneHint.style.background = 'transparent';
          this.zoneHint.style.boxShadow = 'none';
          const label = this.currentGuideOpt.zoneHintText || (this.currentGuideOpt.unit === 'archer' ? '【弓兵阵位】点击此处射击' : '【剑兵阵位】点击此处出兵');
          this.zoneHint.innerHTML = \`<div class="zone-hint-box"><div class="zone-hint-text">\${label}</div></div>\`;
          this.zoneHint.classList.add('show');
        }
      }
    } else if (kind === 'zone' && this.zoneHint) {
      const r = this.zoneHint.getBoundingClientRect();
      this.tutorialHand.style.display = 'block';
      this.tutorialHand.style.left = \`\${r.left + r.width / 2 - 27}px\`;
      this.tutorialHand.style.top = \`\${r.top + r.height / 2 - 46}px\`;
      this.tutorialHand.classList.add('show');
    } else {
      this.tutorialHand.classList.remove('show');
      this.tutorialHand.style.display = 'none';
    }
  }`;

  if (content.includes('updateTutorialHand(targetEl, kind) {')) {
    content = content.replace(oldUpdateHand, newUpdateHand);
  }

  // Update hideGuide to reset marker and styles
  if (!content.includes('this.battle.scene.setTutorialMarker(false)')) {
    content = content.replace(
      'this.zoneHint.innerHTML = \'\';',
      `this.zoneHint.innerHTML = '';
      this.zoneHint.style.position = '';
      this.zoneHint.style.left = '';
      this.zoneHint.style.top = '';
      this.zoneHint.style.width = '';
      this.zoneHint.style.height = '';
      this.zoneHint.style.border = '';
      this.zoneHint.style.background = '';
      this.zoneHint.style.boxShadow = '';`
    );
    content = content.replace(
      'if (this.guideTarget) this.guideTarget.classList.remove(\'guide-target\');',
      `if (this.battle && this.battle.scene && this.battle.scene.setTutorialMarker) {
      this.battle.scene.setTutorialMarker(false);
    }
    this.currentGuideOpt = null;
    if (this.guideTarget) this.guideTarget.classList.remove('guide-target');`
    );
  }

  // In updateBattleHUD, sync tutorial hand if targetWorld is active
  if (!content.includes('this.currentGuideOpt.targetWorld')) {
    content = content.replace(
      'this.updateBossBar(boss.name, boss.hp, boss.maxHp);',
      `this.updateBossBar(boss.name, boss.hp, boss.maxHp);\n    if (this.currentGuideOpt && this.currentGuideOpt.targetWorld) this.updateTutorialHand(null, 'zone');`
    );
  }

  fs.writeFileSync(hudPath, content, 'utf8');
  console.log('src/ui/battle-hud.js updated.');
}

// 3. Edit styles.css
{
  const cssPath = path.join(root, 'styles.css');
  let content = fs.readFileSync(cssPath, 'utf8');

  // Replace .zone-hint-text styles with luminous gold/crimson
  const oldZoneHintText = `.zone-hint-text {
  background: rgba(23, 21, 15, 0.85);
  color: var(--gold);
  border: 1px solid var(--gold);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 1px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  animation: pulseGold 1.5s ease-in-out infinite;
}`;

  const newZoneHintText = `.zone-hint-text {
  background: linear-gradient(135deg, rgba(185, 28, 28, 0.95), rgba(217, 119, 6, 0.95));
  color: #ffffff;
  border: 2px solid #fef08a;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 1px;
  box-shadow: 0 0 24px rgba(245, 158, 11, 0.95), 0 4px 14px rgba(0,0,0,0.6);
  animation: pulseGold 1.5s ease-in-out infinite;
  text-shadow: 0 1px 3px rgba(0,0,0,0.85);
  white-space: nowrap;
}`;

  if (content.includes(oldZoneHintText)) {
    content = content.replace(oldZoneHintText, newZoneHintText);
  }

  // Ensure .tutorial-hand-pointer has drop-shadow glow
  if (!content.includes('drop-shadow(0 0 12px rgba(245, 158, 11, 0.95))')) {
    content = content.replace(
      'filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));',
      'filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.95)) drop-shadow(0 4px 10px rgba(0,0,0,0.6));'
    );
  }

  fs.writeFileSync(cssPath, content, 'utf8');
  console.log('styles.css updated.');
}

// 4. Edit src/first-guide.js
{
  const fgPath = path.join(root, 'src/first-guide.js');
  let content = fs.readFileSync(fgPath, 'utf8');

  // Replace step definitions for bounty and gacha
  const oldStepsBounty = `  // 阶段 5：悬赏系统（双倍与刷新机制）
  {
    target: '.home-bounty-section, #btn-bounty, #btn-open-bounty-all',
    title: '第九步 · 山河悬赏',
    text: '军情台发布了每日与每周悬赏军务！点击悬赏栏，开启军令犒赏！',
    act: 'open_bounty',
  },
  {
    target: '#bounty-modal .bounty-modal-content',
    title: '第十步 · 悬赏要略',
    text: '每日悬赏提供 2 次免费【换一换】机会，用尽后看广告可额外+3次！\\n完成悬赏后不仅能正常领赏，更可选择【🎬 看广告双倍领取】，战备物资直接翻倍！',
    act: 'next_tip',
    showNextBtn: true,
  },
  {
    target: '#bounty-modal .bounty-close-btn, #btn-modal-close-bounty',
    title: '第十一步 · 整备待发',
    text: '了解悬赏机制后关闭悬赏台，前往祈将台拜求神将！',
    act: 'close_bounty',
  },

  // 阶段 6：祈将台首次抽卡（必得 100 将令）
  {
    target: '#btn-gacha',
    title: '第十二步 · 祈将求贤',
    text: '功名盖世，必有名将慕名来投！前往【祈将台】寻访盖世神将！',
    act: 'open_gacha',
  },
  {
    target: '#btn-gacha-free',
    title: '第十三步 · 祈愿名将令',
    text: '每日可免费祈愿一次名将令！首次祈愿必得 100 将令大奖！',
    act: 'do_gacha_draw',
  },
  {
    target: '#screen-gacha .back-btn',
    title: '第十四步 · 神将令已备',
    text: '100 将令已收入囊中！可直接招募名将。日常看广告也可继续祈愿。现在出发征战下一关！',
    act: 'return_home',
  },

  // 阶段 7：再征第二关
  {
    target: '#btn-campaign',
    title: '第十五步 · 再征疆场',
    text: '军备已全，神将就位！随我出征第 2 关【麦田哨骑】！',
    act: 'levels',
  },
  {
    target: '#btn-level-go, #level-path .level-node[data-id="2"]',
    title: '第十六步 · 麦田哨骑',
    text: '第二战敌方哨骑来犯！点击进入战前整备！',
    act: 'prep_2',
  },
  {
    target: '#btn-start-battle',
    title: '第十七步 · 击退敌骑',
    text: '本关将实战学习防御建筑【箭塔】与主将光环运用！点击出战！',
    act: 'battle_2',
  },`;

  const newStepsBounty = `  // 阶段 5：悬赏系统（双倍与刷新机制）
  {
    target: '.home-bounty-section, #btn-bounty, #btn-open-bounty-all',
    title: '第九步 · 山河悬赏',
    text: '军情台发布了每日与每周悬赏军务！点击悬赏栏，开启军令犒赏！',
    act: 'open_bounty',
  },
  {
    target: '#bounty-modal .bounty-paper, #bounty-modal .modal-paper, #bounty-modal',
    title: '第十步 · 悬赏要略',
    text: '每日悬赏提供 2 次免费【换一换】机会，用尽后看广告可额外+3次！\\n完成悬赏后不仅能正常领赏，更可选择【🎬 看广告双倍领取】，战备物资直接翻倍！',
    act: 'next_tip',
    showNextBtn: true,
  },

  // 阶段 6：祈将台首次抽卡（必得 100 将令）
  {
    target: '#btn-gacha',
    title: '第十一步 · 祈将求贤',
    text: '功名盖世，必有名将慕名来投！前往【祈将台】寻访盖世神将！',
    act: 'open_gacha',
  },
  {
    target: '#btn-gacha-free',
    title: '第十二步 · 祈愿名将令',
    text: '每日可免费祈愿一次名将令！首次祈愿必得 100 将令大奖！',
    act: 'do_gacha_draw',
  },
  {
    target: '#screen-gacha .back-btn',
    title: '第十三步 · 神将令已备',
    text: '100 将令已收入囊中！可直接招募名将。日常看广告也可继续祈愿。现在出发征战下一关！',
    act: 'return_home',
  },

  // 阶段 7：再征第二关
  {
    target: '#btn-campaign',
    title: '第十四步 · 再征疆场',
    text: '军备已全，神将就位！随我出征第 2 关【麦田哨骑】！',
    act: 'levels',
  },
  {
    target: '#btn-level-go, #level-path .level-node[data-id="2"]',
    title: '第十五步 · 麦田哨骑',
    text: '第二战敌方哨骑来犯！点击进入战前整备！',
    act: 'prep_2',
  },
  {
    target: '#btn-start-battle',
    title: '第十六步 · 击退敌骑',
    text: '本关将实战学习防御建筑【箭塔】与主将光环运用！点击出战！',
    act: 'battle_2',
  },`;

  if (content.includes('第十一步 · 整备待发')) {
    content = content.replace(oldStepsBounty, newStepsBounty);
  }

  // Update handleTargetClick logic for step 9 -> 10 transition
  const oldStepProgress = `    } else if (curStep === 9) {
      // 悬赏要略 -> 点击下一步 -> 高亮关闭按钮
      this.show(10);
    } else if (curStep === 10) {
      // 点击关闭悬赏 -> 回主界面 -> 高亮祈将台
      setTimeout(() => this.show(11), 220);
    } else if (curStep === 11) {
      // 点击祈将台 -> 打开祈将台 -> 高亮免费祈愿
      setTimeout(() => this.show(12), 220);
    } else if (curStep === 12) {
      // 点击免费祈愿 -> 抽卡获得100将令 -> 高亮返回按钮
      setTimeout(() => this.show(13), 350);
    } else if (curStep === 13) {
      // 点击祈将台返回 -> 回主界面 -> 高亮再征疆场
      setTimeout(() => this.show(14), 220);
    } else if (curStep === 14) {
      // 点击再征疆场 -> 打开关卡列表 -> 高亮第二关
      setTimeout(() => this.show(15), 220);
    } else if (curStep === 15) {
      // 点击第二关 -> 打开点将台 -> 高亮出战
      if (this.app && this.app.openPrep) this.app.openPrep(2);
      setTimeout(() => this.show(16), 220);
    } else if (curStep === 16) {
      // 点击第二关出战 -> 胜利完成新手引导！
      this.finish();
    }`;

  const newStepProgress = `    } else if (curStep === 9) {
      // 悬赏要略 -> 点击下一步 -> 自动关闭悬赏弹窗 -> 高亮祈将台
      if (this.ui && this.ui.hideBountyModal) this.ui.hideBountyModal();
      setTimeout(() => this.show(10), 220);
    } else if (curStep === 10) {
      // 点击祈将台 -> 打开祈将台 -> 高亮免费祈愿
      setTimeout(() => this.show(11), 220);
    } else if (curStep === 11) {
      // 点击免费祈愿 -> 抽卡获得100将令 -> 高亮返回按钮
      setTimeout(() => this.show(12), 350);
    } else if (curStep === 12) {
      // 点击祈将台返回 -> 回主界面 -> 高亮再征疆场
      setTimeout(() => this.show(13), 220);
    } else if (curStep === 13) {
      // 点击再征疆场 -> 打开关卡列表 -> 高亮第二关
      setTimeout(() => this.show(14), 220);
    } else if (curStep === 14) {
      // 点击第二关 -> 打开点将台 -> 高亮出战
      if (this.app && this.app.openPrep) this.app.openPrep(2);
      setTimeout(() => this.show(15), 220);
    } else if (curStep === 15) {
      // 点击第二关出战 -> 胜利完成新手引导！
      this.finish();
    }`;

  if (content.includes('// 悬赏要略 -> 点击下一步 -> 高亮关闭按钮')) {
    content = content.replace(oldStepProgress, newStepProgress);
  }

  // Deadlock prevention in findTarget / show:
  // If targetEl is not found, show next button with "继续" and do not deadlock pointerdown
  const oldNoTargetBlock = `      } else {
        if (this.spot) this.spot.style.display = 'none';
        if (this.hand) this.hand.style.display = 'none';
      }`;

  const newNoTargetBlock = `      } else {
        if (this.spot) this.spot.style.display = 'none';
        if (this.hand) this.hand.style.display = 'none';
        // 防死锁容错：目标未在当前画面时，显式展示“继 续”按钮，点击即可前往下一步
        if (this.nextBtn) {
          this.nextBtn.textContent = '继 续';
          this.nextBtn.style.display = 'inline-block';
        }
      }`;

  if (content.includes(oldNoTargetBlock)) {
    content = content.replace(oldNoTargetBlock, newNoTargetBlock);
  }

  // Also in pointerdown handler on scrim:
  const oldPointerDown = `    el.addEventListener('pointerdown', (e) => {
      if (this.tip && this.tip.contains(e.target)) return;
      if (this.spot && (this.spot === e.target || this.spot.contains(e.target))) return;

      e.stopPropagation();
      e.preventDefault();
      if (this.ui && this.ui.toast) {
        this.ui.toast('请遵从军师指引，点击发光指定目标！');
      }
      if (this.spot) {
        this.spot.style.animation = 'none';
        void this.spot.offsetWidth;
        this.spot.style.animation = 'guide-target-pulse 0.4s ease 2';
      }
    });`;

  const newPointerDown = `    el.addEventListener('pointerdown', (e) => {
      if (this.tip && this.tip.contains(e.target)) return;
      if (this.spot && (this.spot === e.target || this.spot.contains(e.target))) return;

      // 如果当前步骤目标未找到，允许点击屏幕任意处直接推进，防止死锁困死玩家
      if (!this.activeTarget) {
        e.stopPropagation();
        e.preventDefault();
        this.handleTargetClick();
        return;
      }

      e.stopPropagation();
      e.preventDefault();
      if (this.ui && this.ui.toast) {
        this.ui.toast('请遵从军师指引，点击发光指定目标！');
      }
      if (this.spot) {
        this.spot.style.animation = 'none';
        void this.spot.offsetWidth;
        this.spot.style.animation = 'guide-target-pulse 0.4s ease 2';
      }
    });`;

  if (content.includes(oldPointerDown)) {
    content = content.replace(oldPointerDown, newPointerDown);
  }

  fs.writeFileSync(fgPath, content, 'utf8');
  console.log('src/first-guide.js updated.');
}

console.log('All v1.77 edits applied successfully.');
