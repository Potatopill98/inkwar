const fs = require('fs');

let waves = fs.readFileSync('E:/taptapgame/inkwar/code/src/battle/waves.js', 'utf8');

function normalize(s) {
  return s.replace(/\r?\n/g, '\n');
}

let norm = normalize(waves);

// Replace 1: Base explosion damage & recovery
const target1 = `    // 2) 普通友方单位：击退至中场 (-3.0 ~ -0.5) 并受到 80% 最大生命值伤害
    for (const u of this.entities) {
      if (!u.alive || u.side !== 'player') continue;
      if (u.unit?.building) continue;

      const isHeroUnit = u.isHero || u === this.getHeroTargetObj?.() || (u.unit && u.unit.hero);
      if (!isHeroUnit) {
        const targetMidX = -1.0 - Math.random() * 2.5;
        u.x = Math.min(u.x, targetMidX);
        if (u.mesh) u.mesh.position.x = u.x;
        const dmg = Math.round(u.maxHp * 0.80);
        this.applyDamage(u, dmg, null, { isBaseExplosion: true });
        if (this.effects?.blood) this.effects.blood(u.x, 1.0, u.z, 3);
      }
    }

    // 启动敌寨 3 秒无敌金光护盾与平滑回血动画 (0 -> 5000)
    this.endlessBaseShieldTimer = 3.0;
    this.endlessBaseRecoverTimer = 3.0;
    this.enemyBaseHp = 0;
    this.createEndlessBaseShield();
  },

  // 敌寨无敌护盾 3D 呈现
  createEndlessBaseShield() {
    this.removeEndlessBaseShield();
    const ringGeo = new THREE.RingGeometry(2.6, 3.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc9a25e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shield = new THREE.Mesh(ringGeo, ringMat);
    shield.rotation.x = -Math.PI / 2;
    shield.position.set(ENEMY_BASE_X, 0.45, 0);
    this.scene.scene.add(shield);
    this.endlessBaseShieldMesh = shield;
  },

  removeEndlessBaseShield() {
    if (this.endlessBaseShieldMesh) {
      this.scene.scene.remove(this.endlessBaseShieldMesh);
      this.endlessBaseShieldMesh.geometry?.dispose();
      this.endlessBaseShieldMesh.material?.dispose();
      this.endlessBaseShieldMesh = null;
    }
  },

  updateEndlessBaseShield(dt) {
    if (this.endlessBaseShieldTimer > 0) {
      this.endlessBaseShieldTimer = Math.max(0, this.endlessBaseShieldTimer - dt);
      this.endlessBaseRecoverTimer = Math.max(0, this.endlessBaseRecoverTimer - dt);

      // 平滑恢复至 5000 血
      const p = 1 - (this.endlessBaseRecoverTimer / 3.0);
      this.enemyBaseHp = Math.min(5000, Math.round(p * 5000));

      if (this.endlessBaseShieldMesh) {
        const t = performance.now() * 0.003;
        this.endlessBaseShieldMesh.material.opacity = 0.5 + Math.sin(t * 8) * 0.35;
        this.endlessBaseShieldMesh.rotation.z = t * 1.5;
        const scalePulse = 1.0 + Math.sin(t * 12) * 0.08;
        this.endlessBaseShieldMesh.scale.set(scalePulse, scalePulse, 1);
      }
      if (Math.random() < 0.25) {
        this.effects?.summon?.(ENEMY_BASE_X + (Math.random() - 0.5) * 1.5, 0, 0x4ade80);
      }
      if (this.endlessBaseShieldTimer <= 0) {
        this.removeEndlessBaseShield();
        this.enemyBaseHp = 5000;
        this.ui?.showBattleBanner?.('敌寨重生', '大本营护盾消散，5000血量重整！', 1600);
      }
    }
  },`;

