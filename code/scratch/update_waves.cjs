const fs = require('fs');

let waves = fs.readFileSync('E:/taptapgame/inkwar/code/src/battle/waves.js', 'utf8');

const targetOld = `  // 2. 无尽模式波次刷新逻辑
  updateEndlessWaves(dt) {
    if (this.state !== 'running') return;
    this.endlessWave = this.endlessWave || 1;
    this.endlessClearedWaves = this.endlessClearedWaves || 0;

    // 如果当前处于肉鸽选牌暂停状态，阻断波次流转
    if (this.endlessBuffSelecting) return;

    // 波次初始化启动
    if (!this._endlessWaveStarted) {
      this._endlessWaveStarted = true;
      this.startEndlessWave(this.endlessWave);
    }

    // 处理待生成队列
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      if (this.elapsed >= item.at) {
        const liveEnemies = this.entities.filter((e) => e.alive && e.side === 'enemy' && !e.unit?.building).length;
        if (liveEnemies < MAX_UNITS_PER_SIDE) {
          const unit = getUnit(item.type);
          if (unit) {
            const x = ENEMY_SPAWN_X + (Math.random() - 0.5) * 0.9;
            const ent = this.createEntity({
              unit, side: 'enemy', x, z: (Math.random() - 0.5) * 2.4, kind: 'unit',
              hpMul: item.hpMul, atkMul: item.atkMul,
            });
            if (item.isBoss) ent.isBoss = true;
            this.effects?.dust?.(x, 0, 2, 0.6);
          }
        }
        this.spawnQueue.splice(i, 1);
      }
    }

    // 检查当前波次敌军是否全数肃清（生成队列已空且场上无存活敌兵与敌方首领）
    if (this.spawnQueue.length === 0) {
      const livingEnemies = this.entities.filter(e => e.alive && e.side === 'enemy' && !e.unit?.building && !e.isTower);
      if (livingEnemies.length === 0) {
        // 当前波次通关！
        if (!this._endlessWaveClearDelay) {
          this._endlessWaveClearDelay = 2.0;
          this.endlessClearedWaves = this.endlessWave;
          this.ui?.showBattleBanner?.(\`第 \${this.endlessWave} 波告捷\`, '墨阵荡平，全军戒备！', 1500);
          audio.drum(null, true, 0.3);
        } else {
          this._endlessWaveClearDelay -= dt;
          if (this._endlessWaveClearDelay <= 0) {
            this._endlessWaveClearDelay = null;
            const justClearedWave = this.endlessWave;
            this.endlessWave++;
            this._endlessWaveStarted = false;

            // 每过 5 个波次出现肉鸽三选一增益弹窗！
            if (justClearedWave % 5 === 0) {
              this.endlessBuffSelecting = true;
              if (this.ui?.showEndlessBuffSelection) {
                this.ui.showEndlessBuffSelection(this);
              }
            }
          }
        }
      }
    }
  },

  startEndlessWave(wave) {
    const isBossWave = (wave % 10 === 0);
    // 遵照指示精确公式：敌人当前属性 = 初始属性 + (当前波波次数 - 1) * 初始属性 * 5%
    const waveMul = 1.0 + (wave - 1) * 0.05;
    const hpMul = waveMul;
    const atkMul = waveMul;

    this.ui?.showBattleBanner?.(
      isBossWave ? \`第 \${wave} 波 · 强敌降临\` : \`第 \${wave} 波\`,
      isBossWave ? '首领现世，斩将夺魁！' : '敌军兵锋递增，坚守阵线！',
      2000
    );
    audio.drum(null, true, 0.4);

    // 根据波次阶段挑选兵种配置
    const pool = ['militia', 'swordsman'];
    if (wave >= 3) pool.push('archer');
    if (wave >= 5) pool.push('shield');
    if (wave >= 8) pool.push('spearman');
    if (wave >= 12) pool.push('cavalry');
    if (wave >= 16) pool.push('trebuchet');

    const totalSoldiers = Math.min(18, 4 + Math.floor(wave * 0.9));
    for (let i = 0; i < totalSoldiers; i++) {
      const type = pool[Math.floor(Math.random() * pool.length)];
      this.spawnQueue.push({
        at: this.elapsed + 0.5 + i * 0.75,
        type,
        hpMul,
        atkMul,
      });
    }

    // 每 10 波出现首领
    if (isBossWave) {
      const bossConfig = this.getEndlessBossForWave(wave);
      if (bossConfig) {
        const bossUnit = getUnit(bossConfig.type);
        const baseBossAtk = (bossUnit && bossUnit.atk) || 35;
        this.spawnQueue.push({
          at: this.elapsed + 2.5,
          type: bossConfig.type,
          hpOverride: Math.round(bossConfig.hp * waveMul),
          atkMul: (bossConfig.atk / baseBossAtk) * waveMul,
          isBoss: true,
        });
      }
    }
  },

  getEndlessBossForWave(wave) {
    const ladder = ENDLESS_BOSS_LADDER;
    const match = ladder.find(b => b.wave === wave);
    if (match) return match;
    return ladder[ladder.length - 1];
  },`;

