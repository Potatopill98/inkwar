// 界面 · 战斗 HUD：卡槽/血条/BOSS 条/横幅/引导/暂停/结算
import { HERO_XP, pct, fmtTime } from './helpers.js?v=1.93';
import { getUnit } from '../data/units.js?v=1.93';
import { getHero } from '../data/heroes.js?v=1.93';
import { audio } from '../audio.js?v=1.93';
import { EndlessManager } from '../data/endless-manager.js?v=1.93';
import { getCounterMatch, strongOf, weakOf } from '../data/counters.js?v=1.93';
export const uiBattleHud = {
  showEndlessBuffSelection(battle) {
    const modal = document.getElementById('endless-buff-modal');
    if (!modal) return;
    // 选择增益时全局暂停，等待玩家选择完毕再继续，防止被偷袭或我方继续平推 (#6)
    battle.paused = true;
    battle.endlessBuffSelecting = true;
    const choices = EndlessManager.getThreeBuffChoices(battle.endlessBuffCounts || {});
    const container = document.getElementById('endless-buff-cards');
    if (container) {
      container.innerHTML = '';
      for (const choice of choices) {
        const card = document.createElement('div');
        card.className = `endless-buff-card rarity-${choice.rarity}`;
        const stackBadge = choice.currentStacks > 0 ? `<span class="buff-stack-badge">已叠 ${choice.currentStacks} 层</span>` : '';
        card.innerHTML = `
          <div class="buff-card-glow"></div>
          <div class="buff-card-tag">${choice.tag}</div>
          <div class="buff-card-icon">${choice.icon}</div>
          <div class="buff-card-title">${choice.name}</div>
          <div class="buff-card-desc">${choice.desc}</div>
          ${stackBadge}
          <button class="btn btn-seal btn-sm buff-select-btn">研习此策</button>
        `;
        card.onclick = () => {
          choice.apply(battle);
          battle.endlessBuffCounts[choice.id] = (battle.endlessBuffCounts[choice.id] || 0) + 1;
          audio.skill();
          modal.classList.remove('show');
          modal.style.display = 'none';
          battle.endlessBuffSelecting = false;
          battle.paused = false;
          battle.lastFrame = performance.now();
          this.showBattleBanner('战法通达', `${choice.name} 已入阵法（当前已叠 ${battle.endlessBuffCounts[choice.id]} 层）`, 1800);
        };
        container.appendChild(card);
      }
    }
    modal.style.display = 'flex';
    modal.classList.add('show');
    audio.drum(null, true, 0.4);
  },

  setupBattleHUD(battle) {
    this.battle = battle;
    this.hideResult();
    this.hidePause();
    this.hideBossBar();
    this.hideGuide();
    this.cardTray.innerHTML = '';
    this.hudCards.clear();
    const btnSaveQuit = document.getElementById('btn-endless-save-quit');
    if (btnSaveQuit) btnSaveQuit.onclick = () => {
      this.hidePause();
      if (this.battle && this.battle.saveEndlessAndExit) {
        this.battle.saveEndlessAndExit();
      }
    };
    const btnSettleQuit = document.getElementById('btn-endless-settle-quit');
    if (btnSettleQuit) btnSettleQuit.onclick = () => {
      this.hidePause();
      if (this.battle && this.battle.settleEndlessEarly) {
        this.battle.settleEndlessEarly();
      }
    };

    const deck = battle.deckUnits;
    for (const unit of deck) {
      const btn = document.createElement('button');
      btn.className = `card rarity-${unit.rarity}${unit.spell ? ' spell' : ''}`;
      btn.dataset.unit = unit.id;
      btn.title = `${unit.name} · ${unit.cost} 军令 · ${unit.cooldown}s 冷却 (长按查看克制)`;
      btn.innerHTML = `
        <span class="card-art" style="background-image:url('${this.unitThumb(unit)}')"></span>
        <span class="card-cost">${unit.cost}</span>
        <span class="card-lack-badge"></span>
        <span class="card-name">${unit.name}</span>
        ${unit.spell ? '<span class="card-spell-badge">术</span>' : ''}
        <span class="card-cd-mask"></span>
        <span class="card-cd-text"></span>
      `;

      // 点击行为：军令不足只抖动+提示音，不弹 toast；蓄势提示蓄势中
      btn.onclick = () => {
        if (btn.classList.contains('state-no-energy')) {
          btn.classList.remove('card-shake');
          void btn.offsetWidth;
          btn.classList.add('card-shake');
          if (audio.error) audio.error();
          return;
        }
        if (btn.classList.contains('state-charging')) {
          this.showGuide('术法开局蓄势中，暂无法释放', btn);
          return;
        }
        if (btn.classList.contains('state-cooldown') || btn.classList.contains('state-disabled')) {
          return;
        }
        battle.selectCard(unit.id);
      };

      // 长按 420ms 呼出同源克制浮层
      let pressTimer = null;
      const startPress = () => {
        pressTimer = setTimeout(() => {
          this.showCardCounterTip(unit, btn, battle);
        }, 420);
      };
      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        this.hideCardCounterTip();
      };
      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('touchstart', startPress, { passive: true });
      btn.addEventListener('mouseup', cancelPress);
      btn.addEventListener('mouseleave', cancelPress);
      btn.addEventListener('touchend', cancelPress);
      btn.addEventListener('touchcancel', cancelPress);
      this.cardTray.appendChild(btn);
      this.hudCards.set(unit.id, btn);
    }
    const hero = battle.heroData;
    this.heroSeal.textContent = hero.name[0];
    this.hudHeroName.innerHTML = `${hero.name} <span id="hud-hero-level">Lv.1</span>`;
    this.hudHeroLevel = this.$('hud-hero-level');
    const isPassiveUnlocked = battle.isPassiveUnlocked ? battle.isPassiveUnlocked() : (battle.heroOutsideLevel >= 3);
    if (!isPassiveUnlocked) {
      this.hudHeroPassive.innerHTML = `<span style="opacity:0.65; color: #94a3b8">【${hero.passive.name} (3级解锁)】未激活</span>`;
    } else {
      this.hudHeroPassive.textContent = `${hero.passive.name} · ${hero.passive.desc.replace(/。$/, '')}`;
    }
    if (this.hudHeroSkill) {
      this.hudHeroSkill.textContent = `${hero.active.name} · 冷却 ${hero.active.cooldown}s`;
      this.hudHeroSkill.title = hero.active.desc;
    }
    this.superRingFill = document.getElementById('super-ring-fill');
    this.skillName.textContent = '大招';
    this.skillBtn.title = `${hero.active.name}：${hero.active.desc} (按 Q 键施展)`;
    this.skillCd.textContent = '';
    this.skillBtn.classList.remove('cooling', 'charged');
    if (this.gadgetBtn) {
      if (this.gadgetName) this.gadgetName.textContent = (hero.gadget && hero.gadget.name.length <= 4) ? hero.gadget.name : (hero.gadget?.name?.slice(0, 4) || '技能');
      this.gadgetBtn.title = hero.gadget ? `${hero.gadget.name}：${hero.gadget.desc} (按 E 键施展)` : '专属技能 (按 E 键施展)';
      this.gadgetBtn.onclick = () => battle.useGadget && battle.useGadget();
    }
    this.deckBonusHud.textContent = battle.deckBonus.labels.length ? battle.deckBonus.labels.join(' · ') : '无军阵加成';
    this.speedBtn.textContent = `${battle.speed}×`;
    this.pauseBtn.textContent = '⏸';
    this.speedBtn.classList.toggle('active', battle.speed > 1);
    this.updateBattleHUD(battle);
  }
