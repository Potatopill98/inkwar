const fs = require('fs');
const filePath = 'E:/taptapgame/inkwar/code/src/ui.js';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add new IDs in constructor
const targetIds = `'bounty-footer-hint',
    ];`;

const replacementIds = `'bounty-footer-hint',
      'top-res-supplies', 'top-res-mobao', 'top-res-tokens', 'top-res-tickets', 'btn-top-add-ticket',
      'btn-toggle-bounty-collapse', 'home-bounty-collapsed-bar', 'home-bounty-collapsed-summary', 'btn-expand-bounty', 'btn-collapsed-claim-all',
      'endless-home-badge', 'endless-home-lock', 'endless-ticket-modal', 'btn-close-ticket-modal', 'btn-ticket-cancel', 'btn-ticket-watch-ad',
      'endless-unlock-modal', 'btn-go-endless-first',
      'bounty-refresh-bar', 'bounty-refresh-count', 'btn-bounty-ad-refresh', 'btn-modal-claim-all-double',
      'reward-showcase-modal', 'reward-showcase-title', 'reward-showcase-sub', 'reward-showcase-seal', 'reward-items-container', 'reward-double-badge', 'btn-claim-reward-normal', 'btn-claim-reward-double',
    ];`;

if (content.includes(targetIds)) {
  content = content.replace(targetIds, replacementIds);
  console.log('1. Successfully added IDs in UI constructor');
} else {
  console.error('Failed to find targetIds');
}

// 2. Enhance bindStatic with ticket modal, collapse toggles, and endless gate
const targetBindEndless = `    const triggerEndless = () => {
      const saved = EndlessManager.loadProgress();
      if (saved && saved.wave >= 1) {
        this.confirm(
          '恢复墨影试炼进度',
          \`检测到有暂存的试炼战局（第 \${saved.wave} 波，击杀 \${saved.kills || 0} 敌）。\\n点击“确定”继续挑战，点击“取消”重新开启新试炼。\`,
          () => {
            this.app.startEndlessMode(true);
          }
        );
        const cancelBtn = this.$('btn-confirm-cancel');
        if (cancelBtn) {
          const oldCancel = cancelBtn.onclick;
          cancelBtn.onclick = () => {
            EndlessManager.clearProgress();
            this.hideConfirm();
            this.app.startEndlessMode(false);
            cancelBtn.onclick = oldCancel;
          };
        }
      } else {
        this.app.startEndlessMode(false);
      }
    };
    this.triggerEndless = triggerEndless;

    const btnHomeEndless = document.getElementById('btn-home-endless');
    if (btnHomeEndless) btnHomeEndless.onclick = triggerEndless;
    const btnOpenEndless = document.getElementById('btn-open-endless');
    if (btnOpenEndless) btnOpenEndless.onclick = triggerEndless;`;

