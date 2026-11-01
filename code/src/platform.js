
export const AD_SLOTS = {
  win_double: { id: 'win_double', name: '战后双倍', max: 5, desc: '将令翻倍' },
  gacha_rush: { id: 'gacha_rush', name: '祈愿加速', max: 3, desc: '固定 +25 将令' },
  camp_supply: { id: 'camp_supply', name: '每日军需加倍', max: 1, desc: '军需 40 → 80' },
  retry_boost: { id: 'retry_boost', name: '再战补给', max: 3, desc: '下场开局 +3 军令' },
  daily_refresh: { id: 'daily_refresh', name: '挑战刷新', max: 1, desc: '刷新今日挑战词条' },
  endless_revive: { id: 'endless_revive', name: '无尽复活', max: 10, desc: '原地清屏复活' },
};

// TapTap 平台接入：本地文件 / 云存档 / 排行榜；浏览器环境降级 localStorage
const SAVE_NAME = 'mozhen_shanhe_save';
const SAVE_FILE = `${SAVE_NAME}.json`;
export const LEADERBOARD_ID = 'ma3k3b6kdmw4pytdae';
const CLOUD_ARCHIVE_NAME = 'mozhen_save';
// TapTap 激励视频广告位（由服务端广告变现状态下发，横屏 screen_orientation=2）
const REWARDED_AD_UNIT_ID = '1054323';

function timeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export class Platform {
  // 最小埋点系统（design §12.1）
  track(event, params = {}) {
    const record = {
      event,
      params,
      timestamp: Date.now(),
      platform: this.tap ? 'taptap' : 'web',
    };
    if (this.tap && typeof this.tap.track === 'function') {
      try { this.tap.track(event, params); } catch (e) { /* ignore */ }
    }
    if (!this.eventLog) this.eventLog = [];
    this.eventLog.push(record);
    if (this.eventLog.length > 60) this.eventLog.shift();
    if (typeof window !== 'undefined' && window.__ENABLE_TRACK_LOG__) {
      console.log('[Track]', event, params);
    }
    return record;
  }

  constructor() {
    this.tap = (typeof window !== 'undefined' && window.tap) ? window.tap : null;
    this.fs = null;
    this.cloud = null;
    this.lb = null;
    this.lastUploadAt = 0;
    this.cloudArchiveUUID = '';
    this.cloudStatus = 'local';
    if (this.tap) {
      try { this.fs = this.tap.getFileSystemManager ? this.tap.getFileSystemManager() : null; } catch { this.fs = null; }
      try { this.cloud = this.tap.getCloudSaveManager ? this.tap.getCloudSaveManager() : null; } catch { this.cloud = null; }
      try { this.lb = this.tap.getLeaderboardManager ? this.tap.getLeaderboardManager() : null; } catch { this.lb = null; }
    }
  }

  get isTap() {
    return !!(this.tap && this.fs && this.tap.env && this.tap.env.USER_DATA_PATH);
  }

  get hasCloud() {
    return !!(this.cloud && this.isTap);
  }

  get hasLeaderboard() {
    return !!this.lb;
  }

  get leaderboardId() {
    return LEADERBOARD_ID;
  }

  localPath(name = SAVE_FILE) {
    if (this.isTap) return `${this.tap.env.USER_DATA_PATH}/${name}`;
    return null;
  }

  async readLocal() {
    if (this.isTap && this.fs) {
      const path = this.localPath();
      const raw = await timeout(new Promise((resolve) => {
        this.fs.readFile({
          filePath: path,
          encoding: 'utf8',
          success: (res) => resolve(res.data),
          fail: () => resolve(null),
        });
      }), 2500, null);
      if (raw) {
        try { return JSON.parse(raw); } catch { return null; }
      }
      return null;
    }
    try {
      const raw = localStorage.getItem(SAVE_NAME);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async writeLocal(data) {
    const raw = JSON.stringify(data);
    if (this.isTap && this.fs) {
      await timeout(new Promise((resolve) => {
        this.fs.writeFile({
          filePath: this.localPath(),
          data: raw,
          encoding: 'utf8',
          success: () => resolve(true),
          fail: () => resolve(false),
        });
      }), 2500, false);
      return;
    }
    try {
      localStorage.setItem(SAVE_NAME, raw);
    } catch {}
  }

  async loadCloud() {
    if (!this.hasCloud) return null;
    const list = await timeout(new Promise((resolve) => {
      this.cloud.getArchiveList({
        success: (res) => resolve(res && res.saves ? res.saves : []),
        fail: () => resolve([]),
      });
    }), 4000, null);
    if (!list) return null;
    const archive = list.find((s) => s.name === CLOUD_ARCHIVE_NAME);
    if (!archive) return null;
    this.cloudArchiveUUID = archive.uuid || archive.archiveUUID || this.cloudArchiveUUID;
    const target = this.localPath('mozhen_save_cloud.json');
    const filePath = await timeout(new Promise((resolve) => {
      this.cloud.getArchiveData({
        archiveUUID: archive.uuid || archive.archiveUUID,
        archiveFileId: archive.fileId || archive.archiveFileId,
        targetFilePath: target,
        success: (res) => resolve(res && res.filePath ? res.filePath : target),
        fail: () => resolve(null),
      });
    }), 6000, null);
    if (!filePath) return null;
    const raw = await timeout(new Promise((resolve) => {
      this.fs.readFile({
        filePath,
        encoding: 'utf8',
        success: (res) => resolve(res.data),
        fail: () => resolve(null),
      });
    }), 2500, null);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  async load(defaults) {
    const local = await this.readLocal();
    let save = local ? { ...defaults, ...local } : { ...defaults };
    if (this.cloudArchiveUUID) save.cloudArchiveUUID = save.cloudArchiveUUID || this.cloudArchiveUUID;
    if (this.hasCloud) {
      this.cloudStatus = 'syncing';
      const cloud = await timeout(this.loadCloud(), 9000, null);
      if (cloud && cloud.updatedAt && (!local || cloud.updatedAt > (local.updatedAt || 0))) {
        save = { ...defaults, ...cloud, _loadedFromCloud: true };
        this.cloudArchiveUUID = save.cloudArchiveUUID || this.cloudArchiveUUID;
        await this.writeLocal(save);
        this.cloudStatus = 'synced';
        return save;
      }
      this.cloudStatus = 'synced';
    }
    if (save.cloudArchiveUUID) this.cloudArchiveUUID = save.cloudArchiveUUID;
    return save;
  }

  async save(data, options = {}) {
    const payload = { ...data, updatedAt: Date.now() };
    await this.writeLocal(payload);
    if (options.cloud !== false && this.hasCloud) {
      const now = Date.now();
      if (now - this.lastUploadAt >= 60000) {
        this.lastUploadAt = now;
        this.uploadCloud(payload).catch(() => {});
      }
    }
    return payload;
  }

  async uploadCloud(data) {
    if (!this.hasCloud) return false;
    await this.writeLocal(data);
    const filePath = this.localPath();
    const meta = {
      name: CLOUD_ARCHIVE_NAME,
      summary: `Lv.${data.progress ? data.progress.unlockedLevel : 1} Star ${data.progress ? data.progress.totalStars : 0}`,
      playtime: Math.floor((data.player && data.player.playTime) || 0),
    };
    if (this.cloudArchiveUUID) {
      const ok = await timeout(new Promise((resolve) => {
        this.cloud.updateArchive({
          archiveUUID: this.cloudArchiveUUID,
          archiveMetaData: meta,
          archiveFilePath: filePath,
          success: () => resolve(true),
          fail: () => resolve(false),
        });
      }), 8000, false);
      this.cloudStatus = ok ? 'synced' : 'error';
      return ok;
    }
    const uuid = await timeout(new Promise((resolve) => {
      this.cloud.createArchive({
        archiveMetaData: meta,
        archiveFilePath: filePath,
        success: (res) => resolve(res && res.uuid ? res.uuid : ''),
        fail: () => resolve(''),
      });
    }), 8000, '');
    if (uuid) {
      this.cloudArchiveUUID = uuid;
      data.cloudArchiveUUID = uuid;
      await this.writeLocal(data);
      this.cloudStatus = 'synced';
      return true;
    }
    this.cloudStatus = 'error';
    return false;
  }

  submitScore(score) {
    if (!this.lb || !score) return Promise.resolve(false);
    return timeout(new Promise((resolve) => {
      this.lb.submitScores({
        scores: [{ leaderboardId: LEADERBOARD_ID, score: Math.floor(score) }],
        callback: {
          onSuccess: () => resolve(true),
          onFailure: () => resolve(false),
        },
      });
    }), 6000, false);
  }

  openLeaderboard() {
    if (!this.lb) return Promise.resolve(false);
    return timeout(new Promise((resolve) => {
      this.lb.openLeaderboard({
        leaderboardId: LEADERBOARD_ID,
        collection: 'public',
        callback: {
          onSuccess: () => resolve(true),
          onFailure: () => resolve(false),
        },
      });
    }), 6000, false);
  }

  vibrate(ms = 12) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  }

  // 激励视频广告（祈将台/首通双倍）；浏览器环境降级为 2 秒模拟
  // TapTap SDK 回调是全局唯一的，因此创建时一次性绑定 onClose/onError，播放过程中靠 _adResolve 分发结果
  _initRewardedAd() {
    if (this._rewardedAd || !this.tap || typeof this.tap.createRewardedVideoAd !== 'function') return;
    try {
      const ad = this.tap.createRewardedVideoAd({ adUnitId: REWARDED_AD_UNIT_ID });
      if (ad.onClose) ad.onClose((res) => this._settleAd(!!(res && (res.isEnded || res.ended))));
      if (ad.onError) ad.onError(() => this._settleAd(false));
      this._rewardedAd = ad;
      this._adLoading = null;
      // 启动即预加载；show() 未就绪时再走一次 load→show 重试
      this._loadRewardedAd(ad);
    } catch {
      this._rewardedAd = null;
    }
  }

  // 预加载：缓存进行中的 load 调用，避免重复触发或竞争
  _loadRewardedAd(ad) {
    if (this._adLoading) return this._adLoading;
    try {
      this._adLoading = Promise.resolve(ad.load())
        .catch(() => {})
        .finally(() => { this._adLoading = null; });
    } catch {
      this._adLoading = Promise.resolve();
    }
    return this._adLoading;
  }

  _settleAd(ok) {
    const resolve = this._adResolve;
    this._adResolve = null;
    if (resolve) resolve(ok);
  }

  
  getAdUsage(slotId) {
    const slot = AD_SLOTS[slotId];
    if (!slot) return { used: 0, max: 1, remaining: 1 };
    const today = new Date().toISOString().slice(0, 10);
    const key = 'inkwar_ad_' + slotId + '_' + today;
    const used = parseInt(localStorage.getItem(key) || '0', 10);
    return {
      used,
      max: slot.max,
      remaining: Math.max(0, slot.max - used)
    };
  }

  recordAdUsage(slotId) {
    const today = new Date().toISOString().slice(0, 10);
    const key = 'inkwar_ad_' + slotId + '_' + today;
    const used = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, String(used + 1));
  }

  // 依据 §7.1 原则：带保底激励视频 (无填充/失败发放 50% 保底)
  async showAdWithFallback(slotId, onFullReward, onFallbackReward) {
    const usage = this.getAdUsage(slotId);
    if (usage.remaining <= 0) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('今日该激励已达上限，明日再来吧！');
      }
      return false;
    }
    this.track('ad_impression', { slot: slotId });
    const success = await this.showRewardedAd();
    if (success) {
      this.recordAdUsage(slotId);
      this.track('ad_complete', { slot: slotId, status: 'success' });
      if (onFullReward) onFullReward();
      return true;
    } else {
      // 失败或无填充，执行 50% 保底发放
      this.track('ad_complete', { slot: slotId, status: 'fallback_50' });
      if (onFallbackReward) onFallbackReward();
      return false;
    }
  }

  async showRewardedAd() {
    if (this.tap && typeof this.tap.createRewardedVideoAd === 'function') {
      this._initRewardedAd();
      const ad = this._rewardedAd;
      if (!ad) return false;
      // 有未完成播放时先等它结算，避免 show 被吞导致“提示没看完，广告又跳出来”
      if (this._adResolve) return false;
      const result = await timeout(new Promise((resolve) => {
        this._adResolve = resolve;
        Promise.resolve(ad.show()).catch(async () => {
          // show 失败说明未加载：先加载，等真正加载完成再 show，避免“广告还没出来就被判没看完”
          await this._loadRewardedAd(ad);
          Promise.resolve(ad.show()).catch(() => this._settleAd(false));
        });
      }), 120000, false);
      this._adResolve = null;
      // 播完立即为下次预加载
      this._loadRewardedAd(ad);
      return result;
    }
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  }
}