,

  updateBattleHUD(battle) {
    if (!battle || battle !== this.battle) return;
    const baseP = pct(battle.baseHp, 3000);
    const enemyP = pct(battle.enemyBaseHp, battle.level.enemyBaseHp);
    this.basePlayerFill.style.width = `${baseP * 100}%`;
    this.baseEnemyFill.style.width = `${enemyP * 100}%`;
    this.basePlayerText.textContent = Math.max(0, Math.ceil(battle.baseHp));
    this.baseEnemyText.textContent = Math.max(0, Math.ceil(battle.enemyBaseHp));
    if (battle.isEndless) {
      this.waveIndex.textContent = `第 ${battle.endlessWave || 1} 波`;
      this.waveLabel.textContent = battle.boss ? '首领战' : '墨影涌现';
    } else {
      this.waveIndex.textContent = `第 ${Math.max(1, battle.waveIndex + 1)} 波`;
      const wave = battle.level.waves ? battle.level.waves[battle.waveIndex] : null;
      this.waveLabel.textContent = battle.boss ? '首领战' : wave ? (wave.label || '交战中') : '列阵';
    }
    const eMax = battle.energyMax || 30;
    this.energyText.textContent = `${Math.floor(battle.energy)} / ${eMax}`;
    this.energyFill.style.width = `${pct(battle.energy, eMax) * 100}%`;
    const hero = battle.heroData;
    if (this.hudHeroHpTrack) {
      this.hudHeroHpTrack.style.display = 'block';
    }
    {
      const curLvl = battle.heroInBattleLevel || 1;
      if (battle.heroRespawnTimer > 0) {
        if (this.hudHeroLevel) this.hudHeroLevel.textContent = `复活 ${Math.ceil(battle.heroRespawnTimer)}s`;
        if (this.heroSeal) this.heroSeal.classList.add('hero-dead');
        this.heroXpFill.style.width = '0%';
        if (this.hudHeroHpFill) this.hudHeroHpFill.style.width = '0%';
        if (this.hudHeroHpText) this.hudHeroHpText.textContent = `0 / ${battle.heroMaxHp}`;
      } else {
        if (this.hudHeroLevel) this.hudHeroLevel.textContent = `Lv.${curLvl}`;
        if (this.heroSeal) this.heroSeal.classList.remove('hero-dead');
        const xpThresholds = [0, 20, 50, 95, 150];
        const prevXp = xpThresholds[curLvl - 1] || 0;
        const nextXp = xpThresholds[curLvl] || 150;
        const curXp = battle.heroInBattleXp || 0;
        const xpPct = curLvl >= 5 ? 1 : Math.max(0, Math.min(1, (curXp - prevXp) / Math.max(1, nextXp - prevXp)));
        this.heroXpFill.style.width = `${xpPct * 100}%`;
        const hpPct = Math.max(0, Math.min(1, battle.heroHp / Math.max(1, battle.heroMaxHp)));
        if (this.hudHeroHpFill) this.hudHeroHpFill.style.width = `${hpPct * 100}%`;
        if (this.hudHeroHpText) this.hudHeroHpText.textContent = `${Math.ceil(battle.heroHp)} / ${battle.heroMaxHp}`;
      }
    }
    const heroDead = battle.isHeroAlive && !battle.isHeroAlive();
    const charge = Math.min(100, Math.max(0, battle.heroSuperCharge || 0));
    const superCd = battle.skillCd || 0;
    const isSuperCharged = (charge >= 100);

    // 更新荒野乱斗 SVG 充能进度环 (周长 2 * PI * 34 = 213.63)
    if (!this.superRingFill) this.superRingFill = document.getElementById('super-ring-fill');
    if (this.superRingFill) {
      const offset = 213.63 * (1 - charge / 100);
      this.superRingFill.style.strokeDashoffset = offset.toFixed(2);
    }

    // 大招按钮状态 (冷却/充能中/就绪脉冲)
    if (heroDead) {
      this.skillBtn.classList.add('cooling');
      this.skillBtn.classList.remove('charged');
      this.skillCd.textContent = '力竭';
      this.skillBtn.disabled = true;
    } else if (superCd > 0.05) {
      // 50s 冷却中（灰色倒计时），期间普攻仍在充能
      this.skillBtn.classList.add('cooling');
      this.skillBtn.classList.remove('charged');
      this.skillCd.textContent = `${Math.ceil(superCd)}s`;
      this.skillBtn.disabled = true;
    } else if (!isSuperCharged) {
      // 冷却已结束但充能未满 100%（显示充能百分比）
      this.skillBtn.classList.add('cooling');
      this.skillBtn.classList.remove('charged');
      this.skillCd.textContent = `${Math.floor(charge)}%`;
      this.skillBtn.disabled = true;
    } else {
      // 100% 充能且冷却就绪：金色流光脉冲！
      this.skillBtn.classList.remove('cooling');
      this.skillBtn.classList.add('charged');
      this.skillCd.textContent = '';
      this.skillBtn.disabled = false;
    }

    // 专属技能按钮（原妙具更名：7级解锁，冷却 20s，不限次数）
    if (this.gadgetBtn) {
      const isGadgetUnlocked = battle.isGadgetUnlocked ? battle.isGadgetUnlocked() : (battle.heroOutsideLevel >= 7);
      const gadgetCd = battle.heroGadgetCd || 0;

      if (!isGadgetUnlocked) {
        this.gadgetBtn.classList.add('locked', 'cooling');
        this.gadgetBtn.classList.remove('ready');
        if (this.gadgetCd) this.gadgetCd.textContent = '7级解锁';
        this.gadgetBtn.disabled = true;
      } else if (heroDead) {
        this.gadgetBtn.classList.remove('locked');
        this.gadgetBtn.classList.add('cooling');
        this.gadgetBtn.classList.remove('ready');
        if (this.gadgetCd) this.gadgetCd.textContent = '力竭';
        this.gadgetBtn.disabled = true;
      } else if (gadgetCd > 0.05) {
        // 20s 冷却中（显示倒计时，灰色深底）
        this.gadgetBtn.classList.remove('locked');
        this.gadgetBtn.classList.add('cooling');
        this.gadgetBtn.classList.remove('ready');
        if (this.gadgetCd) this.gadgetCd.textContent = `${Math.ceil(gadgetCd)}s`;
        const gCdP = pct(gadgetCd, battle.heroGadgetCooldown || 20.0);
        const deg = (1 - gCdP) * 360;
        this.gadgetBtn.style.setProperty('background', `conic-gradient(rgba(23,21,15,.75) ${deg}deg, #047857 ${deg}deg)`);
        this.gadgetBtn.disabled = true;
      } else {
        // 冷却就绪，无限次数随心释放！
        this.gadgetBtn.classList.remove('locked', 'cooling');
        this.gadgetBtn.classList.add('ready');
        if (this.gadgetCd) this.gadgetCd.textContent = '';
        this.gadgetBtn.style.removeProperty('background');
        this.gadgetBtn.disabled = false;
      }
    }
    for (const [id, el] of this.hudCards) {
      const card = battle.cards.find((c) => c.unit.id === id);
      if (!card) continue;
      const locked = card.lock > 0;
      const cd = card.cd;
      const cooling = !locked && cd > 0.03;
      const effectiveCost = battle.getCardCost ? battle.getCardCost(card) : card.unit.cost;
      const poor = !cooling && !locked && battle.energy < effectiveCost;
      const ready = !cooling && !locked && !poor;

      // 卡面五态（design §2.1.1）
      el.classList.toggle('state-charging', locked);
      el.classList.toggle('state-cooldown', cooling);
      el.classList.toggle('state-no-energy', poor);
      el.classList.toggle('state-ready', ready);
      // 兼容旧样式
      el.classList.toggle('cooling', cooling || locked);
      el.classList.toggle('poor', poor);
      el.classList.toggle('selected', battle.selectedCard === id);

      // 就绪瞬间：轻微闪光 + 短促木鱼音
      if (ready && !el._wasReady) {
        el.classList.remove('state-ready-flash');
        if (el.offsetWidth !== undefined) void el.offsetWidth;
        el.classList.add('state-ready-flash');
        if (audio.woodfish) audio.woodfish();
      }
      el._wasReady = ready;

      // 军令不足：标明缺 N 令
      const lackBadge = el.querySelector('.card-lack-badge');
      if (lackBadge) {
        if (poor) {
          const diff = Math.ceil(effectiveCost - battle.energy);
          lackBadge.textContent = `缺${diff}令`;
        } else {
          lackBadge.textContent = '';
        }
      }

      const mask = el.querySelector('.card-cd-mask');
      const text = el.querySelector('.card-cd-text');
      if (locked) {
        // 术法开局蓄势（design §3.3.1）
        if (mask) mask.style.background = 'rgba(23,21,15,.72)';
        if (text) text.textContent = `蓄势 ${Math.ceil(card.lock)}`;
      } else if (cooling) {
        const deg = (cd / card.total) * 360;
        if (mask) mask.style.background = `conic-gradient(rgba(23,21,15,.7) ${deg}deg, rgba(23,21,15,.08) ${deg}deg)`;
        if (text) text.textContent = cd > 1 ? Math.ceil(cd) : cd.toFixed(1);
      } else {
        if (mask) mask.style.background = 'none';
        if (text) text.textContent = '';
      }
    }
    if (battle.boss && battle.boss.alive) {
      this.showBossBar(battle.boss.bossName, battle.boss.hp, battle.boss.bossHpMax);
    }
  }
