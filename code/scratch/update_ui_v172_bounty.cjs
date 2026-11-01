const fs = require('fs');
const filePath = 'E:/taptapgame/inkwar/code/src/ui.js';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. 替换 renderHomeBounties 支持折叠与双倍领赏
const targetRenderHomeBounties = `  renderHomeBounties() {
    if (!this.homeBountyList) return;
    const save = this.app.save;
    const summary = BountyManager.getSummary(save);

    if (this.homeBountySummary) {
      this.homeBountySummary.textContent = \`日赏 \${summary.dailyCompleted}/\${summary.dailyTotal} · 周赏 \${summary.weeklyCompleted}/\${summary.weeklyTotal}\`;
    }

    if (this.homeBountyBadge) {
      if (summary.unclaimedCount > 0) {
        this.homeBountyBadge.style.display = 'inline-flex';
        this.homeBountyBadge.textContent = summary.unclaimedCount;
        this.homeBountyBadge.classList.add('pulse');
      } else {
        this.homeBountyBadge.style.display = 'none';
        this.homeBountyBadge.classList.remove('pulse');
      }
    }

    if (this.btnHomeClaimAll) {
      if (summary.unclaimedCount > 0) {
        this.btnHomeClaimAll.style.display = 'inline-flex';
        this.btnHomeClaimAll.textContent = \`一键领赏 (\${summary.unclaimedCount})\`;
      } else {
        this.btnHomeClaimAll.style.display = 'none';
      }
    }

    // 优先展示可领取的，其次按进度倒序
    const all = [...(summary.daily || []), ...(summary.weekly || [])];
    all.sort((a, b) => {
      const aReady = !a.claimed && a.current >= a.target;
      const bReady = !b.claimed && b.current >= b.target;
      if (aReady !== bReady) return aReady ? -1 : 1;
      if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
      const aRatio = Math.min(1, a.current / a.target);
      const bRatio = Math.min(1, b.current / b.target);
      return bRatio - aRatio;
    });

    const displayList = all.slice(0, 3);
    this.homeBountyList.innerHTML = '';

    for (const b of displayList) {
      const isReady = !b.claimed && b.current >= b.target;
      const isClaimed = b.claimed;
      const ratio = Math.min(100, Math.round((b.current / b.target) * 100));
      const isWeekly = b.category === 'weekly';

      const item = document.createElement('div');
      item.className = \`home-bounty-item \${isReady ? 'ready-claim' : ''} \${isClaimed ? 'claimed' : ''}\`;
      item.innerHTML = \`
        <div class="bounty-badge-tag \${isWeekly ? 'tag-weekly' : 'tag-daily'}">
          \${isWeekly ? '周赏' : '日赏'}
        </div>
        <div class="bounty-item-icon">\${b.icon || '⚔️'}</div>
        <div class="bounty-item-info">
          <div class="bounty-item-name">\${b.name} <span class="bounty-item-desc">\${b.desc}</span></div>
          <div class="bounty-progress-wrap">
            <div class="bounty-progress-fill \${isReady ? 'fill-gold' : ''}" style="width: \${ratio}%"></div>
            <div class="bounty-progress-text">\${b.current} / \${b.target} (\${ratio}%)</div>
          </div>
        </div>
        <div class="bounty-item-rewards">
          \${b.rewards.mobao ? \`<span class="rw-tag mobao">+\${b.rewards.mobao} 墨宝</span>\` : ''}
          \${b.rewards.tokens ? \`<span class="rw-tag tokens">+\${b.rewards.tokens} 将令</span>\` : ''}
          \${b.rewards.supplies ? \`<span class="rw-tag supplies">+\${b.rewards.supplies} 军需</span>\` : ''}
          \${b.rewards.fragments ? \`<span class="rw-tag fragments">+\${b.rewards.fragments} 残页</span>\` : ''}
        </div>
        <div class="bounty-item-action">
          \${isClaimed
            ? '<span class="bounty-stamp">已领</span>'
            : isReady
              ? \`<button class="btn btn-sm btn-gold-pulse btn-claim-bounty">领 赏</button>\`
              : \`<button class="btn btn-sm btn-paper btn-go-bounty">前往</button>\`
          }
        </div>
      \`;

      const claimBtn = item.querySelector('.btn-claim-bounty');
      if (claimBtn) {
        claimBtn.onclick = (e) => {
          e.stopPropagation();
          this.app.claimBounty(b.id);
        };
      }

      const goBtn = item.querySelector('.btn-go-bounty');
      if (goBtn) {
        goBtn.onclick = (e) => {
          e.stopPropagation();
          if (b.type === 'endless_wave') {
            if (this.triggerEndless) this.triggerEndless();
            else this.app.startEndlessMode();
          } else {
            this.app.openLevels();
          }
        };
      }

      item.onclick = () => {
        this.openBountyModal(b.category);
      };

      this.homeBountyList.appendChild(item);
    }
  }`;

