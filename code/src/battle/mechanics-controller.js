// 墨阵山河 - 机制关与战场规则控制器 (MechanicsController)
// 依据《墨阵山河_制作规划与修改方向_v1.0.md》§5.2 & §5.3

export class MechanicsController {
  constructor(battle) {
    this.battle = battle;
    this.level = battle.level || {};
    this.mechanic = this.level.mechanic || null;
    this.weather = this.level.weather || 'clear';
    this.isEndless = !!this.level.isEndless;
    this.isDailyChallenge = !!this.level.isDailyChallenge;

    // 机制关状态
    this.holdTimer = (this.mechanic === 'hold') ? 60 : 0;
    this.escortCart = null;
    this.flankTriggered = false;
    this.supplyCut = (this.mechanic === 'cut_supply');

    // 无尽模式状态
    this.endlessWave = 1;
    this.endlessWaveTimer = 0;
    this.hasUsedRevive = false;

    // 战意与天气修正
    this.applyWeatherRules();
    this.applyMechanicInit();
  }

  applyWeatherRules() {
    const w = this.weather;
    // §5.3 天气规则化
    // 雾：远程射程 -20%
    if (w === 'fog') {
      this.battle.rangeMul = 0.80;
    }
    // 雨：泥泞（骑兵移速 -15%、冲锋伤害 -20%、火系伤害 -30%）
    else if (w === 'rain') {
      this.battle.speedMulWeather = 0.88;
      this.battle.cavalrySpeedMul = 0.85;
      this.battle.cavalryChargeMul = 0.80;
      this.battle.fireDamageMul = 0.70;
    }
    // 夜：视野缩短，远程射程 -15%
    else if (w === 'night') {
      this.battle.rangeMul = 0.85;
    }
    // 血战：双方伤害 ×1.2
    if ((this.level.tags || []).includes('血战') || this.level.bloodPact) {
      this.battle.damageMul = 1.2;
    }
  }

  applyMechanicInit() {
    // 断粮：自然回复减半，击杀回令翻倍
    if (this.supplyCut) {
      this.battle.energyRegenMul *= 0.5;
      this.battle.killEnergyBonus = 2; // 击杀额外回2军令
    }

    // 护送：初始延迟生成粮车
    if (this.mechanic === 'escort') {
      this.escortSpawnTimer = 2.0;
    }
  }

  update(dt) {
    if (this.battle.state !== 'running' || this.battle.paused) return;

    // 1. 守点机制更新 (hold)
    if (this.mechanic === 'hold') {
      this.holdTimer -= dt;
      if (this.holdTimer <= 0) {
        this.holdTimer = 0;
        // 守住 60 秒敌军溃散
        this.battle.ui.showBattleBanner('防守成功', '六十秒坚守大捷！', 2000);
        // 清空场上所有敌军并直接判胜
        this.battle.enemyBaseHp = 0;
        this.battle.finish(true);
        return;
      }
    }

    // 2. 护送粮车更新 (escort)
    if (this.mechanic === 'escort') {
      if (this.escortSpawnTimer > 0) {
        this.escortSpawnTimer -= dt;
        if (this.escortSpawnTimer <= 0) {
          this.spawnEscortCart();
        }
      } else if (this.escortCart) {
        // 粮车存活与推进判断
        if (this.escortCart.hp <= 0) {
          this.battle.ui.showBattleBanner('粮车被焚', '辎重尽毁，功亏一篑', 2200);
          this.battle.baseHp = 0;
          this.battle.finish(false);
          return;
        }
        // 粮车抵达敌寨 (x >= 11)
        if (this.escortCart.x >= 11) {
          this.battle.ui.showBattleBanner('辎重安抵', '粮道贯通，全军大胜！', 2200);
          this.battle.enemyBaseHp = 0;
          this.battle.finish(true);
          return;
        }
      }
    }

    // 3. 夹击机制 (flank)
    if (this.mechanic === 'flank' && !this.flankTriggered) {
      if (this.battle.elapsed >= 15) {
        this.flankTriggered = true;
        this.triggerFlankAmbush();
      }
    }
  }

  spawnEscortCart() {
    // 生成粮车单位
    const cart = {
      uid: ++this.battle.uid,
      type: 'cart',
      name: '补给粮车',
      team: 'player',
      x: -12.5,
      z: 0,
      hp: 2400,
      maxHp: 2400,
      atk: 0,
      def: 8,
      speed: 0.42,
      range: 0,
      isEscortCart: true,
      tags: ['building', 'cart'],
      state: 'move',
      width: 1.4,
      height: 1.2
    };
    this.battle.entities.push(cart);
    this.escortCart = cart;
    if (this.battle.scene && this.battle.scene.addUnit) {
      this.battle.scene.addUnit(cart);
    }
    this.battle.ui.showBattleBanner('粮车启程', '全力护送粮车至敌寨', 2000);
  }

  triggerFlankAmbush() {
    this.battle.ui.showBattleBanner('侧翼伏击', '两翼受敌，提防后方！', 2000);
    if (this.battle.effects && this.battle.effects.onShake) {
      this.battle.effects.onShake(0.18, 0.4);
    }
    // 从玩家后方侧排刷入精锐刺客与轻骑
    const flankUnits = [
      { type: 'assassin', x: -10, z: -1.4 },
      { type: 'cavalry', x: -9.5, z: 1.4 }
    ];
    for (const u of flankUnits) {
      const enemy = {
        uid: ++this.battle.uid,
        type: u.type,
        name: '侧翼突袭兵',
        team: 'enemy',
        x: u.x,
        z: u.z,
        hp: 350,
        maxHp: 350,
        atk: 22,
        def: 2,
        speed: 1.1,
        range: 1.2,
        state: 'move',
        tags: ['cavalry', 'assassin']
      };
      this.battle.entities.push(enemy);
      if (this.battle.scene && this.battle.scene.addUnit) {
        this.battle.scene.addUnit(enemy);
      }
    }
  }

  // 广告复活 (单局 1 次)
  reviveEndless() {
    if (this.hasUsedRevive) return false;
    this.hasUsedRevive = true;
    // 恢复玩家基地 50% 生命
    this.battle.baseHp = Math.round(this.battle.baseMaxHp * 0.5);
    // 清空场上所有敌方非大本营单位
    for (const e of this.battle.entities) {
      if (e.team === 'enemy') {
        e.hp = 0;
      }
    }
    this.battle.state = 'running';
    this.battle.paused = false;
    this.battle.ui.showBattleBanner('墨影再起', '绝地逢生，全屏清剿！', 2200);
    return true;
  }
}