,

  showBattleBanner(main, sub, ms = 1600) {
    this.bannerMain.textContent = main || '';
    this.bannerSub.textContent = sub || '';
    this.battleBanner.classList.remove('show');
    void this.battleBanner.offsetWidth;
    this.battleBanner.style.animationDuration = `${Math.max(0.9, ms / 1000 + 0.3)}s`;
    this.battleBanner.classList.add('show');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.battleBanner.classList.remove('show');
    }, ms);
  }
,

  showBossBar(name, hp, max) {
    this.bossBar.classList.add('show');
    this.bossName.textContent = name || '首领';
    this.bossFill.style.width = `${pct(hp, max) * 100}%`;
  }
,

  updateBossBar(name, hp, max) {
    if (!this.bossBar.classList.contains('show')) this.showBossBar(name, hp, max);
    this.bossFill.style.width = `${pct(hp, max) * 100}%`;
  }
,

  hideBossBar() {
    this.bossBar.classList.remove('show');
  }
,

  showGuide(opt, targetEl, kind = 'default') {
    let text = '';
    let title = '战术指引';
    let subText = '';
    let pause = false;

    if (typeof opt === 'string') {
      text = opt;
    } else if (opt && typeof opt === 'object') {
      text = opt.text || '';
      title = opt.title || '战术指引';
      subText = opt.subText || '';
      if (opt.targetEl !== undefined) targetEl = opt.targetEl;
      if (opt.kind) kind = opt.kind;
      pause = !!opt.pause;
    }

    if (!this.tutorialScrim) {
      this.tutorialScrim = document.createElement('div');
      this.tutorialScrim.className = 'tutorial-scrim';
      const hud = document.getElementById('battle-hud');
      if (hud) hud.appendChild(this.tutorialScrim);
      this.tutorialScrim.addEventListener('pointerdown', (e) => {
        if (this.tutorialScrim.classList.contains('blocking')) {
          e.stopPropagation();
          e.preventDefault();
          this.toast('请按军师指引操作！');
        }
      });
    }
    if (this.tutorialScrim) {
      this.tutorialScrim.classList.toggle('show', pause);
      this.tutorialScrim.classList.toggle('blocking', !!opt.blocking);
    }

    if (!this.tutorialHand) {
      this.tutorialHand = document.createElement('div');
      this.tutorialHand.className = 'tutorial-hand-pointer';
      this.tutorialHand.innerHTML = `
        <svg viewBox="0 0 48 48" width="54" height="54" fill="none">
          <path d="M24 4 L24 32 M14 22 L24 32 L34 22" stroke="#fef08a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M24 4 L24 32 M14 22 L24 32 L34 22" stroke="#ea580c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="40" r="5" fill="#fef08a" stroke="#b91c1c" stroke-width="2"/>
        </svg>
      `;
      document.body.appendChild(this.tutorialHand);
    }

    if (this.guideTip) {
      this.guideTip.innerHTML = `
        <div class="guide-kicker">
          <span class="guide-badge">${title}</span>
          ${pause ? '<span class="guide-pause-badge">⏸ 全局已暂停</span>' : ''}
        </div>
        <p class="guide-desc">${text}</p>
        ${subText ? `<div class="guide-sub">${subText}</div>` : ''}
      `;
      this.guideTip.classList.add('show');
    }

    if (this.zoneHint) {
      this.zoneHint.classList.remove('show', 'hero');
      if (kind === 'zone') {
        this.zoneHint.innerHTML = `
          <div class="zone-hint-box">
            <span class="zone-pulse-ring"></span>
            <div class="zone-hint-text">在此处战场点击出兵</div>
          </div>
        `;
        this.zoneHint.classList.add('show');
      } else if (kind === 'hero') {
        this.zoneHint.innerHTML = `
          <div class="zone-hint-box">
            <div class="zone-hint-text">点击战场地面调遣主将</div>
          </div>
        `;
        this.zoneHint.classList.add('show', 'hero');
      }
    }

    if (this.battle && this.battle.scene && this.battle.scene.setTutorialMarker) {
      this.battle.scene.setTutorialMarker(false);
    }
    this.currentGuideOpt = null;
    if (this.guideTarget) this.guideTarget.classList.remove('guide-target');
    this.guideTarget = targetEl || null;
    if (targetEl) {
      this.ensureGuideTargetVisible(targetEl);
      targetEl.classList.add('guide-target');
    }
    this.bindGuideReposition();

    this.currentGuideOpt = (opt && typeof opt === 'object') ? opt : { text, title, subText, kind };
    const b = this.battle || (this.app && this.app.battle);
    if (this.currentGuideOpt && this.currentGuideOpt.targetWorld && b && b.scene && b.scene.setTutorialMarker) {
      b.scene.setTutorialMarker(true, this.currentGuideOpt.targetWorld.x, this.currentGuideOpt.targetWorld.z);
    }
    this.updateTutorialHand(targetEl, kind);
  }