const replacementRenderHomeBounties = `  toggleHomeBountyCollapse(forceState = null) {
    if (!this.homeBountySection) return;
    const isCurrentlyCollapsed = this.homeBountySection.classList.contains('is-collapsed');
    const newState = forceState !== null ? forceState : !isCurrentlyCollapsed;
    
    if (newState) {
      this.homeBountySection.classList.add('is-collapsed');
      if (this.homeBountyList) this.homeBountyList.style.display = 'none';
      if (this.homeBountyCollapsedBar) this.homeBountyCollapsedBar.style.display = 'flex';
      if (this.btnToggleBountyCollapse) this.btnToggleBountyCollapse.textContent = '展开';
      localStorage.setItem('inkwar_home_bounty_collapsed', 'true');
    } else {
      this.homeBountySection.classList.remove('is-collapsed');
      if (this.homeBountyList) this.homeBountyList.style.display = 'flex';
      if (this.homeBountyCollapsedBar) this.homeBountyCollapsedBar.style.display = 'none';
      if (this.btnToggleBountyCollapse) this.btnToggleBountyCollapse.textContent = '收起';
      localStorage.setItem('inkwar_home_bounty_collapsed', 'false');
    }
  }

  renderHomeBounties() {
    if (!this.homeBountyList) return;
    const save = this.app.save;
    const summary = BountyManager.getSummary(save);

    // 同步折叠状态
    const isCollapsedSaved = localStorage.getItem('inkwar_home_bounty_collapsed') === 'true';
    if (isCollapsedSaved) {
      this.toggleHomeBountyCollapse(true);
    }

    if (this.homeBountySummary) {
      this.homeBountySummary.textContent = \`日赏 \${summary.dailyCompleted}/\${summary.dailyTotal} · 周赏 \${summary.weeklyCompleted}/\${summary.weeklyTotal}\`;
    }
    if (this.homeBountyCollapsedSummary) {
      this.homeBountyCollapsedSummary.textContent = \`日赏 \${summary.dailyCompleted}/\${summary.dailyTotal}\${summary.unclaimedCount > 0 ? \` (可领 \${summary.unclaimedCount})\` : ''}\`;
    }

    if (this.homeBountyBadge) {
      if (summary.unclaimedCount > 0) {
        this.homeBountyBadge.style.display = 'inline-flex';
        this.homeBountyBadge.textContent = summary.unclaimedCount;
        this.homeBountyBadge.classList.add('pulse');
      } else {
        this.homeBountyBadge.style.display = 'none';
        this.homeBountyBadge.classList.remove('pulse');
      }
    }

    if (this.btnHomeClaimAll) {
      if (summary.unclaimedCount > 0) {
        this.btnHomeClaimAll.style.display = 'inline-flex';
        this.btnHomeClaimAll.textContent = \`一键领赏 (\${summary.unclaimedCount})\`;
      } else {
        this.btnHomeClaimAll.style.display = 'none';
      }
    }
    if (this.btnCollapsedClaimAll) {
      this.btnCollapsedClaimAll.style.display = summary.unclaimedCount > 0 ? 'inline-block' : 'none';
    }

    // 优先展示可领取的，其次按进度倒序
    const all = [...(summary.daily || []), ...(summary.weekly || [])];
    all.sort((a, b) => {
      const aReady = !a.claimed && a.current >= a.target;
      const bReady = !b.claimed && b.current >= b.target;
      if (aReady !== bReady) return aReady ? -1 : 1;
      if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
      const aRatio = Math.min(1, a.current / a.target);
      const bRatio = Math.min(1, b.current / b.target);
      return bRatio - aRatio;
    });

    const displayList = all.slice(0, 3);
    this.homeBountyList.innerHTML = '';

    for (const b of displayList) {
      const isReady = !b.claimed && b.current >= b.target;
      const isClaimed = b.claimed;
      const ratio = Math.min(100, Math.round((b.current / b.target) * 100));
      const isWeekly = b.category === 'weekly';

      const item = document.createElement('div');
      item.className = \`home-bounty-item \${isReady ? 'ready-claim' : ''} \${isClaimed ? 'claimed' : ''}\`;
      item.innerHTML = \`
        <div class="bounty-badge-tag \${isWeekly ? 'tag-weekly' : 'tag-daily'}">
          \${isWeekly ? '周赏' : '日赏'}
        </div>
        <div class="bounty-item-icon">\${b.icon || '⚔️'}</div>
        <div class="bounty-item-info">
          <div class="bounty-item-name">\${b.name} <span class="bounty-item-desc">\${b.desc}</span></div>
          <div class="bounty-progress-wrap">
            <div class="bounty-progress-fill \${isReady ? 'fill-gold' : ''}" style="width: \${ratio}%"></div>
            <div class="bounty-progress-text">\${b.current} / \${b.target} (\${ratio}%)</div>
          </div>
        </div>
        <div class="bounty-item-rewards">
          \${b.rewards.mobao ? \`<span class="rw-tag mobao">+\${b.rewards.mobao} 墨宝</span>\` : ''}
          \${b.rewards.tokens ? \`<span class="rw-tag tokens">+\${b.rewards.tokens} 将令</span>\` : ''}
          \${b.rewards.supplies ? \`<span class="rw-tag supplies">+\${b.rewards.supplies} 军需</span>\` : ''}
        </div>
        <div class="bounty-item-action">
          \${isClaimed
            ? '<span class="bounty-stamp">已领</span>'
            : isReady
              ? \`<div class="bounty-actions-dual">
                   <button class="btn btn-sm btn-paper btn-claim-bounty">领 赏</button>
                   <button class="btn btn-sm btn-gold-pulse btn-double-bounty">🎬 双倍</button>
                 </div>\`
              : \`<button class="btn btn-sm btn-paper btn-go-bounty">前往</button>\`
          }
        </div>
      \`;

      const claimBtn = item.querySelector('.btn-claim-bounty');
      if (claimBtn) {
        claimBtn.onclick = (e) => {
          e.stopPropagation();
          this.app.claimBounty(b.id, false);
        };
      }
      const doubleBtn = item.querySelector('.btn-double-bounty');
      if (doubleBtn) {
        doubleBtn.onclick = (e) => {
          e.stopPropagation();
          this.app.claimBountyWithAd(b.id);
        };
      }

      const goBtn = item.querySelector('.btn-go-bounty');
      if (goBtn) {
        goBtn.onclick = (e) => {
          e.stopPropagation();
          if (b.type === 'endless_wave') {
            if (this.triggerEndless) this.triggerEndless();
            else this.app.startEndlessMode();
          } else {
            this.app.openLevels();
          }
        };
      }

      item.onclick = () => {
        this.openBountyModal(b.category);
      };

      this.homeBountyList.appendChild(item);
    }
  }`;