const targetNew = `  // 2. 无尽模式波次刷新逻辑
  updateEndlessWaves(dt) {
    if (this.state !== 'running') return;
    this.endlessWave = this.endlessWave || 1;
    this.endlessClearedWaves = this.endlessClearedWaves || 0;

    // 如果处于肉鸽选牌状态或全局暂停，阻断波次流转 (#6)
    if (this.endlessBuffSelecting || this.paused) return;

    // 波次初始化启动
    if (!this._endlessWaveStarted) {
      this._endlessWaveStarted = true;
      this._endlessWaveTimer = 0;
      this.startEndlessWave(this.endlessWave);
    }

    // 处理待生成队列
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const item = this.spawnQueue[i];
      if (this.elapsed >= item.at) {
        const liveEnemies = this.entities.filter((e) => e.alive && e.side === 'enemy' && !e.unit?.building).length;
        if (liveEnemies < MAX_UNITS_PER_SIDE || item.isBoss) {
          const unit = getUnit(item.type);
          if (unit) {
            const x = item.x !== undefined ? item.x : (ENEMY_SPAWN_X + (Math.random() - 0.5) * 0.9);
            const ent = this.createEntity({
              unit,
              side: 'enemy',
              x,
              z: item.z !== undefined ? item.z : ((Math.random() - 0.5) * 2.4),
              kind: 'unit',
              isBoss: !!item.isBoss,
              hpOverride: item.hpOverride,
              hpMul: item.hpMul || 1,
              atkMul: item.atkMul || 1,
            });
            if (item.isBoss) {
              this.setupEndlessBoss(ent, item.bossConfig);
            }
            this.effects?.dust?.(x, 0, 2, 0.6);
          }
        }
        this.spawnQueue.splice(i, 1);
      }
    }

    // 和关卡模式一样：固定间隔时间推进下一波（每隔一段时间出一波兵，非等上一波兵死绝才出）(#3)
    const ENDLESS_WAVE_INTERVAL = 20.0;
    this._endlessWaveTimer = (this._endlessWaveTimer || 0) + dt;

    if (this._endlessWaveTimer >= ENDLESS_WAVE_INTERVAL) {
      this._endlessWaveTimer = 0;
      const justClearedWave = this.endlessWave;
      this.endlessClearedWaves = justClearedWave;
      this.endlessWave++;

      // 每过 5 个波次（第 5, 10, 15, 20... 波结束）：全局暂停并弹出肉鸽三选一增益 (#6)
      if (justClearedWave % 5 === 0) {
        this.endlessBuffSelecting = true;
        this.paused = true;
        if (this.ui?.showEndlessBuffSelection) {
          this.ui.showEndlessBuffSelection(this);
        }
      }

      this.startEndlessWave(this.endlessWave);
      if (this.ui?.updateBattleHUD) this.ui.updateBattleHUD(this);
    }
  },

  setupEndlessBoss(boss, cfg) {
    if (!boss || !cfg) return;
    this.boss = boss;
    boss.name = cfg.name;
    boss.bossSkills = (cfg.skills || []).slice();
    boss.skillTimers = {};
    for (const s of boss.bossSkills) {
      if (s === 'summon') boss.skillTimers.summon = 8;
      if (s === 'wind') boss.skillTimers.wind = 5;
      if (s === 'charge') boss.skillTimers.charge = 7;
      if (s === 'crescent') boss.skillTimers.crescent = 5;
    }
    boss.chargesLeft = 5;
    this.ui?.showBossBar?.(cfg.name, boss.maxHp, boss.maxHp);
    this.ui?.showBattleBanner?.(\`\${cfg.name} 降临！\`, cfg.title ? \`第 \${this.endlessWave} 波 · \${cfg.title}\` : \`第 \${this.endlessWave} 波首领现世，斩将夺魁！\`, 2400);
    audio.bossRoar();
    this.ui?.flash?.('boss');
    this.scene?.screenShake?.(0.35, 0.5);
    this.effects?.ring?.(13, 0, 0xb23a2f, 0.6, 4.5, 1.2, 0.8);
    this.effects?.pillar?.(13, 0, 0xb23a2f, 6);
    audio.setBoss(true);
  },

  startEndlessWave(wave) {
    const isBossWave = (wave % 10 === 0);
    // 遵照指示精确公式：敌人当前属性 = 初始属性 + (当前波波次数 - 1) * 初始属性 * 5%
    const waveMul = 1.0 + (wave - 1) * 0.05;
    const hpMul = waveMul;
    const atkMul = waveMul;

    this.ui?.showBattleBanner?.(
      isBossWave ? \`第 \${wave} 波 · 强敌降临\` : \`第 \${wave} 波\`,
      isBossWave ? '首领现世，斩将夺魁！' : '敌军兵锋递增，坚守阵线！',
      2000
    );
    audio.drum(null, true, 0.4);

    // #7 敌人出兵数量限制：每5波+2，初始限制5
    // wave 1-5: 5; wave 6-10: 7; wave 11-15: 9; wave 16-20: 11; ...
    const totalSoldiers = 5 + Math.floor((wave - 1) / 5) * 2;

    // #9 敌方第10波开始才允许出现传奇卡
    // #5 限制：敌方传奇卡出兵数量每一波不得高于当前波次的 0.1 倍
    const canHaveLegendary = (wave >= 10);
    const maxLegendary = canHaveLegendary ? Math.floor(wave * 0.1) : 0;

    let legendaryCount = 0;
    const spawnInterval = 16.0 / Math.max(1, totalSoldiers);

    for (let i = 0; i < totalSoldiers; i++) {
      let type;
      const allowLegendary = (canHaveLegendary && legendaryCount < maxLegendary);
      if (allowLegendary && Math.random() < 0.25) {
        type = 'trebuchet';
        legendaryCount++;
      } else {
        const pool = ['militia', 'swordsman'];
        if (wave >= 3) pool.push('archer');
        if (wave >= 5) pool.push('shield');
        if (wave >= 7) pool.push('spearman');
        if (wave >= 9) pool.push('cavalry');
        type = pool[Math.floor(Math.random() * pool.length)];
      }

      this.spawnQueue.push({
        at: this.elapsed + 0.5 + i * spawnInterval,
        type,
        hpMul,
        atkMul,
      });
    }

    // 每 10 波出击专属强力首领 (#3)
    if (isBossWave) {
      const bossConfig = this.getEndlessBossForWave(wave);
      if (bossConfig) {
        const bossUnit = getUnit(bossConfig.type);
        const baseBossAtk = (bossUnit && bossUnit.atk) || 45;
        this.spawnQueue.push({
          at: this.elapsed + 2.0,
          type: bossConfig.type,
          x: 13.0,
          z: 0,
          hpOverride: Math.round(bossConfig.hp * waveMul),
          atkMul: (bossConfig.atk / baseBossAtk) * waveMul,
          isBoss: true,
          bossConfig,
        });
      }
    }
  },

  getEndlessBossForWave(wave) {
    const ladder = ENDLESS_BOSS_LADDER;
    const match = ladder.find(b => b.wave === wave);
    if (match) return match;
    const idx = (Math.floor(wave / 10) - 1) % ladder.length;
    return ladder[idx >= 0 ? idx : 0];
  },`;

function normalize(s) {
  return s.replace(/\r?\n/g, '\n');
}

const normWaves = normalize(waves);
const normTargetOld = normalize(targetOld);
const normTargetNew = normalize(targetNew);

if (!normWaves.includes(normTargetOld)) {
  console.error("targetOld not found in waves.js!");
  process.exit(1);
}

// Preserve original line endings
const isCRLF = waves.includes('\r\n');
const result = normWaves.replace(normTargetOld, normTargetNew);
fs.writeFileSync('E:/taptapgame/inkwar/code/src/battle/waves.js', isCRLF ? result.replace(/\n/g, '\r\n') : result);
console.log('Successfully updated waves.js!');