,

  // 战术指引目标若在可滚动容器（卡牌条 / 兵册 / 详情面板）之外，先滚进来再画手
  ensureGuideTargetVisible(el) {
    if (!el) return;
    const margin = 10;
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const cs = window.getComputedStyle(node);
      const canY = /(auto|scroll|overlay)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 2;
      const canX = /(auto|scroll|overlay)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth + 2;
      if (canY || canX) {
        const nr = node.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        if (canY && er.top < nr.top + margin) node.scrollTop -= (nr.top + margin) - er.top;
        else if (canY && er.bottom > nr.bottom - margin) node.scrollTop += er.bottom - (nr.bottom - margin);
        if (canX && er.left < nr.left + margin) node.scrollLeft -= (nr.left + margin) - er.left;
        else if (canX && er.right > nr.right - margin) node.scrollLeft += er.right - (nr.right - margin);
      }
      node = node.parentElement;
    }
  }
,

  bindGuideReposition() {
    if (this._guideReposBound) return;
    this._guideReposBound = true;
    this._onGuideResize = () => {
      const el = this.guideTarget;
      if (!el) return;
      this.ensureGuideTargetVisible(el);
      this.updateTutorialHand(el, (this.currentGuideOpt && this.currentGuideOpt.kind) || 'default');
    };
    window.addEventListener('resize', this._onGuideResize);
    window.addEventListener('orientationchange', this._onGuideResize);
  }
,

  updateTutorialHand(targetEl, kind) {
    if (!this.tutorialHand) return;
    const b = this.battle || (this.app && this.app.battle);
    if (targetEl && targetEl.isConnected) {
      const r = targetEl.getBoundingClientRect();
      this.tutorialHand.style.display = 'block';
      this.tutorialHand.style.left = `${r.left + r.width / 2 - 27}px`;
      this.tutorialHand.style.top = `${r.top - 58}px`;
      this.tutorialHand.classList.add('show');
    } else if (this.currentGuideOpt && this.currentGuideOpt.targetWorld && b && b.scene && b.scene.worldToScreen) {
      const pt = b.scene.worldToScreen(this.currentGuideOpt.targetWorld.x, 0, this.currentGuideOpt.targetWorld.z);
      if (pt) {
        this.tutorialHand.style.display = 'block';
        this.tutorialHand.style.left = `${pt.x - 27}px`;
        this.tutorialHand.style.top = `${pt.y - 74}px`;
        this.tutorialHand.classList.add('show');

        if (this.zoneHint) {
          this.zoneHint.style.position = 'fixed';
          this.zoneHint.style.left = `${pt.x - 110}px`;
          this.zoneHint.style.top = `${pt.y - 128}px`;
          this.zoneHint.style.width = '220px';
          this.zoneHint.style.height = 'auto';
          this.zoneHint.style.border = 'none';
          this.zoneHint.style.background = 'transparent';
          this.zoneHint.style.boxShadow = 'none';
          const label = this.currentGuideOpt.zoneHintText || (this.currentGuideOpt.unit === 'archer' ? '【弓兵阵位】点击此处射击' : '【剑兵阵位】点击此处出兵');
          this.zoneHint.innerHTML = `<div class="zone-hint-box"><div class="zone-hint-text">${label}</div></div>`;
          this.zoneHint.classList.add('show');
        }
      }
    } else if (kind === 'zone' && this.zoneHint) {
      // 容错降级：在己方前沿中央精准定位
      const b = this.battle || (this.app && this.app.battle);
      const targetWorld = (this.currentGuideOpt && this.currentGuideOpt.targetWorld) || { x: -5.0, z: 0 };
      const pt = (b && b.scene && b.scene.worldToScreen) ? b.scene.worldToScreen(targetWorld.x, 0, targetWorld.z) : null;
      if (pt) {
        this.tutorialHand.style.display = 'block';
        this.tutorialHand.style.left = `${pt.x - 27}px`;
        this.tutorialHand.style.top = `${pt.y - 74}px`;
        this.tutorialHand.classList.add('show');
      } else {
        const r = this.zoneHint.getBoundingClientRect();
        this.tutorialHand.style.display = 'block';
        this.tutorialHand.style.left = `${r.left + r.width / 2 - 27}px`;
        this.tutorialHand.style.top = `${r.top + r.height / 2 - 46}px`;
        this.tutorialHand.classList.add('show');
      }
    } else {
      this.tutorialHand.classList.remove('show');
      this.tutorialHand.style.display = 'none';
    }
  }