if (content.includes(targetRenderHomeBounties)) {
  content = content.replace(targetRenderHomeBounties, replacementRenderHomeBounties);
  console.log('Successfully updated renderHomeBounties');
} else {
  console.error('Failed to find targetRenderHomeBounties');
}

// 2. 替换 renderBountyModalList
const targetRenderModal = `  renderBountyModalList() {
    if (!this.bountyModalList) return;
    const save = this.app.save;
    const summary = BountyManager.getSummary(save);
    const tab = this.bountyModalTab || 'daily';
    const list = tab === 'weekly' ? summary.weekly : summary.daily;

    if (this.btnModalClaimAll) {
      if (summary.unclaimedCount > 0) {
        this.btnModalClaimAll.style.display = 'inline-flex';
        this.btnModalClaimAll.textContent = \`一键领赏 (\${summary.unclaimedCount})\`;
      } else {
        this.btnModalClaimAll.style.display = 'none';
      }
    }

    this.bountyModalList.innerHTML = '';

    for (const b of list) {
      const isReady = !b.claimed && b.current >= b.target;
      const isClaimed = b.claimed;
      const ratio = Math.min(100, Math.round((b.current / b.target) * 100));

      const card = document.createElement('div');
      card.className = \`bounty-card-large \${isReady ? 'ready-claim' : ''} \${isClaimed ? 'claimed' : ''}\`;
      card.innerHTML = \`
        <div class="bounty-large-icon">\${b.icon || '⚔️'}</div>
        <div class="bounty-large-content">
          <div class="bounty-large-title-row">
            <span class="bounty-badge-tag \${b.category === 'weekly' ? 'tag-weekly' : 'tag-daily'}">
              \${b.category === 'weekly' ? '每周悬赏' : '每日悬赏'}
            </span>
            <span class="bounty-large-title">\${b.name}</span>
            <span class="bounty-large-desc">\${b.desc}</span>
          </div>
          <div class="bounty-large-progress">
            <div class="bounty-large-fill \${isReady ? 'fill-gold' : ''}" style="width: \${ratio}%"></div>
            <div class="bounty-large-prog-text">\${b.current} / \${b.target} (\${ratio}%)</div>
          </div>
        </div>
        <div class="bounty-large-rewards">
          \${b.rewards.mobao ? \`<span class="rw-tag mobao">+\${b.rewards.mobao} 墨宝</span>\` : ''}
          \${b.rewards.tokens ? \`<span class="rw-tag tokens">+\${b.rewards.tokens} 将令</span>\` : ''}
          \${b.rewards.supplies ? \`<span class="rw-tag supplies">+\${b.rewards.supplies} 军需</span>\` : ''}
          \${b.rewards.fragments ? \`<span class="rw-tag fragments">+\${b.rewards.fragments} 残页</span>\` : ''}
        </div>
        <div class="bounty-large-action">
          \${isClaimed
            ? '<span class="bounty-stamp">已领</span>'
            : isReady
              ? \`<button class="btn btn-sm btn-gold-pulse btn-claim-bounty">领 赏</button>\`
              : \`<button class="btn btn-sm btn-paper btn-go-bounty">前 往</button>\`
          }
        </div>
      \`;

      const claimBtn = card.querySelector('.btn-claim-bounty');
      if (claimBtn) {
        claimBtn.onclick = () => {
          this.app.claimBounty(b.id);
          this.renderBountyModalList();
        };
      }

      const goBtn = card.querySelector('.btn-go-bounty');
      if (goBtn) {
        goBtn.onclick = () => {
          this.hideBountyModal();
          if (b.type === 'endless_wave') {
            if (this.triggerEndless) this.triggerEndless();
            else this.app.startEndlessMode();
          } else {
            this.app.openLevels();
          }
        };
      }

      this.bountyModalList.appendChild(card);
    }
  }`;