const replacementBindEndless = `    const triggerEndless = () => {
      // 1. 检测第20关通关解锁条件
      if (!EndlessManager.isUnlocked(this.app.save)) {
        this.toast('🔒 尚未解锁：需先荡平主线前20关，方可踏入墨影无尽试炼！');
        return;
      }
      // 2. 检测门票与每日试炼次数
      const tickets = EndlessManager.getRemainingTickets(this.app.save);
      if (tickets <= 0) {
        this.openEndlessTicketModal();
        return;
      }

      const saved = EndlessManager.loadProgress();
      if (saved && saved.wave >= 1) {
        this.confirm(
          '恢复墨影试炼进度',
          \`检测到有暂存的试炼战局（第 \${saved.wave} 波，击杀 \${saved.kills || 0} 敌）。\\n点击“确定”继续挑战，点击“取消”重新开启新试炼。\`,
          () => {
            this.app.startEndlessMode(true);
          }
        );
        const cancelBtn = this.$('btn-confirm-cancel');
        if (cancelBtn) {
          const oldCancel = cancelBtn.onclick;
          cancelBtn.onclick = () => {
            EndlessManager.clearProgress();
            this.hideConfirm();
            this.app.startEndlessMode(false);
            cancelBtn.onclick = oldCancel;
          };
        }
      } else {
        this.app.startEndlessMode(false);
      }
    };
    this.triggerEndless = triggerEndless;

    const btnHomeEndless = document.getElementById('btn-home-endless');
    if (btnHomeEndless) btnHomeEndless.onclick = triggerEndless;
    const btnOpenEndless = document.getElementById('btn-open-endless');
    if (btnOpenEndless) btnOpenEndless.onclick = triggerEndless;

    // 顶部加号补门票
    if (this.btnTopAddTicket) {
      this.btnTopAddTicket.onclick = (e) => {
        e.stopPropagation();
        this.openEndlessTicketModal();
      };
    }
    const pillTickets = document.getElementById('pill-tickets');
    if (pillTickets) {
      pillTickets.onclick = () => this.openEndlessTicketModal();
    }

    // 悬赏折叠/展开按钮绑定
    if (this.btnToggleBountyCollapse) {
      this.btnToggleBountyCollapse.onclick = () => this.toggleHomeBountyCollapse();
    }
    if (this.btnExpandBounty) {
      this.btnExpandBounty.onclick = () => this.toggleHomeBountyCollapse(false);
    }
    if (this.btnCollapsedClaimAll) {
      this.btnCollapsedClaimAll.onclick = () => this.app.claimAllBounties();
    }

    // 门票弹窗关闭与看广告补票
    if (this.btnCloseTicketModal) this.btnCloseTicketModal.onclick = () => this.hideEndlessTicketModal();
    if (this.btnTicketCancel) this.btnTicketCancel.onclick = () => this.hideEndlessTicketModal();
    if (this.btnTicketWatchAd) {
      this.btnTicketWatchAd.onclick = async () => {
        const ok = await this.app.platform.showAdWithFallback(
          'endless_ticket',
          () => {
            EndlessManager.addAdTicket(this.app.save);
            this.app.persist();
            this.toast('🎉 观摩战阵完毕，已补充 1 次墨影试炼门票！');
            this.hideEndlessTicketModal();
            this.refreshHome();
            this.app.startEndlessMode(false);
          },
          () => {
            EndlessManager.addAdTicket(this.app.save);
            this.app.persist();
            this.toast('已为您发放保底试炼门票！');
            this.hideEndlessTicketModal();
            this.refreshHome();
            this.app.startEndlessMode(false);
          }
        );
      };
    }

    // 20关通关解锁弹窗
    if (this.btnGoEndlessFirst) {
      this.btnGoEndlessFirst.onclick = () => {
        if (this.endlessUnlockModal) this.endlessUnlockModal.style.display = 'none';
        triggerEndless();
      };
    }`;

if (content.includes(targetBindEndless)) {
  content = content.replace(targetBindEndless, replacementBindEndless);
  console.log('2. Successfully updated bindStatic with Endless & Ticket handlers');
} else {
  console.error('Failed to find targetBindEndless');
}

// 3. Update refreshHome to sync top resources and endless button state
const targetRefreshHome = `    this.syncSettingsUI();
    this.renderHomeBounties();
  }`;

const replacementRefreshHome = `    // 荒野乱斗级顶部常驻资源状态栏同步
    if (this.topResSupplies) this.topResSupplies.textContent = save.camp?.supplies || 0;
    if (this.topResMobao) this.topResMobao.textContent = save.mobao || 0;
    if (this.topResTokens) this.topResTokens.textContent = save.tokens || 0;
    if (this.topResTickets) {
      const tickets = EndlessManager.getRemainingTickets(save);
      this.topResTickets.textContent = \`\${tickets}/2\`;
    }

    // 无尽模式入口按钮状态同步
    const isEndlessOpen = EndlessManager.isUnlocked(save);
    const tickets = EndlessManager.getRemainingTickets(save);
    if (this.endlessHomeLock) {
      this.endlessHomeLock.style.display = isEndlessOpen ? 'none' : 'inline-block';
    }
    if (this.endlessHomeBadge) {
      this.endlessHomeBadge.style.display = isEndlessOpen ? 'inline-block' : 'none';
      this.endlessHomeBadge.textContent = tickets > 0 ? \`免 \${tickets}次\` : '0次(补)';
      this.endlessHomeBadge.style.background = tickets > 0 ? '#22c55e' : '#f59e0b';
    }

    this.syncSettingsUI();
    this.renderHomeBounties();
  }`;

if (content.includes(targetRefreshHome)) {
  content = content.replace(targetRefreshHome, replacementRefreshHome);
  console.log('3. Successfully updated refreshHome with top resources and endless state');
} else {
  console.error('Failed to find targetRefreshHome');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished writing base changes to ui.js');