,

  hideGuide() {
    if (this.tutorialScrim) this.tutorialScrim.classList.remove('show', 'blocking');
    if (this.tutorialHand) {
      this.tutorialHand.classList.remove('show');
      this.tutorialHand.style.display = 'none';
    }
    if (this.guideTip) {
      this.guideTip.classList.remove('show');
      this.guideTip.innerHTML = '';
    }
    if (this.zoneHint) {
      this.zoneHint.classList.remove('show', 'hero');
      this.zoneHint.innerHTML = '';
      this.zoneHint.style.position = '';
      this.zoneHint.style.left = '';
      this.zoneHint.style.top = '';
      this.zoneHint.style.width = '';
      this.zoneHint.style.height = '';
      this.zoneHint.style.border = '';
      this.zoneHint.style.background = '';
      this.zoneHint.style.boxShadow = '';
    }
    if (this.guideTarget) this.guideTarget.classList.remove('guide-target');
    this.guideTarget = null;
  }
,

  flash(kind) {
    this.battleFlash.className = 'battle-flash';
    void this.battleFlash.offsetWidth;
    this.battleFlash.classList.add(kind);
  }
,

  setWeather(weather) {
    this.weatherOverlay.className = 'weather-overlay';
    if (weather && weather !== 'clear') this.weatherOverlay.classList.add(`weather-${weather}`);
  }
,

  showPause() {
    this.pauseModal.classList.add('show');
    this.pauseBtn.textContent = '▶';
    this.syncPauseSettings();
    const isEndless = this.battle && this.battle.isEndless;
    const btnRestart = document.getElementById('btn-restart');
    const btnRetreat = document.getElementById('btn-retreat');
    const btnSaveQuit = document.getElementById('btn-endless-save-quit');
    const btnSettleQuit = document.getElementById('btn-endless-settle-quit');
    if (btnRestart) btnRestart.style.display = isEndless ? 'none' : 'inline-flex';
    if (btnRetreat) btnRetreat.style.display = isEndless ? 'none' : 'inline-flex';
    if (btnSaveQuit) btnSaveQuit.style.display = isEndless ? 'inline-flex' : 'none';
    if (btnSettleQuit) btnSettleQuit.style.display = isEndless ? 'inline-flex' : 'none';
  }
,

  hidePause() {
    this.pauseModal.classList.remove('show');
    if (this.battle && !this.battle.paused) this.pauseBtn.textContent = '⏸';
  }
,

  syncPauseSettings() {
    const s = this.app.save.settings;
    this.btnPauseMusic.textContent = `音乐：${s.music ? '开' : '关'}`;
    this.btnPauseSfx.textContent = `音效：${s.sfx ? '开' : '关'}`;

    const ht = s.heroTuning || { maxHp: 1200, atk: 65, armor: 10, regenRate: 0.04, aggroRadius: 2.85 };
    if (this.psliderHeroHp) this.psliderHeroHp.value = ht.maxHp;
    if (this.pvalHeroHp) this.pvalHeroHp.textContent = ht.maxHp;
    if (this.psliderHeroAtk) this.psliderHeroAtk.value = ht.atk;
    if (this.pvalHeroAtk) this.pvalHeroAtk.textContent = ht.atk;
    if (this.psliderHeroArmor) this.psliderHeroArmor.value = ht.armor;
    if (this.pvalHeroArmor) this.pvalHeroArmor.textContent = ht.armor;
    if (this.psliderHeroRegen) this.psliderHeroRegen.value = (ht.regenRate * 100).toFixed(1);
    if (this.pvalHeroRegen) this.pvalHeroRegen.textContent = `${(ht.regenRate * 100).toFixed(1)}%/s`;
    if (this.psliderHeroAggro) this.psliderHeroAggro.value = ht.aggroRadius;
    if (this.pvalHeroAggro) this.pvalHeroAggro.textContent = `${ht.aggroRadius}m`;
  }
,

  destroyBattleUI() {
    this.hidePause();
    this.hideResult();
    this.hideBossBar();
    this.hideGuide();
    if (this.tutorialHand) {
      try { this.tutorialHand.remove(); } catch (e) {}
      this.tutorialHand = null;
    }
    if (this.tutorialScrim) {
      try { this.tutorialScrim.remove(); } catch (e) {}
      this.tutorialScrim = null;
    }
    this.battle = null;
  }

  // ---------------- 结算 ----------------