const replacementRenderModal = `  renderBountyModalList() {
    if (!this.bountyModalList) return;
    const save = this.app.save;
    const summary = BountyManager.getSummary(save);
    const tab = this.bountyModalTab || 'daily';
    const list = tab === 'weekly' ? summary.weekly : summary.daily;

    // 每日刷新栏展示
    if (this.bountyRefreshBar) {
      this.bountyRefreshBar.style.display = tab === 'daily' ? 'flex' : 'none';
      if (this.bountyRefreshCount) {
        this.bountyRefreshCount.textContent = summary.dailyRefreshCount ?? 2;
      }
    }
    if (this.btnBountyAdRefresh) {
      this.btnBountyAdRefresh.onclick = async () => {
        await this.app.platform.showAdWithFallback(
          'bounty_refresh',
          () => {
            BountyManager.addAdRefreshes(this.app.save);
            this.app.persist();
            this.toast('🎉 观摩完毕，已增加 3 次每日任务刷新机会！');
            this.renderBountyModalList();
          },
          () => {
            BountyManager.addAdRefreshes(this.app.save);
            this.app.persist();
            this.toast('已为您发放保底刷新机会！');
            this.renderBountyModalList();
          }
        );
      };
    }

    if (this.btnModalClaimAll) {
      if (summary.unclaimedCount > 0) {
        this.btnModalClaimAll.style.display = 'inline-flex';
        this.btnModalClaimAll.textContent = \`一键领赏 (\${summary.unclaimedCount})\`;
        this.btnModalClaimAll.onclick = () => {
          this.app.claimAllBounties(false);
          this.renderBountyModalList();
        };
      } else {
        this.btnModalClaimAll.style.display = 'none';
      }
    }
    if (this.btnModalClaimAllDouble) {
      if (summary.unclaimedCount > 0) {
        this.btnModalClaimAllDouble.style.display = 'inline-flex';
        this.btnModalClaimAllDouble.onclick = () => {
          this.app.claimAllBountiesWithAd();
          this.renderBountyModalList();
        };
      } else {
        this.btnModalClaimAllDouble.style.display = 'none';
      }
    }

    this.bountyModalList.innerHTML = '';

    for (const b of list) {
      const isReady = !b.claimed && b.current >= b.target;
      const isClaimed = b.claimed;
      const ratio = Math.min(100, Math.round((b.current / b.target) * 100));

      const card = document.createElement('div');
      card.className = \`bounty-card-large \${isReady ? 'ready-claim' : ''} \${isClaimed ? 'claimed' : ''}\`;
      card.innerHTML = \`
        <div class="bounty-large-icon">\${b.icon || '⚔️'}</div>
        <div class="bounty-large-content">
          <div class="bounty-large-title-row">
            <span class="bounty-badge-tag \${b.category === 'weekly' ? 'tag-weekly' : 'tag-daily'}">
              \${b.category === 'weekly' ? '每周悬赏' : '每日悬赏'}
            </span>
            <span class="bounty-large-title">\${b.name}</span>
            <span class="bounty-large-desc">\${b.desc}</span>
          </div>
          <div class="bounty-large-progress">
            <div class="bounty-large-fill \${isReady ? 'fill-gold' : ''}" style="width: \${ratio}%"></div>
            <div class="bounty-large-prog-text">\${b.current} / \${b.target} (\${ratio}%)</div>
          </div>
        </div>
        <div class="bounty-large-rewards">
          \${b.rewards.mobao ? \`<span class="rw-tag mobao">+\${b.rewards.mobao} 墨宝</span>\` : ''}
          \${b.rewards.tokens ? \`<span class="rw-tag tokens">+\${b.rewards.tokens} 将令</span>\` : ''}
          \${b.rewards.supplies ? \`<span class="rw-tag supplies">+\${b.rewards.supplies} 军需</span>\` : ''}
        </div>
        <div class="bounty-large-action">
          \${isClaimed
            ? '<span class="bounty-stamp">已领</span>'
            : isReady
              ? \`<div class="bounty-actions-dual">
                   <button class="btn btn-sm btn-paper btn-claim-bounty">领 赏</button>
                   <button class="btn btn-sm btn-gold-pulse btn-double-bounty">🎬 看广告双倍</button>
                 </div>\`
              : \`<div class="bounty-actions-dual">
                   <button class="btn btn-sm btn-paper btn-go-bounty">前 往</button>
                   \${tab === 'daily' ? '<button class="btn-refresh-single-bounty">🔄 换一换</button>' : ''}
                 </div>\`
          }
        </div>
      \`;

      const claimBtn = card.querySelector('.btn-claim-bounty');
      if (claimBtn) {
        claimBtn.onclick = () => {
          this.app.claimBounty(b.id, false);
          this.renderBountyModalList();
        };
      }
      const doubleBtn = card.querySelector('.btn-double-bounty');
      if (doubleBtn) {
        doubleBtn.onclick = () => {
          this.app.claimBountyWithAd(b.id);
          this.renderBountyModalList();
        };
      }

      const refreshSingleBtn = card.querySelector('.btn-refresh-single-bounty');
      if (refreshSingleBtn) {
        refreshSingleBtn.onclick = () => {
          const res = BountyManager.refreshDaily(this.app.save, b.id);
          if (res.success) {
            this.app.persist();
            this.toast(\`任务已更换为：\${res.newBounty.name}！\`);
            this.renderBountyModalList();
            this.renderHomeBounties();
          } else {
            this.toast(res.msg || '无法刷新该任务');
          }
        };
      }

      const goBtn = card.querySelector('.btn-go-bounty');
      if (goBtn) {
        goBtn.onclick = () => {
          this.hideBountyModal();
          if (b.type === 'endless_wave') {
            if (this.triggerEndless) this.triggerEndless();
            else this.app.startEndlessMode();
          } else {
            this.app.openLevels();
          }
        };
      }

      this.bountyModalList.appendChild(card);
    }
  }

  // ---------------- 荒野乱斗级 · 全局通用资源获取大展台 ----------------
  showRewardModal({ title = '战 功 嘉 奖', subtitle = '山河定鼎，犒赏三军', seal = '犒', rewards = {}, isDouble = false, canDouble = true, onDoubleAd = null, onConfirm = null }) {
    if (!this.rewardShowcaseModal) return;
    this.rewardShowcaseModal.style.display = 'flex';
    if (this.rewardShowcaseTitle) this.rewardShowcaseTitle.textContent = title;
    if (this.rewardShowcaseSub) this.rewardShowcaseSub.textContent = subtitle;
    if (this.rewardShowcaseSeal) this.rewardShowcaseSeal.textContent = seal;
    if (this.rewardDoubleBadge) this.rewardDoubleBadge.style.display = isDouble ? 'inline-block' : 'none';

    if (this.rewardItemsContainer) {
      this.rewardItemsContainer.innerHTML = '';
      const items = [];
      if (rewards.supplies) items.push({ icon: '🪙', name: '军饷', count: rewards.supplies, color: '#fde047' });
      if (rewards.mobao) items.push({ icon: '💎', name: '墨宝', count: rewards.mobao, color: '#67e8f9' });
      if (rewards.tokens) items.push({ icon: '🎟️', name: '将令', count: rewards.tokens, color: '#fca5a5' });
      if (rewards.fragments) items.push({ icon: '📜', name: '残页', count: rewards.fragments, color: '#d8b4fe' });

      items.forEach((it, idx) => {
        const box = document.createElement('div');
        box.className = 'reward-item-box';
        box.style.animationDelay = \`\${idx * 0.08}s\`;
        box.innerHTML = \`
          <div class="reward-item-icon">\${it.icon}</div>
          <div class="reward-item-name">\${it.name}</div>
          <div class="reward-item-count" style="color:\${it.color}">+\${it.count}</div>
        \`;
        this.rewardItemsContainer.appendChild(box);
      });
    }

    if (canDouble && onDoubleAd && !isDouble) {
      if (this.btnClaimRewardDouble) {
        this.btnClaimRewardDouble.style.display = 'inline-flex';
        this.btnClaimRewardDouble.onclick = () => {
          this.rewardShowcaseModal.style.display = 'none';
          onDoubleAd();
        };
      }
    } else {
      if (this.btnClaimRewardDouble) this.btnClaimRewardDouble.style.display = 'none';
    }

    if (this.btnClaimRewardNormal) {
      this.btnClaimRewardNormal.onclick = () => {
        this.rewardShowcaseModal.style.display = 'none';
        if (onConfirm) onConfirm();
        this.refreshHome();
      };
    }
  }

  // 门票不足弹窗
  openEndlessTicketModal() {
    if (this.endlessTicketModal) {
      this.endlessTicketModal.style.display = 'flex';
    }
  }

  hideEndlessTicketModal() {
    if (this.endlessTicketModal) {
      this.endlessTicketModal.style.display = 'none';
    }
  }

  // 第20关通关盛大解锁弹窗
  openEndlessUnlockModal() {
    if (this.endlessUnlockModal) {
      this.endlessUnlockModal.style.display = 'flex';
    }
  }`;

if (content.includes(targetRenderModal)) {
  content = content.replace(targetRenderModal, replacementRenderModal);
  console.log('Successfully updated renderBountyModalList and added showRewardModal & ticket modals');
} else {
  console.error('Failed to find targetRenderModal');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished writing update_ui_v172_bounty.cjs');