const replace1 = `    // 2) 普通友方单位：击退至中场 (-3.0 ~ -0.5) 并受到可调反噬伤害
    const tuning = EndlessManager.getTuning();
    const reboundRatio = tuning.enemyBaseReboundRatio ?? 0.80;
    const invincibleTime = tuning.enemyBaseInvincibleTime ?? 3.0;

    for (const u of this.entities) {
      if (!u.alive || u.side !== 'player') continue;
      if (u.unit?.building) continue;

      const isHeroUnit = u.isHero || u === this.getHeroTargetObj?.() || (u.unit && u.unit.hero);
      if (!isHeroUnit) {
        const targetMidX = -1.0 - Math.random() * 2.5;
        u.x = Math.min(u.x, targetMidX);
        if (u.mesh) u.mesh.position.x = u.x;
        const dmg = Math.round(u.maxHp * reboundRatio);
        this.applyDamage(u, dmg, null, { isBaseExplosion: true });
        if (this.effects?.blood) this.effects.blood(u.x, 1.0, u.z, 3);
      }
    }

    // 启动敌寨无敌金光护盾与平滑回血动画 (0 -> maxBaseHp)
    this.endlessBaseShieldTimer = invincibleTime;
    this.endlessBaseRecoverTimer = invincibleTime;
    this.enemyBaseHp = 0;
    this.createEndlessBaseShield();
  },

  // 敌寨无敌护盾 3D 呈现（敌军大本营保持金光护盾，不用改动）
  createEndlessBaseShield() {
    this.removeEndlessBaseShield();
    const ringGeo = new THREE.RingGeometry(2.6, 3.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc9a25e,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shield = new THREE.Mesh(ringGeo, ringMat);
    shield.rotation.x = -Math.PI / 2;
    shield.position.set(ENEMY_BASE_X, 0.45, 0);
    this.scene.scene.add(shield);
    this.endlessBaseShieldMesh = shield;
  },

  removeEndlessBaseShield() {
    if (this.endlessBaseShieldMesh) {
      this.scene.scene.remove(this.endlessBaseShieldMesh);
      this.endlessBaseShieldMesh.geometry?.dispose();
      this.endlessBaseShieldMesh.material?.dispose();
      this.endlessBaseShieldMesh = null;
    }
  },

  updateEndlessBaseShield(dt) {
    if (this.endlessBaseShieldTimer > 0) {
      const tuning = EndlessManager.getTuning();
      const maxBaseHp = tuning.enemyBaseMaxHp ?? 5000;
      const totalInvincible = tuning.enemyBaseInvincibleTime ?? 3.0;

      this.endlessBaseShieldTimer = Math.max(0, this.endlessBaseShieldTimer - dt);
      this.endlessBaseRecoverTimer = Math.max(0, this.endlessBaseRecoverTimer - dt);

      // 平滑恢复至 maxBaseHp 血
      const p = 1 - (this.endlessBaseRecoverTimer / Math.max(0.1, totalInvincible));
      this.enemyBaseHp = Math.min(maxBaseHp, Math.round(p * maxBaseHp));

      if (this.endlessBaseShieldMesh) {
        const t = performance.now() * 0.003;
        this.endlessBaseShieldMesh.material.opacity = 0.5 + Math.sin(t * 8) * 0.35;
        this.endlessBaseShieldMesh.rotation.z = t * 1.5;
        const scalePulse = 1.0 + Math.sin(t * 12) * 0.08;
        this.endlessBaseShieldMesh.scale.set(scalePulse, scalePulse, 1);
      }
      if (Math.random() < 0.25) {
        this.effects?.summon?.(ENEMY_BASE_X + (Math.random() - 0.5) * 1.5, 0, 0x4ade80);
      }
      if (this.endlessBaseShieldTimer <= 0) {
        this.removeEndlessBaseShield();
        this.enemyBaseHp = maxBaseHp;
        this.ui?.showBattleBanner?.('敌寨重生', \`大本营护盾消散，\${maxBaseHp}血量重整！\`, 1600);
      }
    }
  },`;

if (!norm.includes(target1)) {
  console.error("target1 not found in waves.js!");
  process.exit(1);
}
norm = norm.replace(target1, replace1);

// Replace 2: updateEndlessWaves & startEndlessWave tuning integration
const target2 = `    // 和关卡模式一样：固定间隔时间推进下一波（每隔一段时间出一波兵，非等上一波兵死绝才出）(#3)
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
    }`;

