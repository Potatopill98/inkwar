// 界面 · 图鉴/英雄详情/排行榜/设置
import { specialText } from './card-text.js?v=1.93';
import { TAG_NAMES } from './helpers.js?v=1.93';
import { UNITS, RARITY, getUnit } from '../data/units.js?v=1.93';
import { HEROES, getHero, getHeroUpgradeCost, getHeroPermMultiplier, getHeroStats } from '../data/heroes.js?v=1.93';
import { audio } from '../audio.js?v=1.93';

export const uiCodex = {
  openCodex(tab = 'units') {
    this.codexTab = tab;
    this.renderCodex();
    this.showScreen('screen-codex');
  }
,

  renderCodex() {
    const mobaoEl = document.getElementById('val-codex-mobao');
    if (mobaoEl) mobaoEl.textContent = this.app.save.mobao || 0;
    const isHero = this.codexTab === 'heroes';
    this.tabUnits.classList.toggle('active', !isHero);
    this.tabHeroes.classList.toggle('active', isHero);
    this.codexGrid.innerHTML = '';
    const save = this.app.save;
    if (!isHero) {
      const list = [...UNITS].sort((a, b) => (a.unlockLevel || 99) - (b.unlockLevel || 99));
      for (const unit of list) {
        const unlocked = save.unlocks.units.includes(unit.id);
        const card = this.codexCard(unit, 'unit', unlocked, unit.name, unit.cost, unit.rarity);
        card.onclick = () => {
          audio.click();
          this.codexSelected.units = unit.id;
          this.renderCodex();
        };
        if (this.codexSelected.units === unit.id) card.classList.add('selected');
        this.codexGrid.appendChild(card);
      }
      this.renderUnitDetail(this.codexSelected.units || 'swordsman');
    } else {
      for (const hero of HEROES) {
        const unlocked = save.unlocks.heroes.includes(hero.id);
        const card = this.codexCard(hero, 'hero', unlocked, hero.name, null, null);
        card.onclick = () => {
          audio.click();
          this.codexSelected.heroes = hero.id;
          this.renderCodex();
        };
        if (this.codexSelected.heroes === hero.id) card.classList.add('selected');
        this.codexGrid.appendChild(card);
      }
      this.renderHeroDetail(this.codexSelected.heroes || 'zhaoyun');
    }
  }
,

  codexCard(item, type, unlocked, name, cost, rarity) {
    const card = document.createElement('button');
    card.className = 'unit-card';
    if (!unlocked) card.classList.add('locked');
    if (type === 'unit') {
      card.classList.add(`rarity-${rarity}`);
      card.innerHTML = `
        <span class="uc-art" style="background-image:url('${this.unitThumb(item)}')"></span>
        <span class="uc-cost">${cost}</span>
        <span class="uc-rarity"></span>
        <span class="uc-name">${name}</span>
        ${unlocked ? '' : `<span class="uc-lock">第 ${item.unlockLevel} 关解锁</span>`}
      `;
    } else {
      card.classList.add('rarity-legendary');
      card.innerHTML = `
        <span class="uc-art" style="background-image:url('${unlocked ? this.heroThumb(item) : this.heroThumb(item)}')"></span>
        <span class="uc-rarity"></span>
        <span class="uc-name">${name}</span>
        ${unlocked ? '' : `<span class="uc-lock">${item.unlockLevel == null ? '祈将获得' : `第 ${item.unlockLevel} 关解锁`}</span>`}
      `;
    }
    return card;
  }
,

  renderUnitDetail(id) {
    const unit = getUnit(id);
    const unlocked = this.app.save.unlocks.units.includes(unit.id);
    const rarity = RARITY[unit.rarity];
    const tags = unit.tags.map((t) => TAG_NAMES[t] || t).join(' · ');
    const stats = unit.spell
      ? [['费用', unit.cost, 12], ['冷却', unit.cooldown, 60], ['范围', (unit.spellFx && unit.spellFx.radius) || 0, 8]]
      : [
        ['生命', unit.hp, 1000], ['攻击', unit.atk, 120], ['护甲', unit.armor, 35],
        ['射程', unit.range, 11], ['速度', unit.speed, 3.4], ['费用', unit.cost, 8],
      ];
    this.codexDetail.innerHTML = `
      <div class="cd-art" style="background-image:url('${this.unitThumb(unit)}')"></div>
      <div class="cd-info">
        <div class="cd-kicker">${rarity.name} · ${unit.role}${unlocked ? '' : ' · 未解锁'}</div>
        <div class="cd-name">${unit.name}</div>
        <div class="cd-tag">${tags}</div>
        <p class="cd-desc">${unit.desc}</p>
        <div class="cd-special"><b>${unit.spell ? '术法特性' : '兵种特性'}：</b>${specialText(unit)}</div>
        ${this.counterChips(unit)}
        ${stats.map(([name, val, max]) => `
          <div class="stat-row">
            <span class="sr-name">${name}</span>
            <span class="sr-track"><span class="sr-fill" style="width:${Math.min(100, (val / max) * 100)}%"></span></span>
            <span class="sr-val">${val}</span>
          </div>
        `).join('')}
        <div class="skill-block">
          <h4>解锁与节奏</h4>
          <p>${unlocked ? '已解锁，可在战前卡组中选用。' : `第 ${unit.unlockLevel} 关首通解锁。`} 冷却 ${unit.cooldown}s，费用 ${unit.cost} 军令。</p>
        </div>
      </div>
    `;
  }
,

  renderHeroDetail(id) {
    const hero = getHero(id);
    const unlocked = this.app.save.unlocks.heroes.includes(hero.id);
    const mastery = (this.app.save.hero.mastery && this.app.save.hero.mastery[hero.id]) || 1;
    const permLevel = Math.max(1, Math.min(11, Math.floor(Number(this.app.save.hero.levels?.[hero.id]) || 1)));
    const stats = getHeroStats(hero.id, permLevel, this.app.save.settings.heroTuning);
    const cost = getHeroUpgradeCost(permLevel);
    const bonusPct = (permLevel - 1) * 10;
    this.codexDetail.innerHTML = `
      <div class="cd-art hero-grand-art" style="background-image:url('${this.heroThumb(hero)}')">
        <div class="cd-seal-stamp">${hero.dynasty || '中华名将'}</div>
        <div class="cd-vfx-badge">2000+面高精特效 · 水墨拖尾</div>
      </div>
      <div class="cd-info">
        <div class="cd-header-row">
          <div class="cd-kicker"><span class="dynasty-badge">${hero.dynasty || '青史名将'}</span> 英雄 · ${hero.title}${unlocked ? '' : ' · 未解锁'}</div>
          <div class="cd-tactical-tag">⚔️ ${hero.tacticalStyle || '统御万军'}</div>
        </div>
        <div class="cd-name">${hero.name} <span class="cd-seal-small">印</span></div>
        <div class="cd-tag-row">
          <span class="cd-tag">${unlocked ? `实战阶位 Lv.${permLevel}/11` : (hero.unlockLevel == null ? '在祈将台召唤获得' : `第 ${hero.unlockLevel} 关解锁`)}</span>
          <span class="cd-archetype-badge">原型 · ${hero.archetype || '通用'}</span>
        </div>

        ${unlocked ? `
          <div class="hero-upgrade-card">
            <div class="hero-upgrade-header">
              <span class="hero-level-badge">永久阶位 <b>Lv.${permLevel}</b> / 11</span>
              <span class="hero-bonus-badge">荒野成长 全属性永久 +${bonusPct}%</span>
            </div>
            <div class="hero-milestones-row" style="display:flex; gap:6px; margin: 8px 0; font-size: 11px;">
              <span class="milestone-badge" style="padding: 2px 6px; border-radius: 4px; background: rgba(180,83,9,0.15); color: #b45309;">🌟 Lv.1 主动大招</span>
              <span class="milestone-badge" style="padding: 2px 6px; border-radius: 4px; background: ${permLevel >= 3 ? 'rgba(59,130,246,0.15); color: #2563eb;' : 'rgba(100,116,139,0.12); color: #94a3b8;'}">🛡️ Lv.3 专属被动 ${permLevel >= 3 ? '✓' : '🔒'}</span>
              <span class="milestone-badge" style="padding: 2px 6px; border-radius: 4px; background: ${permLevel >= 7 ? 'rgba(16,185,129,0.15); color: #059669;' : 'rgba(100,116,139,0.12); color: #94a3b8;'}">⚡ Lv.7 专属技能 (冷却20s·不限次数) ${permLevel >= 7 ? '✓' : '🔒'}</span>
              <span class="milestone-badge" style="padding: 2px 6px; border-radius: 4px; background: ${permLevel >= 11 ? 'rgba(234,179,8,0.2); color: #ca8a04;' : 'rgba(100,116,139,0.12); color: #94a3b8;'}">👑 Lv.11 战神 ${permLevel >= 11 ? '✓' : ''}</span>
            </div>
            <div class="hero-stats-row">
              <span>❤️ 生命 <b>${stats.baseMaxHp}</b></span>
              <span>⚔️ 攻击 <b>${stats.baseAtk}</b></span>
              <span>🛡️ 护甲 <b>${stats.baseArmor}</b></span>
              <span>⚡ 回血 <b>${(stats.regenRate * 100).toFixed(1)}%/s</b></span>
            </div>
            ${permLevel < 11 ? `
              <button class="btn btn-seal btn-hero-upgrade" id="btn-hero-upgrade">
                晋升至 Lv.${permLevel + 1} (消耗 ${cost} 墨宝)
              </button>
            ` : `
              <div class="hero-max-badge">👑 已达最高阶 (满级 11 级 满阶战神)</div>
            `}
          </div>
        ` : ''}

        <p class="cd-desc">“${hero.quote}”</p>

        <!-- 史实考据与外貌兵器三卷合一 -->
        <div class="cd-lore-section">
          <div class="cd-lore-block">
            <div class="cd-lore-title"><span class="lore-icon">📜</span> 青史昭昭 · 纪传列功</div>
            <p class="cd-lore-content">${hero.historicalRecord || '青史长卷，威震华夏。'}</p>
          </div>
          <div class="cd-lore-block">
            <div class="cd-lore-title"><span class="lore-icon">🛡️</span> 丹青铁甲 · 古貌形制</div>
            <p class="cd-lore-content">${hero.appearanceRef || '正史考据身长容貌与战铠形制。'}</p>
          </div>
          <div class="cd-lore-block">
            <div class="cd-lore-title"><span class="lore-icon">🗡️</span> 传世神兵 · 器械考证</div>
            <p class="cd-lore-content">${hero.weaponHistory || '历代名工锻打，传世重刃。'}</p>
          </div>
        </div>

        <div class="skill-block active-skill-block">
          <h4>${hero.active.name}<span class="skill-type">主动绝技 (Lv.1) · 冷却 ${hero.active.cooldown}s</span><span class="vfx-tag">普攻充能</span></h4>
          <p>${hero.active.desc}</p>
        </div>
        <div class="skill-block">
          <h4>${hero.passive.name}<span class="skill-type">专属被动 (${hero.passive.unlockLevel || 3}级解锁)</span></h4>
          <p>${hero.passive.desc}</p>
        </div>
        ${hero.gadget ? `
        <div class="skill-block gadget-skill-block" style="border-left: 3px solid #10b981; padding-left: 8px;">
          <h4>${hero.gadget.name}<span class="skill-type">专属技能 (${hero.gadget.unlockLevel || 7}级解锁 · 冷却20s·不限次数)</span><span class="vfx-tag" style="background: rgba(16,185,129,0.15); color: #047857;">技能</span></h4>
          <p>${hero.gadget.desc}</p>
        </div>
        ` : ''}
        <div class="skill-block tip-block">
          <h4>兵家韬略 · 指挥要诀</h4>
          <p>主将可在战场自由部署走位迎敌，脱战自动快速回血。实战中消灭敌军可晋升战阵等级（最高 Lv.5），局外使用墨宝升级（最高 Lv.11）可永久强化各项基础属性并解锁被动与妙具。</p>
        </div>
      </div>
    `;

    if (unlocked && permLevel < 11) {
      const btn = this.codexDetail.querySelector('#btn-hero-upgrade');
      if (btn) {
        btn.onclick = () => {
          const res = this.app.upgradeHeroOutside(hero.id);
          if (res.success) {
            audio.gong(null, 1.2);
            this.toast(`🎉 ${hero.name} 成功晋升至 Lv.${res.newLevel}！基础属性提升 10%！`);
            this.renderCodex();
            this.renderHeroDetail(hero.id);
          } else {
            audio.error();
            this.toast(res.reason || '墨宝不足');
          }
        };
      }
    }
  }

  // ---------------- 排行榜 / 设置 ----------------
,

  refreshLeaderboard() {
    const p = this.app.save.progress;
    this.lbScore.textContent = p.totalScore || 0;
    this.lbStats.innerHTML = `
      <span><b>${p.clearedCount || 0}</b>通关</span>
      <span><b>${p.totalStars || 0}</b>星数</span>
      <span><b>${this.app.save.leaderboardBest || 0}</b>历史最佳</span>
    `;
    this.lbNote.textContent = this.app.platform.hasLeaderboard
      ? '排行榜由 TapTap 提供，取历史最佳战功'
      : '当前为浏览器预览环境，TapTap 客户端内可查看全服排行';
  }
,

  syncSettingsUI() {
    const s = this.app.save.settings;
    this.switchMusic.classList.toggle('on', !!s.music);
    this.switchSfx.classList.toggle('on', !!s.sfx);
    this.qualityBtns.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset.q === (s.quality || 'auto'));
    });
    this.settingsCloud.textContent = this.app.cloudStatusText();

    const ht = s.heroTuning || { maxHp: 1200, atk: 65, armor: 10, regenRate: 0.04, aggroRadius: 2.85 };
    if (this.sliderHeroHp) this.sliderHeroHp.value = ht.maxHp;
    if (this.valHeroHp) this.valHeroHp.textContent = ht.maxHp;
    if (this.sliderHeroAtk) this.sliderHeroAtk.value = ht.atk;
    if (this.valHeroAtk) this.valHeroAtk.textContent = ht.atk;
    if (this.sliderHeroArmor) this.sliderHeroArmor.value = ht.armor;
    if (this.valHeroArmor) this.valHeroArmor.textContent = ht.armor;
    if (this.sliderHeroRegen) this.sliderHeroRegen.value = (ht.regenRate * 100).toFixed(1);
    if (this.valHeroRegen) this.valHeroRegen.textContent = `${(ht.regenRate * 100).toFixed(1)}%/s`;
    if (this.sliderHeroAggro) this.sliderHeroAggro.value = ht.aggroRadius;
    if (this.valHeroAggro) this.valHeroAggro.textContent = `${ht.aggroRadius}m`;
  }
,

  refreshSettings() {
    this.syncSettingsUI();
  }
,
};
