const fs = require('fs');
const cssPath = 'E:/taptapgame/inkwar/code/styles.css';

const brawlStyles = `
/* ==========================================================================
   v1.72 荒野乱斗级顶部资源状态栏、Q弹立体按键反馈、悬赏折叠与通用奖励大展台
   ========================================================================== */

/* 1. 顶部资源栏 (Brawl Stars Style Top Bar) */
.top-resources {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 auto;
}

.brawl-res-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(42, 38, 30, 0.72);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(226, 218, 201, 0.35);
  border-radius: 20px;
  padding: 3px 10px 3px 6px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease, box-shadow 0.12s ease;
  user-select: none;
}

.brawl-res-pill:hover {
  transform: translateY(-1px) scale(1.03);
  background: rgba(55, 50, 40, 0.85);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.brawl-res-pill:active {
  transform: translateY(1px) scale(0.97);
}

.brawl-res-icon {
  font-size: 16px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
  display: flex;
  align-items: center;
  justify-content: center;
}

.brawl-res-val {
  font-family: var(--font-num, "Impact", "Arial Black", monospace);
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 0.5px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

#pill-supplies .brawl-res-val { color: #fde047; }
#pill-mobao .brawl-res-val { color: #67e8f9; }
#pill-tokens .brawl-res-val { color: #fca5a5; }
#pill-tickets .brawl-res-val { color: #86efac; }

.brawl-res-plus {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(180deg, #22c55e, #15803d);
  border: 1px solid #86efac;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.brawl-res-plus:hover {
  transform: scale(1.15);
  filter: brightness(1.1);
}

.brawl-res-plus:active {
  transform: scale(0.9);
}

/* 2. 荒野乱斗级按钮立体感与按压弹性反馈 (Brawl Stars 3D Button Physics) */
.btn {
  position: relative;
  transition: transform 0.08s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.08s ease, filter 0.12s ease !important;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25) !important;
}

.btn:hover {
  filter: brightness(1.06) contrast(1.02);
}

.btn:active {
  transform: translateY(3px) scale(0.97) !important;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25) !important;
}

.btn-seal {
  box-shadow: 0 5px 0 #78221b !important;
}
.btn-seal:active {
  transform: translateY(4px) scale(0.97) !important;
  box-shadow: 0 1px 0 #78221b !important;
}

.btn-gold-pulse {
  box-shadow: 0 4px 0 #854d0e !important;
}
.btn-gold-pulse:active {
  transform: translateY(3px) scale(0.97) !important;
  box-shadow: 0 1px 0 #854d0e !important;
}

.btn-endless-home {
  position: relative;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: linear-gradient(180deg, #374151, #1f2937) !important;
  border: 2px solid #9ca3af !important;
  color: #f3f4f6 !important;
  box-shadow: 0 5px 0 #111827 !important;
}

.btn-endless-home:active {
  transform: translateY(4px) scale(0.97) !important;
  box-shadow: 0 1px 0 #111827 !important;
}

.endless-btn-badge {
  font-size: 11px;
  padding: 1px 6px;
  background: #22c55e;
  color: #fff;
  border-radius: 10px;
  font-weight: bold;
}

.endless-btn-lock {
  font-size: 11px;
  padding: 1px 6px;
  background: #6b7280;
  color: #e5e7eb;
  border-radius: 10px;
  font-weight: bold;
}

/* 3. 主界面悬赏折叠/收起样式 */
.home-bounty-section {
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.home-bounty-collapsed-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #dcd3c1;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.collapsed-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapsed-name {
  font-weight: bold;
  font-size: 13px;
  color: #372a1e;
}

.collapsed-summary {
  font-size: 12px;
  color: #8c7860;
  margin-left: 4px;
}

.collapsed-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 4. 悬赏面板刷新栏与双倍领赏按钮 */
.bounty-refresh-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  margin: 4px 12px 10px 12px;
  background: #fbf8f0;
  border: 1px solid #e7ded0;
  border-radius: 6px;
  font-size: 12px;
  color: #574c3d;
}

.btn-refresh-single-bounty {
  font-size: 11px;
  padding: 2px 6px;
  color: #854d0e;
  border: 1px dashed #ca8a04;
  border-radius: 4px;
  background: #fefce8;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.btn-refresh-single-bounty:hover {
  transform: scale(1.05);
  background: #fef9c3;
}

.bounty-actions-dual {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

/* 5. 荒野乱斗通用奖励大展台 (Universal Reward Showcase Modal) */
.reward-showcase-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.reward-showcase-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(12, 10, 8, 0.88);
  backdrop-filter: blur(8px);
}

.reward-sunburst {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(234, 179, 8, 0.25) 0%, rgba(202, 138, 4, 0.08) 50%, transparent 70%);
  animation: rotateSunburst 20s linear infinite;
  pointer-events: none;
}

@keyframes rotateSunburst {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.reward-showcase-card {
  position: relative;
  width: min(90vw, 480px);
  background: #faf6ee;
  border: 2px solid #c9a25e;
  border-radius: 16px;
  padding: 24px 20px 20px 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: showcaseCardPop 0.35s cubic-bezier(0.18, 1.25, 0.4, 1);
}

@keyframes showcaseCardPop {
  0% { transform: scale(0.6) translateY(40px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.reward-header {
  margin-bottom: 16px;
}

.reward-showcase-title {
  margin: 6px 0 2px 0;
  font-size: 24px;
  font-weight: 900;
  color: #292524;
  letter-spacing: 2px;
}

.reward-showcase-sub {
  margin: 0;
  font-size: 13px;
  color: #78716c;
}

.reward-items-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  margin: 16px 0;
  width: 100%;
}

.reward-item-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e7dfce;
  border-radius: 12px;
  min-width: 90px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: rewardItemBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

@keyframes rewardItemBounce {
  0% { transform: scale(0) rotate(-15deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.reward-item-icon {
  font-size: 34px;
  margin-bottom: 6px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
}

.reward-item-name {
  font-size: 12px;
  color: #57534e;
  margin-bottom: 2px;
}

.reward-item-count {
  font-family: var(--font-num, monospace);
  font-size: 18px;
  font-weight: bold;
  color: #b23a2f;
}

.reward-double-badge {
  padding: 6px 14px;
  background: #fef08a;
  border: 1px solid #ca8a04;
  border-radius: 20px;
  color: #854d0e;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 16px;
  animation: pulseDouble 1s infinite alternate;
}

@keyframes pulseDouble {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}

.reward-actions {
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

/* 6. 门票不足与解锁弹窗 */
.ticket-modal-paper, .unlock-modal-paper {
  background: #faf6ee;
  border: 2px solid #b23a2f;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
}

.ticket-status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1px solid #e7ded0;
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
}

.ticket-icon-large {
  font-size: 42px;
}

.ticket-status-text h3 {
  margin: 0 0 4px 0;
  color: #b23a2f;
  font-size: 16px;
}

.ticket-status-text p {
  margin: 2px 0;
  font-size: 12px;
  color: #57534e;
}

.ticket-ad-hint {
  color: #854d0e !important;
  font-weight: 600;
}

.ticket-modal-actions, .unlock-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

.unlock-rules-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 16px 0;
}

.rule-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: #fff;
  border: 1px solid #e2dac9;
  border-radius: 8px;
  padding: 12px 8px;
}

.rule-icon {
  font-size: 26px;
  margin-bottom: 4px;
}

.rule-title {
  font-size: 13px;
  font-weight: bold;
  color: #292524;
  margin-bottom: 2px;
}

.rule-desc {
  font-size: 11px;
  color: #78716c;
  line-height: 1.3;
}
`;

fs.appendFileSync(cssPath, brawlStyles, 'utf8');
console.log('Successfully appended Brawl Stars styles to styles.css');
