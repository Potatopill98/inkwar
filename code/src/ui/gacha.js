// 界面 · 点兵点将：点将池（祈愿、将令、英雄召唤）/ 点兵池（限定兵种点募）
import { GACHA_HEROES } from '../data/heroes.js?v=1.93';
import { GACHA_UNITS } from '../data/units.js?v=1.93';
import { audio } from '../audio.js?v=1.93';

export const uiGacha = {
  openGacha() {
    this.gachaTab = this.gachaTab || 'hero';
    this.renderGacha();
    this.showScreen('screen-gacha');
    this.setGachaTab(this.gachaTab);
  },

  setGachaTab(tab) {
    this.gachaTab = tab === 'unit' ? 'unit' : 'hero';
    if (this.gachaTabs) {
      for (const btn of this.gachaTabs.querySelectorAll('[data-gacha-tab]')) {
        btn.classList.toggle('active', btn.dataset.gachaTab === this.gachaTab);
      }
    }
    const isUnit = this.gachaTab === 'unit';
    if (this.gachaPoolHeroTitle) this.gachaPoolHeroTitle.style.display = isUnit ? 'none' : '';
    if (this.gachaGrid) this.gachaGrid.style.display = isUnit ? 'none' : '';
    if (this.gachaPoolUnitTitle) this.gachaPoolUnitTitle.style.display = isUnit ? '' : 'none';
    if (this.gachaUnitGrid) this.gachaUnitGrid.style.display = isUnit ? '' : 'none';
    audio.click();
  },

  renderGacha() {
    const save = this.app.save;
    const g = this.app.gachaState();
    this.gachaTokens.textContent = save.tokens || 0;
    this.gachaFreeLeft.textContent = g.freeUsed ? 0 : 1;
    this.gachaAdLeft.textContent = Math.max(0, 3 - g.adUsed);
    this.btnGachaFree.disabled = g.freeUsed;
    this.btnGachaAd.disabled = g.adUsed >= 3;
    this.gachaGrid.innerHTML = '';
    const tokens = save.tokens || 0;
    for (const hero of GACHA_HEROES) {
      const owned = save.unlocks.heroes.includes(hero.id);
      const affordable = tokens >= 100;
      const card = document.createElement('div');
      card.className = `gacha-card${owned ? ' owned' : ''}`;
      card.innerHTML = `
        <span class="gc-art" style="background-image:url('${this.heroThumb(hero)}')"></span>
        <span class="gc-name">${hero.name}</span>
        <span class="gc-title">${hero.title}</span>
        <span class="gc-quote">${hero.quote}</span>
        ${owned
          ? '<span class="gc-owned">已在阵中</span>'
          : `<button class="btn btn-sm gc-redeem${affordable ? ' btn-seal' : ' btn-paper'}"${affordable ? '' : ' disabled'}>${affordable ? '召唤 · 100 将令' : '将令不足 · 100'}</button>`}
      `;
      if (!owned) {
        const btn = card.querySelector('.gc-redeem');
        btn.onclick = () => {
          if (this.app.save.tokens < 100) {
            audio.error();
            this.toast(`将令不足，还差 ${100 - (this.app.save.tokens || 0)} 枚`);
            return;
          }
          audio.click();
          this.confirm('以令召将', `以 100 将令召唤「${hero.name} · ${hero.title}」？`, () => {
            if (this.app.redeemHero(hero.id)) {
              this.renderGacha();
              this.refreshHome();
              this.showHeroReveal(hero);
            }
          });
        };
      }
      this.gachaGrid.appendChild(card);
    }
    this.renderGachaUnits();
  },

  // 点兵池：关卡无法获取的限定兵种
  renderGachaUnits() {
    const grid = this.gachaUnitGrid;
    if (!grid) return;
    const save = this.app.save;
    const tokens = save.tokens || 0;
    grid.innerHTML = '';
    for (const unit of GACHA_UNITS) {
      const owned = save.unlocks.units.includes(unit.id);
      const affordable = tokens >= 100;
      const rarityName = unit.rarity === 'legendary' ? '传奇' : (unit.rarity === 'rare' ? '高级' : '普通');
      const card = document.createElement('div');
      card.className = `gacha-card${owned ? ' owned' : ''}`;
      card.innerHTML = `
        <span class="gc-art" style="background-image:url('${this.unitThumb(unit)}')"></span>
        <span class="gc-name">${unit.name}</span>
        <span class="gc-title">${rarityName} · ${unit.role}</span>
        <span class="gc-quote">${unit.cost} 军令 · ${unit.desc}</span>
        ${owned
          ? '<span class="gc-owned">已入兵册</span>'
          : `<button class="btn btn-sm gc-redeem${affordable ? ' btn-seal' : ' btn-paper'}"${affordable ? '' : ' disabled'}>${affordable ? '点募 · 100 将令' : '将令不足 · 100'}</button>`}
      `;
      if (!owned) {
        const btn = card.querySelector('.gc-redeem');
        btn.onclick = () => {
          if (this.app.save.tokens < 100) {
            audio.error();
            this.toast(`将令不足，还差 ${100 - (this.app.save.tokens || 0)} 枚`);
            return;
          }
          audio.click();
          this.confirm('以令点兵', `以 100 将令点募「${unit.name}」入册？`, () => {
            if (this.app.redeemUnit(unit.id)) {
              this.renderGacha();
              this.refreshHome();
              this.showUnitReveal(unit);
            }
          });
        };
      }
      grid.appendChild(card);
    }
  },

  // 点兵入册演出（复用将领揭晓面板）
  showUnitReveal(unit) {
    const rarityName = unit.rarity === 'legendary' ? '传奇' : (unit.rarity === 'rare' ? '高级' : '普通');
    this.revealArt.style.backgroundImage = `url('${this.unitThumb(unit)}')`;
    this.revealName.textContent = unit.name;
    this.revealTitle.textContent = `「${rarityName} · ${unit.role}」`;
    this.revealQuote.textContent = unit.desc;
    this.heroReveal.classList.add('show');
    audio.gong(null, 1.15);
    setTimeout(() => audio.gong(null, 0.85), 620);
  },

  // 获得新英雄演出：墨点炸开 → 光轮展开 → 展卷显名（参考荒野乱斗揭晓节奏）
  showHeroReveal(hero) {
    this.revealArt.style.backgroundImage = `url('${this.heroThumb(hero)}')`;
    this.revealName.textContent = hero.name;
    this.revealTitle.textContent = `「${hero.title}」`;
    this.revealQuote.textContent = hero.quote;
    this.heroReveal.classList.add('show');
    audio.gong(null, 1.15);
    setTimeout(() => audio.gong(null, 0.85), 620);
  },

  hideHeroReveal() {
    this.heroReveal.classList.remove('show');
    audio.click();
  },

  // 墨笔点将抽奖动画 → 落定将令数
  async gachaDraw(isAd) {
    if (this._gachaRolling) return;
    this._gachaRolling = true;
    this.btnGachaFree.disabled = true;
    this.btnGachaAd.disabled = true;
    this.gachaInk.classList.add('rolling');
    this.gachaRollLabel.textContent = '点将中…';
    const rollTimer = setInterval(() => {
      this.gachaRollNum.textContent = 1 + Math.floor(Math.random() * 50);
    }, 70);
    audio.select();
    let n = null;
    try {
      n = await this.app.drawGacha(isAd);
    } finally {
      clearInterval(rollTimer);
      this.gachaInk.classList.remove('rolling');
      this._gachaRolling = false;
    }
    if (n !== null && n !== undefined) {
      this.gachaRollNum.textContent = `+${n}`;
      this.gachaRollLabel.textContent = '将令入账';
      audio.gong(null, 0.9);
      this.toast(`祈愿得 ${n} 将令`);
    } else {
      this.gachaRollNum.textContent = '';
      this.gachaRollLabel.textContent = '墨笔点将';
    }
    this.renderGacha();
  },
};