const replace2 = `    // 和关卡模式一样：固定间隔时间推进下一波（从调校面板读取数值）(#3)
    const tuning = EndlessManager.getTuning();
    const ENDLESS_WAVE_INTERVAL = tuning.waveInterval ?? 20.0;
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
    const tuning = EndlessManager.getTuning();
    // 遵照调校数值公式：敌人当前属性 = 初始属性 + (当前波波次数 - 1) * 初始属性 * waveStatGrowth
    const statGrowth = tuning.waveStatGrowth ?? 0.05;
    const waveMul = 1.0 + (wave - 1) * statGrowth;
    const hpMul = waveMul;
    const atkMul = waveMul;

    this.ui?.showBattleBanner?.(
      isBossWave ? \`第 \${wave} 波 · 强敌降临\` : \`第 \${wave} 波\`,
      isBossWave ? '首领现世，斩将夺魁！' : '敌军兵锋递增，坚守阵线！',
      2000
    );
    audio.drum(null, true, 0.4);

    // 敌人出兵数量限制：由数值调校面板配置
    const baseSoldiers = tuning.waveBaseSoldiers ?? 5;
    const stepWaves = tuning.waveSoldierStep ?? 5;
    const stepInc = tuning.waveSoldierIncrement ?? 2;
    const totalSoldiers = baseSoldiers + Math.floor((wave - 1) / stepWaves) * stepInc;

    // 敌方传奇卡（霹雳车）出兵限制
    const unlockWave = tuning.legendaryUnlockWave ?? 10;
    const canHaveLegendary = (wave >= unlockWave);
    const maxLegendary = canHaveLegendary ? Math.floor(wave * (tuning.legendaryRatio ?? 0.10)) : 0;

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
    }`;

if (!norm.includes(target2)) {
  console.error("target2 not found in waves.js!");
  process.exit(1);
}
norm = norm.replace(target2, replace2);

// Replace 3: updateEndlessRegen
const target3 = `  // 3. 肉鸽增益持续生效：全队回血
  updateEndlessRegen(dt) {
    if (!this.endlessBuffs?.teamRegen) return;
    this._endlessRegenTick = (this._endlessRegenTick || 0) + dt;
    if (this._endlessRegenTick >= 1.0) {
      this._endlessRegenTick -= 1.0;
      const regenRate = this.endlessBuffs.teamRegen;
      for (const e of this.entities) {
        if (e.alive && e.side === 'player' && !e.unit?.building) {
          const heal = Math.round(e.maxHp * regenRate);
          e.hp = Math.min(e.maxHp, e.hp + heal);
          if (this.effects?.summon && Math.random() < 0.2) {
            this.effects.summon(e.x, 0, 0x4ade80);
          }
        }
      }
      if (this.isHeroAlive?.()) {
        const heroHeal = Math.round(this.heroMaxHp * regenRate);
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + heroHeal);
      }
    }
  },`;

const replace3 = `  // 3. 肉鸽增益持续生效：全队回血（恢复特效统一为脚下绿色光环）
  updateEndlessRegen(dt) {
    if (!this.endlessBuffs?.teamRegen) return;
    this._endlessRegenTick = (this._endlessRegenTick || 0) + dt;
    if (this._endlessRegenTick >= 1.0) {
      this._endlessRegenTick -= 1.0;
      const regenRate = this.endlessBuffs.teamRegen;
      for (const e of this.entities) {
        if (e.alive && e.side === 'player' && !e.unit?.building) {
          const heal = Math.round(e.maxHp * regenRate);
          e.hp = Math.min(e.maxHp, e.hp + heal);
          // 恢复特效统一为脚下绿色光环
          if (this.effects?.heal && Math.random() < 0.25) {
            this.effects.heal(e.x, 0, e.z);
          }
        }
      }
      if (this.isHeroAlive?.()) {
        const heroHeal = Math.round(this.heroMaxHp * regenRate);
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + heroHeal);
        if (this.effects?.heal && Math.random() < 0.35) {
          this.effects.heal(this.heroX, 0, this.heroZ);
        }
      }
    }
  },`;

if (!norm.includes(target3)) {
  console.error("target3 not found in waves.js!");
  process.exit(1);
}
norm = norm.replace(target3, replace3);

const isCRLF = waves.includes('\r\n');
fs.writeFileSync('E:/taptapgame/inkwar/code/src/battle/waves.js', isCRLF ? norm.replace(/\n/g, '\r\n') : norm, 'utf8');
console.log('Successfully updated waves.js with endless tuning and heal ring!');