,

  showResult(result) {
    this.lastResult = result;
    
    if (result.isEndless) {
      this.hidePause();
      this.resultTitle.textContent = '试 炼 结 算';
      this.resultTitle.style.color = '#c9a25e';
      this.resultStars.innerHTML = '<span class="endless-banner-tag">⚔️ 墨影试炼 · 无尽阵线 ⚔️</span>';
      this.resultQuote.textContent = '群墨翻涌，山河无终。唯有名将力挽狂澜！';
      this.resultUnlocks.innerHTML = '';
      this.btnResultTour.style.display = 'none';
      this.btnResultNext.style.display = 'none';

      const r = result.rewards || (EndlessManager ? EndlessManager.calculateRewards(result) : {});
      result.rewards = r;
      const mul = result.tokensDoubled ? 2 : 1;
      const finalMobao = (r.mobao || 0) * mul;
      const finalTokens = (r.tokens || 0) * mul;
      this.resultStats.innerHTML = `
        <div class="endless-stats-grid">
          <div class="endless-stat-box"><b>${result.waves || 0}</b><span>坚持波次</span></div>
          <div class="endless-stat-box"><b>${result.bossKills || 0}</b><span>斩将首领</span></div>
          <div class="endless-stat-box"><b>${result.kills || 0}</b><span>杀敌人数</span></div>
          <div class="endless-stat-box"><b>${result.baseDamage || 0}</b><span>敌寨创伤</span></div>
        </div>
        <div class="endless-reward-pills">
          <div class="reward-pill mobao"><b>+${finalMobao}</b><span>墨宝</span></div>
          <div class="reward-pill tokens"><b>+${finalTokens}</b><span>将令</span></div>
        </div>
        <div class="endless-reward-desc">
          每波1墨宝1将令 · 每50士兵1墨宝 · 每首领5将令 · 敌寨每5000伤3墨宝1将令
        </div>
      `;
      const canDouble = ((r.mobao || 0) > 0 || (r.tokens || 0) > 0) && !result.tokensDoubled;
      if (canDouble) {
        this.btnResultDouble.style.display = 'inline-flex';
        this.btnResultDouble.disabled = false;
        this.btnResultDouble.textContent = '看广告 · 双倍领取墨宝将令';
      } else if (result.tokensDoubled) {
        this.btnResultDouble.style.display = 'inline-flex';
        this.btnResultDouble.disabled = true;
        this.btnResultDouble.textContent = '已双倍领取';
      } else {
        this.btnResultDouble.style.display = 'none';
      }
      this.resultModal.classList.add('show');
      return;
    }

    const win = result.win;
    this.hidePause();
    this.resultTitle.textContent = win ? '胜 利' : '败 北';
    this.resultTitle.style.color = win ? 'var(--cinnabar)' : 'var(--wash)';
    const stars = result.stars || 0;
    this.resultStars.innerHTML = [1, 2, 3].map((n) => {
      if (n <= stars) return `<span class="star lit" style="animation-delay:${(n - 1) * 0.22}s">★</span>`;
      return '<span class="star dim">★</span>';
    }).join('');
    this.resultQuote.textContent = win
      ? result.level.quote
      : `${result.level.quote} · ${result.level.tip || '再整旗鼓，卷土重来。'}`;
    this.refreshResultTokens();
    const unlocks = [];
    for (const uid of result.newUnits || []) {
      const u = getUnit(uid);
      const flag = u.spell ? '新术法' : u.building ? '新建筑' : '新兵种';
      unlocks.push(`<span class="unlock-card"><img src="${this.unitThumb(u)}" alt=""><span>${u.name}<br><span class="unlock-flag">${flag}</span></span></span>`);
    }
    for (const hid of result.newHeroes || []) {
      const h = getHero(hid);
      unlocks.push(`<span class="unlock-card"><img src="${this.heroThumb(h)}" alt=""><span>${h.name}<br><span class="unlock-flag">新英雄</span></span></span>`);
    }
    if (!win) {
      const reviewHtml = this.createDefeatReview(this.battle, result);
      if (reviewHtml) {
        this.resultUnlocks.innerHTML = reviewHtml;
        setTimeout(() => this.bindDefeatReviewEvents(this.battle), 50);
      } else if (result.level.tip) {
        this.resultUnlocks.innerHTML = `<span style="color:var(--wash)">提示：${result.level.tip}</span>`;
      }
    } else if (unlocks.length) {
      this.resultUnlocks.innerHTML = `<span class="muted">首通解锁</span>${unlocks.join('')}`;
    } else {
      this.resultUnlocks.innerHTML = result.firstClear ? '<span class="muted">已获得首通战功</span>' : '<span class="muted">战功已记录</span>';
    }
    this.resultNextId = result.nextId;
    this.btnResultTour.style.display = result.showTour ? 'inline-flex' : 'none';
    this.btnResultNext.style.display = !result.showTour && result.nextId && win ? 'inline-flex' : 'none';
    this.resultModal.classList.add('show');
    if (win) {
      for (let i = 0; i < stars; i++) {
        setTimeout(() => audio.star(i), 260 + i * 260);
      }
    }
  }
,

  hideResult() {
    this.resultModal.classList.remove('show');
  }

  // 结算战绩行 + 将令双倍按钮（随 tokensDoubled 状态刷新）
,

  refreshResultTokens() {
    const result = this.lastResult;
    if (!result) return;
    if (result.isEndless) {
      const r = result.rewards || (EndlessManager ? EndlessManager.calculateRewards(result) : {});
      result.rewards = r;
      const mul = result.tokensDoubled ? 2 : 1;
      const finalMobao = (r.mobao || 0) * mul;
      const finalTokens = (r.tokens || 0) * mul;
      this.resultStats.innerHTML = `
        <div class="endless-stats-grid">
          <div class="endless-stat-box"><b>${result.waves || 0}</b><span>坚持波次</span></div>
          <div class="endless-stat-box"><b>${result.bossKills || 0}</b><span>斩将首领</span></div>
          <div class="endless-stat-box"><b>${result.kills || 0}</b><span>杀敌人数</span></div>
          <div class="endless-stat-box"><b>${result.baseDamage || 0}</b><span>敌寨创伤</span></div>
        </div>
        <div class="endless-reward-pills">
          <div class="reward-pill mobao"><b>+${finalMobao}</b><span>墨宝</span></div>
          <div class="reward-pill tokens"><b>+${finalTokens}</b><span>将令</span></div>
        </div>
        <div class="endless-reward-desc">
          每波1墨宝1将令 · 每50士兵1墨宝 · 每首领5将令 · 敌寨每5000伤3墨宝1将令
        </div>
      `;
      if (this.btnResultDouble) {
        if (result.tokensDoubled) {
          this.btnResultDouble.style.display = 'inline-flex';
          this.btnResultDouble.disabled = true;
          this.btnResultDouble.textContent = '已双倍领取';
        } else {
          this.btnResultDouble.style.display = 'inline-flex';
          this.btnResultDouble.disabled = false;
          this.btnResultDouble.textContent = '看广告 · 双倍领取墨宝将令';
        }
      }
      return;
    }
    const win = result.win;
    const mul = result.tokensDoubled ? 2 : 1;
    const tokensShown = result.tokensGain ? result.tokensGain * mul : 0;
    const mobaoShown = result.mobaoGain ? result.mobaoGain * mul : 0;
    this.resultStats.innerHTML = `
      <div><b>${win ? `+${result.totalGain}` : '0'}</b>战功</div>
      <div><b>${Math.round((result.baseRatio || 0) * 100)}%</b>帅帐</div>
      <div><b>${fmtTime(result.time)}</b>用时</div>
      <div><b>${result.kills || 0}</b>击杀</div>
      ${mobaoShown ? `<div class="token-cell" style="color:#c9a25e;"><b>+${mobaoShown}</b>墨宝</div>` : ''}
      ${tokensShown ? `<div class="token-cell"><b>+${tokensShown}</b>将令</div>` : ''}
      ${result.suppliesGain ? `<div class="token-cell"><b>+${result.suppliesGain}</b>军需</div>` : ''}
    `;
    const canDouble = (result.tokensGain || result.mobaoGain) && !result.tokensDoubled;
    if (canDouble) {
      this.btnResultDouble.style.display = 'inline-flex';
      this.btnResultDouble.disabled = false;
      this.btnResultDouble.textContent = '看广告 · 奖励双倍';
    } else if (result.tokensDoubled) {
      this.btnResultDouble.style.display = 'inline-flex';
      this.btnResultDouble.disabled = true;
      this.btnResultDouble.textContent = '已双倍领取';
    } else {
      this.btnResultDouble.style.display = 'none';
    }
  }

  // ---------------- 祈将台（#8，design §11.4） ----------------
,
  // ---------------- 2.2 波次时间轴 ----------------
  setupWaveTimeline(battle) {
    if (!this.waveTimeline) return;
    this.waveTimeline.innerHTML = '';
    this.waveTimeline.classList.remove('expanded');
    this.waveTimeline.onclick = () => {
      this.waveTimeline.classList.toggle('expanded');
    };
    const isFog = battle.level.weather === 'fog';
    this.waveTimeline.classList.toggle('is-fog', isFog);

    if (!this._waveTimelineHintShown) {
      this._waveTimelineHintShown = true;
      this.waveTimeline.classList.add('first-hint');
      setTimeout(() => {
        if (this.waveTimeline) this.waveTimeline.classList.remove('first-hint');
      }, 1500);
    }
  },

  updateWaveTimeline(battle) {
    if (!this.waveTimeline || !battle || !battle.level) return;
    if (battle.isEndless) {
      this.waveTimeline.innerHTML = '';
      this.waveTimeline.classList.remove('has-waves');
      return;
    }
    const waves = battle.level.waves || [];
    const isFog = battle.level.weather === 'fog';
    const myDecks = battle.deckUnits || [];

    // 筛选未来波次
    const timeMap = new Map();
    for (let i = 0; i < waves.length; i++) {
      const w = waves[i];
      if (w.t > battle.time) {
        if (!timeMap.has(w.t)) {
          timeMap.set(w.t, {
            idx: i + 1,
            t: w.t,
            label: w.label || '',
            units: [],
            isBoss: !!w.isBoss || (battle.level.boss && i === waves.length - 1),
            isFinal: i === waves.length - 1,
          });
        }
        const entry = timeMap.get(w.t);
        if (w.isBoss) entry.isBoss = true;
        for (const u of (w.units || [])) {
          const exist = entry.units.find((x) => x.type === u.type);
          if (exist) exist.count += u.count;
          else entry.units.push({ type: u.type, count: u.count });
        }
      }
    }

    const list = Array.from(timeMap.values()).sort((a, b) => a.t - b.t);
    const maxShow = isFog ? 1 : 2;
    const displayWaves = list.slice(0, maxShow);

    if (displayWaves.length === 0) {
      if (battle.boss && battle.boss.alive) {
        this.waveTimeline.innerHTML = '<span class="wave-item wave-boss">首领决战</span>';
      } else {
        this.waveTimeline.innerHTML = '<span class="wave-item wave-cleared-text">扫荡残军</span>';
      }
      return;
    }

    let html = '';
    for (let i = 0; i < displayWaves.length; i++) {
      const w = displayWaves[i];
      const rem = Math.max(0, Math.ceil(w.t - battle.time));
      const isWarning = rem <= 10;
      const isBoss = w.isBoss;
      const isFinal = w.isFinal;

      let itemClass = 'wave-item';
      if (i === 0) itemClass += ' wave-next';
      if (isWarning) itemClass += ' wave-warning';
      if (isBoss) itemClass += ' wave-boss';
      if (isFinal) itemClass += ' wave-final';

      let chipsHtml = '';
      for (const u of w.units) {
        const unitData = getUnit(u.type) || { id: u.type, name: u.type };
        let dotClass = '';
        let dotTitle = '';

        for (const myU of myDecks) {
          const m = getCounterMatch(myU, unitData);
          if (m && m.attacker === myU.id) {
            dotClass = 'dot-gold';
            dotTitle = `我方【${myU.name}】克制【${unitData.name}】`;
            break;
          }
        }
        if (!dotClass) {
          for (const myU of myDecks) {
            const m = getCounterMatch(unitData, myU);
            if (m && m.attacker === unitData.id) {
              dotClass = 'dot-red';
              dotTitle = `敌方【${unitData.name}】克制我方【${myU.name}】`;
              break;
            }
          }
        }

        const thumb = this.unitThumb(unitData);
        const countStr = isFog ? '?' : `×${u.count}`;
        const dotHtml = dotClass ? `<span class="wave-unit-dot ${dotClass}" title="${dotTitle}"></span>` : '';

        chipsHtml += `
          <div class="wave-unit-chip" style="background-image:url('${thumb}')" title="${unitData.name}${dotTitle ? ' · ' + dotTitle : ''}">
            ${dotHtml}
            <span class="wave-unit-count">${countStr}</span>
          </div>
        `;
      }

      const badge = isBoss ? '<span class="wave-badge badge-boss">首领</span>' : isFinal ? '<span class="wave-badge badge-final">决战</span>' : '';

      html += `
        <div class="${itemClass}">
          ${badge}
          <span class="wave-timer">${rem}s</span>
          <div class="wave-units">${chipsHtml}</div>
        </div>
      `;
    }

    this.waveTimeline.innerHTML = html;
    if (html.trim()) { this.waveTimeline.classList.add('has-waves'); } else { this.waveTimeline.classList.remove('has-waves'); }
  },

  // ---------------- 2.1.1 卡面长按同源克制浮层 ----------------
  showCardCounterTip(unit, anchorEl, battle) {
    this.hideCardCounterTip();
    const tip = document.createElement('div');
    tip.className = 'card-counter-tip';
    tip.id = 'card-counter-tip';

    const strong = strongOf(unit);
    const weak = weakOf(unit);

    // 检查本关敌军中是否有此卡克制的目标
    const waves = battle.level.waves || [];
    const enemyIds = new Set();
    for (const w of waves) {
      for (const u of (w.units || [])) enemyIds.add(u.type);
    }
    const enemiesCountered = [];
    for (const eid of enemyIds) {
      const eu = getUnit(eid);
      if (eu && getCounterMatch(unit, eu)) {
        enemiesCountered.push(eu.name);
      }
    }

    let strongText = strong.length ? strong.map(s => s.name).join('、') : '无特殊';
    let weakText = weak.length ? weak.map(w => w.name).join('、') : '无特殊';
    let targetText = enemiesCountered.length ? `【本关克制】${enemiesCountered.join('、')}` : '本关暂无明确克制目标';

    tip.innerHTML = `
      <div style="font-weight:bold;margin-bottom:4px;color:#8c1e14">${unit.name} · 克制战报</div>
      <div style="color:#2e8b57;margin-bottom:2px">● 克制：${strongText}</div>
      <div style="color:#b23a2f;margin-bottom:4px">● 被克：${weakText}</div>
      <div style="font-size:11px;color:#555;border-top:1px dashed #ccc;padding-top:4px">${targetText}</div>
    `;

    document.body.appendChild(tip);
    this._activeTip = tip;
  },

  hideCardCounterTip() {
    if (this._activeTip) {
      this._activeTip.remove();
      this._activeTip = null;
    }
    const old = document.getElementById('card-counter-tip');
    if (old) old.remove();
  },

  // ---------------- 2.6 失败复盘系统 ----------------
  createDefeatReview(battle, result) {
    if (!battle || !battle.stats) return '';
    const stats = battle.stats;
    const unitDamage = stats.unitDamage || {};
    let totalDmg = 0;
    for (const dmg of Object.values(unitDamage)) totalDmg += dmg;

    // 1. 各兵种伤害占比横向条形统计
    const bars = [];
    for (const [uid, dmg] of Object.entries(unitDamage)) {
      const u = getUnit(uid);
      const name = u ? u.name : uid;
      const ratio = totalDmg > 0 ? (dmg / totalDmg) : 0;
      bars.push({ uid, name, dmg, pct: Math.round(ratio * 100) });
    }
    bars.sort((a, b) => b.dmg - a.dmg);

    // 补充未造成伤害但上阵了的卡
    for (const deckU of (battle.deckUnits || [])) {
      if (!bars.find(b => b.uid === deckU.id)) {
        bars.push({ uid: deckU.id, name: deckU.name, dmg: 0, pct: 0 });
      }
    }

    const lowestCard = bars.length > 0 ? bars[bars.length - 1] : null;
    const lowestUid = lowestCard ? lowestCard.uid : null;

    // 2. 掉血最多波次
    const damageByWave = stats.damageTakenByWave || {};
    let worstWaveIdx = 0;
    let maxDmgTaken = 0;
    for (const [wIdx, dmg] of Object.entries(damageByWave)) {
      if (dmg > maxDmgTaken) {
        maxDmgTaken = dmg;
        worstWaveIdx = parseInt(wIdx, 10);
      }
    }

    const waves = battle.level.waves || [];
    const worstWave = waves[worstWaveIdx] || waves[0];
    const waveName = worstWave ? (worstWave.label || `第 ${worstWaveIdx + 1} 波`) : '交火期';
    const waveEnemies = worstWave && worstWave.units ? worstWave.units.map(u => {
      const eu = getUnit(u.type);
      return `${eu ? eu.name : u.type}×${u.count}`;
    }).join('、') : '敌军精锐';

    // 3. 智能换卡推荐
    let recommendUid = 'spearman';
    let adviceText = '敌军攻势凶猛，战线受挫。建议强化防线重装迎敌。';

    if (worstWave && worstWave.units) {
      for (const u of worstWave.units) {
        if (u.type === 'shield') {
          recommendUid = 'modao';
          adviceText = `这局敌方盾牌坚固，受到远程减免；下次带上【陌刀】，可快速碎盾破甲！`;
          break;
        } else if (u.type === 'lightcav') {
          recommendUid = 'spearman';
          adviceText = `敌方骑兵冲锋伤害极高；带上【长枪兵】拒马反制，首击可造成毁灭打击！`;
          break;
        } else if (u.type === 'archer' || u.type === 'repeater') {
          recommendUid = 'lightcav';
          adviceText = `敌方后排弓弩输出严重压制前线；换上【轻骑兵】迅速冲脸切杀后排！`;
          break;
        }
      }
    }

    const recUnit = getUnit(recommendUid);
    const recName = recUnit ? recUnit.name : recommendUid;

    let barsHtml = '';
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const isLowest = i === bars.length - 1 && bars.length > 1;
      barsHtml += `
        <div class="review-bar-row">
          <span class="review-bar-name" title="${b.name}">${b.name}</span>
          <div class="review-bar-track">
            <div class="review-bar-fill ${isLowest ? 'highlight' : ''}" style="width:${b.pct}%"></div>
          </div>
          <span class="review-bar-pct">${b.pct}%</span>
        </div>
      `;
    }

    this._pendingSwap = { from: lowestUid, to: recommendUid };

    return `
      <div class="defeat-review-box">
        <div class="review-title">
          <span>战局复盘 · 输在哪</span>
          <span style="font-size:10px;font-weight:normal;color:#777">本场兵种输出占比</span>
        </div>
        <div class="review-bars">${barsHtml}</div>
        <div class="review-worst-wave">
          <b>承伤最高：${waveName}</b>（敌军：${waveEnemies}）
        </div>
        <div class="review-advice">${adviceText}</div>
        <div class="review-actions">
          <button class="btn-review-swap" id="btn-review-swap">
            一键换用【${recName}】并再战
          </button>
        </div>
      </div>
    `;
  },

  bindDefeatReviewEvents(battle) {
    const swapBtn = document.getElementById('btn-review-swap');
    if (!swapBtn) return;
    swapBtn.onclick = () => {
      if (this._pendingSwap && this.app) {
        const { from, to } = this._pendingSwap;
        // 在 workingDeck 中替换
        const deck = this.app.save.decks[this.app.save.activeDeck] || this.workingDeck;
        const idx = deck.indexOf(from);
        if (idx !== -1) {
          deck[idx] = to;
        } else if (deck.length < 6) {
          deck.push(to);
        } else {
          deck[0] = to;
        }
        this.app.saveDeck();
        this.hideResult();
        this.app.startBattle(battle.level.id);
      }
    };
  },

};
