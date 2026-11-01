// 《墨阵山河》英雄数据 v2.0 —— 十二天王黄金阵容（6 位关卡推进解锁 + 6 位祈将台广告抽取）
// 数据驱动：每位英雄独占一种颠覆战局的核心机制（突进/背刺/斩首/八卦/黑洞/飞剑/潜行/巨化/闪击/反伤/长城/魅惑）
// 主题为「机制优先」：拒绝数值同质化，选不同将领即代表完全不同的作战流派！
// theme 为主题色（技能特效用），look 为三渲二低模造型

export const HEROES = [
  // ==================== 一、关卡推进解锁（6 位名将） ====================
  {
    id: 'zhaoyun', archetype: 'commander', canAdvisor: true, name: '赵云', title: '常胜将军', unlockLevel: 0,
    quote: '血染征袍透甲红，当阳谁敢与争锋。',
    theme: 0x7fb3a5,
    passive: {
      name: '一身是胆',
      unlockLevel: 3,
      desc: '【3级解锁被动】孤胆勇士：生命低于 50% 时受到伤害降低 25%，破阵三连戳伤害 30% 转化为吸血；身周光环友军攻速 +18%，每秒回复 1.5% 生命。',
      template: 'auraAspd',
      radius: 9,
      value: 0.18,
      regen: 0.015,
      dmgReductionThreshold: 0.50,
      dmgReduction: 0.25,
      lifestealThrust: 0.30
    },
    active: {
      name: '白龙破阵 · 七进七出',
      desc: '【1级主动大招】化作银白龙影向前进行 7 段瞬影折返穿透刺击（每段穿透伤害并浮空），收招全军攻击 +45%、攻速 +30%、吸血 20% 持续 9 秒。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['七进七出', '一身是胆'],
      fx: { type: 'omniDragonSlash', color: 8369061 },
      effects: [
        { template: "strikeLine", length: 9, damage: 550, knockback: 2 },
        { template: "strikesMulti", count: 7, damage: 180, area: 2.2, strategy: "frontStep" },
        { template: "buffAll", atk: 0.45, aspd: 0.3, spd: 0.25, lifesteal: 0.2, duration: 9 }
      ],
    },
    gadget: {
      name: '龙威断喝',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】暴喝震退身周 3.5 米内敌军 2.2 米并减速 50% 持续 3 秒；赵云自身解控脱困并加速 60%，下一次普攻直接充能为第 4 击破阵三连戳！冷却 20 秒，冷却就绪即可使用。',
      radius: 3.5,
      knockback: 2.2,
      slow: 0.5,
      slowDuration: 3,
      speedBoost: 0.6,
      speedDuration: 3,
    },
    dynasty: "三国 · 蜀汉",
    historicalRecord: "《三国志·蜀书·赵云传》载：云身长八尺，姿颜雄伟。从刘备转战，当阳长坂之役，身抱幼主阿斗，保护甘夫人，皆得免难。汉水之战大开营门偃旗息鼓，曹军生疑退走，刘备叹曰：‘子龙一身都是胆也！’",
    appearanceRef: "身长八尺（约185cm），阔面重颐，威风凛凛。着银白鱼鳞甲配护心双圆镜，白袍披挂，头戴双翎白缨胄，腰束狮蛮宝带，足踏黑革云头靴，英姿勃发。",
    weaponHistory: "龙胆亮银枪（传世汉制透甲铁矛，枪锋呈双面破甲棱，缀朱红缨絮以惑敌目、凝血槽分流）。",
    tacticalStyle: "突阵游龙 · 单骑破军",
    look: { cloth: 0x3f6a5e, armor: 0xc9c4b4, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crest', weapon: 'spear', offhand: 'none', cape: 0xf0ead8, mount: null, size: 1.30, hero: true },
  },
  {
    id: 'hanxin', archetype: 'resource', canAdvisor: true, name: '韩信', title: '兵仙', unlockLevel: 4,
    quote: '韩信点兵，多多益善。',
    theme: 0x3a5a7a,
    passive: {
      name: '多多益善',
      unlockLevel: 3,
      desc: '【3级解锁被动】场上我方每有 4 个单位，全体攻击 +8%（至多 +40%）；韩信自身每击杀 1 名敌军额外 +3 军令。',
      template: 'countAtk', per: 4, value: 0.08, cap: 0.40, killEnergy: 3
    },
    active: {
      name: '背水一战 · 十面埋伏',
      desc: '【1级主动大招】四方天降汉军大纛天罗地网锁链捆缚敌军 2.5 秒，敌后破土杀出 5 名强化死士（+80% 属性，背刺必暴击），全军生命越低攻击越高。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['十面埋伏', '四面楚歌'], fx: { type: 'ambushFlagsNet', color: 3824250 },
      effects: [{"template":"debuffAll","stun":2.5,"vuln":0.3,"duration":8},{"template":"summonUnits","unit":"swordsman","count":5,"at":"enemyBack","empower":1.8,"lifetime":6}],
    },
    gadget: {
      name: '背水一击',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】韩信临危决断：立即恢复 10 点军令，解除自身及身周 4.5 米内所有友军的控制与减速，并赋予 4 秒内移速 +50% 与下 3 次普攻必暴击！冷却 20 秒，冷却就绪即可使用。',
      radius: 4.5,
      energy: 10,
      speedBoost: 0.5,
      duration: 4.0,
    },
    dynasty: "西汉 · 开国功臣",
    historicalRecord: "《史记·淮阴侯列传》：汉初三杰之一。言‘多多益善’。明修栈道暗度陈仓，井陉背水一战以弱胜强，潍水囊沙斩龙且，垓下十面埋伏定楚汉天下。萧何赞为‘国士无双’。",
    appearanceRef: "面目清瘦冷峻，剑眉星目，目光如炬。着玄黑轻铁叶连缀甲，腰悬布衣寒芒佩剑，风动玄青大氅，手持军师羽檄，神色渊深若古井无波。",
    weaponHistory: "淮阴三尺青锋佩剑（汉式八面青铜与精钢锻打佩剑，古朴刚正，昔年跨下受辱时佩之，后定鼎九州）。",
    tacticalStyle: "奇正无穷 · 全军统御",
    look: { cloth: 0x2f4a5a, armor: 0x8a8a7a, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'brim', weapon: 'sword', offhand: 'none', cape: 0x2f4a5a, mount: null, size: 1.30, hero: true, banner: 0x3a5a7a },
  },
  {
    id: 'guanyu', archetype: 'warrior', canAdvisor: false, name: '关羽', title: '武圣', unlockLevel: 5,
    quote: '青龙偃月，忠义千秋。',
    theme: 0x3f8a5a,
    passive: {
      name: '军威',
      unlockLevel: 3,
      desc: '【3级解锁被动】全体友军最大生命 +22%；关羽自身普攻为 180° 青龙顺劈，三刀积满刀意后下一击化为双倍伤害拖刀斩。',
      template: 'hpBuff', tag: null, value: 0.22
    },
    active: {
      name: '青龙显圣 · 偃月开天',
      desc: '【1级主动大招】天降百丈青龙偃月刀虚影破云暴斩立劈，撕开翡翠地裂造成 850 范围巨额伤害与击飞；非首领且生命低于 35% 直接受龙魂处决。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['偃月开天', '威震华夏'], fx: { type: 'celestialGlaive', color: 4164186 },
      effects: [{"template":"strikeLine","length":9.5,"damage":850,"knockback":2.5,"execute":0.35}],
    },
    gadget: {
      name: '拖刀回斩',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】关羽闪身拖刀 360° 横扫：对身周 4 米内所有敌军造成 380 斩击伤害并附带致盲失准 3 秒，关羽刀意直接蓄满 3 层，下一刀立刻释放双倍暴烈拖刀斩！冷却 20 秒，冷却就绪即可使用。',
      radius: 4.0,
      damage: 380,
      blindDuration: 3.0,
    },
    dynasty: "三国 · 蜀汉",
    historicalRecord: "《三国志·蜀书·关羽传》：身长九尺，髯长二尺，面如重枣，唇若涂脂。温酒斩华雄，斩颜良于万人之中。建安二十四年水淹七军，擒于禁斩庞德，威震华夏，曹操欲迁都以避其锐。",
    appearanceRef: "身长九尺（约207cm），美须髯飘拂胸前。青龙绿罗战袍半披，内着金锁连环明光重铠，狮吞腹护，眉如卧蚕，丹凤微合，神威凛然天成。",
    weaponHistory: "青龙偃月刀（又名‘冷艳锯’，刀重八十二斤，刀身盘金龙，背有偃月歧刃，劈斩势大力沉如劈山碎岳）。",
    tacticalStyle: "万人难敌 · 斩将搴旗",
    look: { cloth: 0x2f5a3a, armor: 0x6b746d, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crest', plume: true, weapon: 'glaive', bladeEdge: 0x3f8a5a, weaponScale: 1.18, offhand: 'none', cape: 0x2f6a4a, mount: null, size: 1.34, hero: true, beard: true },
  },
  {
    id: 'zhugeliang', archetype: 'tactician', canAdvisor: true, name: '诸葛亮', title: '卧龙', unlockLevel: 15,
    quote: '鞠躬尽瘁，死而后已。',
    theme: 0x8a8478,
    passive: {
      name: '八阵',
      unlockLevel: 3,
      desc: '【3级解锁被动】每 6 秒为全军添加 10% 最大生命护盾；自身 7 格远程雷火链击，被近身时自动将敌人弹开 3 格。',
      template: 'shieldRegen', interval: 6, value: 0.10
    },
    active: {
      name: '奇门遁甲 · 逆天八阵',
      desc: '【1级主动大招】展开 16 米太极八卦水墨大阵：阵内敌军攻速与移速降低 70%，其 50% 伤害逆转为对我方治疗，期间连续轰落 3 颗天火陨石（各 450 伤害）。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['奇门八阵', '逆转阴阳'], fx: { type: 'baguaDomain', color: 9077880 },
      effects: [{"template":"fieldDot","mode":"global","dps":180,"slow":0.7,"duration":7},{"template":"strikesMulti","count":3,"damage":450,"area":2.8,"stun":1.5,"strategy":"frontStep"}],
    },
    gadget: {
      name: '东风狂岚',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】诸葛亮挥动八卦白羽扇借调天地风势：向前呼引狂暴东风，击退前方 8 米扇形内所有敌军 4.5 米并眩晕 1.5 秒，战场所有友军获得 5 秒 30% 移速加速！冷却 20 秒，冷却就绪即可使用。',
      radius: 8.0,
      knockback: 4.5,
      stunDuration: 1.5,
      speedBoost: 0.3,
    },
    dynasty: "三国 · 蜀汉",
    historicalRecord: "《三国志·蜀书·诸葛亮传》：身长八尺，容貌甚伟。躬耕陇亩，隆中策天下三分。赤壁结盟借东风，草船借箭，智绝古今。六出祁连，病逝五丈原，‘鞠躬尽瘁，死而后已’。",
    appearanceRef: "身长八尺（约184cm），清癯高古。头戴黑色纶巾，身被鹤氅云纹广袖白袍，眉目间天地星斗万象罗列，手持白羽鹅毛扇，端坐四轮水墨木车。",
    weaponHistory: "奇门八阵图天机白羽扇（以天鹅白羽与乾坤机关骨架精制，挥动间奇门遁甲六十四卦星转斗移）。",
    tacticalStyle: "神机莫测 · 奇门布阵",
    look: { cloth: 0x6b746d, armor: 0x8a8a7a, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crown', weapon: 'fan', offhand: 'none', cape: 0x2f4a5a, mount: null, size: 1.30, hero: true, beard: true },
  },
  {
    id: 'lvbu', archetype: 'warrior', canAdvisor: false, name: '吕布', title: '无双', unlockLevel: 20,
    quote: '人中吕布，马中赤兔。',
    theme: 0xb23a2f,
    passive: {
      name: '天下无双',
      unlockLevel: 3,
      desc: '【3级解锁被动】半径 9 米内敌军攻击 -30%；吕布自身可同时阻挡 4 人，普攻吸血 25%，每击杀 1 名敌军全军移速+5%、攻速+5%（至多叠 5 层）。',
      template: 'auraAtkDown', radius: 9, value: 0.30
    },
    active: {
      name: '修罗降世 · 鬼神无双',
      desc: '【1级主动大招】方天画戟爆发赤黑吸力聚怪，高速狂暴大旋风斩 4 圈（共 1200 伤害），进入 8 秒霸体免控并吸血 35%。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['修罗无双', '弑天煞风'], fx: { type: 'demonStorm', color: 11680303 },
      effects: [{"template":"vacuumPull","radius":7.5},{"template":"aoeAround","radius":7.5,"damage":300,"stun":1.8,"knockback":2.5,"hits":4}],
    },
    gadget: {
      name: '辕门射戟',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】吕布搭弓射出修罗画戟重矢：贯穿整条单线路径，对沿途敌军造成 520 穿透物理伤害并强制眩晕 2 秒，自身获得 5 秒 35% 攻速狂暴！冷却 20 秒，冷却就绪即可使用。',
      damage: 520,
      stunDuration: 2.0,
      aspdBoost: 0.35,
    },
    dynasty: "三国 · 群雄",
    historicalRecord: "《三国志·魏书·吕布传》：布便弓马，膂力过人，号为‘飞将’。时人语曰：‘人中有吕布，马中有赤兔。’虎牢关前一人拒十八路诸侯，辕门射戟百步穿杨惊破纪灵。",
    appearanceRef: "顶束发紫金冠，披百花蜀锦百花战袍，擐唐猊连环铠，系狮蛮宝带，体型昂藏九尺。双眼如狂暴饿虎，傲视天下群雄。",
    weaponHistory: "方天画戟（长一丈二尺，双耳月牙护刃，杆缠画金蟠龙，能刺、能砍、能勾、能斩，杀气滔天）。",
    tacticalStyle: "神鬼乱舞 · 天下无双",
    look: { cloth: 0x242424, armor: 0x3a3a3a, trim: 0xb23a2f, skin: 0xd8c3a1, helmet: 'crest', weapon: 'halberd', weaponScale: 1.16, offhand: 'none', cape: 0xb23a2f, mount: null, size: 1.34, hero: true, plume: true },
  },
  {
    id: 'libai', archetype: 'ambush', canAdvisor: true, name: '李白', title: '青莲', unlockLevel: 25,
    quote: '十步杀一人，千里不留行。',
    theme: 0xd8dce8,
    passive: {
      name: '醉仙剑意',
      unlockLevel: 3,
      desc: '【3级解锁被动】军令回复速度 +35%；自身普攻为 4 格中距青莲剑气，每第 3 击沿直线穿透 3 名敌军，自身暴击率 +25%。',
      template: 'energyRegen', value: 0.35
    },
    active: {
      name: '大河之剑 · 青莲剑阵',
      desc: '【1级主动大招】展开青莲剑界，18 支 3D 水墨飞剑自九天俯冲插地，造成 980 范围伤害并提升全军暴击与易伤。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['万剑朝宗', '青莲剑界'], fx: { type: 'skySwords', color: 14212328 },
      effects: [{"template":"skySwords","length":11.5,"damage":980,"count":18,"knockback":0.15},{"template":"buffAll","crit":0.5,"duration":8},{"template":"debuffAll","vuln":0.35,"duration":6}],
    },
    gadget: {
      name: '将进酒',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】李白化作剑影瞬影前冲 4.5 米贯穿敌阵：对沿途敌军造成 350 剑气伤害并定身 1.5 秒，自身获得 3 秒 50% 闪避率与必暴击！冷却 20 秒，冷却就绪即可使用。',
      dashDistance: 4.5,
      damage: 350,
      rootDuration: 1.5,
      dodgeRate: 0.5,
    },
    dynasty: "盛唐 · 诗仙剑侠",
    historicalRecord: "《新唐书·李白传》：字太白，少任侠，喜击剑，为任侠。裴旻剑舞、张旭狂草与李白诗歌并称‘盛唐三绝’。豪放不羁，‘十步杀一人，千里不留行’，醉草吓蛮书，千古诗剑双绝。",
    appearanceRef: "白衣飘逸出尘，腰悬青铜古酒葫芦，发丝在风中狂放飞扬，腰佩三尺古汉剑，神情狂傲不羁，剑气与酒香扑面而来。",
    weaponHistory: "青莲三尺青锋剑（八面精钢汉剑制式，剑脊中正锋锐异常，随行任侠游历五岳名山）。",
    tacticalStyle: "剑破虚空 · 诗剑纵横",
    look: { cloth: 0xf0ead8, armor: 0x9ab0a5, trim: 0x4b7a6a, skin: 0xd8c3a1, helmet: 'bun', weapon: 'sword', offhand: 'gourd', cape: 0x3f6a5e, mount: null, size: 1.30, hero: true },
  },

  // ==================== 二、祈将台奖池（6 位顶级欲望神将） ====================
  {
    id: 'sunwu', archetype: 'tactician', canAdvisor: false, name: '孙武', title: '兵圣', gacha: true,
    quote: '知己知彼，百战不殆。',
    theme: 0x7a9a7a,
    passive: {
      name: '谋定知彼',
      unlockLevel: 3,
      desc: '【3级解锁被动】全体友军护甲 +18；自身脱战 1.5 秒自动隐匿，破隐第一刀造成 2.5 倍背刺伤害，全军对受克制敌军增伤提升至 1.5 倍。',
      template: 'tagArmor', tag: null, value: 18
    },
    active: {
      name: '兵圣天宪 · 风林火山',
      desc: '【1级主动大招】展开孙子兵法古卷：全军进入水墨半透隐匿（敌军无法索敌），破隐一击必暴击；随后全军获得 40% 免伤霸体 8 秒。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['风林火山', '知己知彼'], fx: { type: 'sunwuScroll', color: 8034938 },
      effects: [{"template":"buffAll","spd":0.5,"crit":1,"def":0.4,"duration":8},{"template":"debuffAll","atkDown":0.4,"vuln":0.3,"duration":8}],
    },
    gadget: {
      name: '其徐如林',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】孙武催动阵图：自身立即进入 3.5 秒深度隐匿，同时使身周 6 米内所有友军获得 4 秒 40% 伤害减免与免控护体！冷却 20 秒，冷却就绪即可使用。',
      stealthDuration: 3.5,
      auraRadius: 6.0,
      dmgReduction: 0.4,
    },
    dynasty: "春秋 · 兵圣",
    historicalRecord: "《史记·孙子吴起列传》载：字长卿，齐人也。以兵法见于吴王阖庐。阖庐试之妇人，斩二人以明军纪。西破强楚，入郢，北威齐晋，显名诸侯，孙子与有力焉。著《孙子兵法》十三篇，被尊为‘百世兵家之师’。",
    appearanceRef: "面容古雅庄重，须发微白而神采飞扬。着深青暗纹布衣外罩青铜甲胄，手握竹简兵书，双目深邃洞察万里山川。",
    weaponHistory: "青铜削与吴钩佩剑（春秋青铜短剑，锋刃弯回，刻‘风林火山’铭文）。",
    tacticalStyle: "风林火山 · 奇正相生",
    look: { cloth: 0x5a7a5a, armor: 0x8a8a7a, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'bun', weapon: 'sword', offhand: 'none', cape: 0x7a9a7a, mount: null, size: 1.30, hero: true, beard: true },
  },
  {
    id: 'weiqing', archetype: 'commander', canAdvisor: true, name: '卫青', title: '大将军', gacha: true,
    quote: '七击匈奴，直捣龙城。',
    theme: 0x4b7a6a,
    passive: {
      name: '汉匈决战',
      unlockLevel: 3,
      desc: '【3级解锁被动】全体友军最大生命 +18%，骑兵与轻甲部队攻速 +25%，对首领与精英单位增伤 20%。',
      template: 'hpBuff', tag: null, value: 0.18
    },
    active: {
      name: '封疆万里 · 大将军印',
      desc: '【1级主动大招】大将军青玉印泰山盖顶轰砸敌阵，近战友军体型放大 25% 附带金辉与金色战威光环 9 秒；横扫前方造成 650 伤害与大幅震退。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['龙城横扫', '瀚海无双'], fx: { type: 'weiqingGeneralSeal', color: 4946538 },
      effects: [{"template":"strikeLine","length":8.5,"damage":650,"knockback":2.2},{"template":"buffAll","atk":0.35,"spd":0.45,"def":0.4,"duration":9}],
    },
    gadget: {
      name: '整军备战',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】大将军挥旗号令全军固守：为全场所有我方单位施加金戈坚甲护盾（吸收相当于其最大生命 25% 的伤害，持续 5 秒），护盾期间受到击退距离降低 80%！冷却 20 秒，冷却就绪即可使用。',
      shieldPercent: 0.25,
      duration: 5.0,
    },
    dynasty: "西汉 · 大将军",
    historicalRecord: "《史记·卫将军骠骑列传》：字仲卿。七出匈奴，奇袭龙城揭开汉匈反击序幕，收复河套，漠北决战击溃单于主力。战功卓绝而谦逊下士，武帝拜为大将军、大司马，封长平侯。",
    appearanceRef: "身形端凝沉稳，神情坚毅谦和。着大汉大将军金螭明光甲，佩汉家节度令符与虎符，外罩暗绿云锦披风，治军谨严，渊渟岳峙。",
    weaponHistory: "大汉天子亲授斩马剑与将军青铜令印（节制大汉全部北方兵马之金石信物）。",
    tacticalStyle: "汉武军魂 · 稳健扫平",
    look: { cloth: 0x3f6a5e, armor: 0x8a8a7a, trim: 0xc9a25e, skin: 0xd8c3a1, helmet: 'crest', weapon: 'sword', offhand: 'none', cape: 0x4b7a6a, mount: null, size: 1.30, hero: true },
  },
  {
    id: 'huoqubing', archetype: 'warrior', canAdvisor: true, name: '霍去病', title: '冠军侯', gacha: true,
    quote: '匈奴未灭，何以家为。',
    theme: 0xc9a25e,
    passive: {
      name: '勇冠三军',
      unlockLevel: 3,
      desc: '【3级解锁被动】全军骑兵攻击 +25%；霍去病自身拥有双倍移速，连续移动 1.5 秒后冲锋蓄势拉满造成 3 倍暴击，暴击时产生墨爆冲击波溅射 50% 伤害。',
      template: 'tagAtk', tag: 'cavalry', value: 0.25
    },
    active: {
      name: '千里奔袭 · 封狼居胥',
      desc: '【1级主动大招】重置全军骑兵冲锋，天降破晓神光召唤 2 名大汉骠骑白马义从（+50% 属性，持续 20 秒），全军冲锋附带 3 倍暴击与大击退。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['封狼居胥', '瀚海破浪'], fx: { type: 'cavalryThunder', color: 13214302 },
      effects: [{"template":"massCharge","spd":0.6,"atk":0.4,"duration":10,"fear":1},{"template":"summonUnits","unit":"whitehorse","count":2,"at":"leftWing","empower":1.5,"lifetime":20}],
    },
    gadget: {
      name: '长驱直入',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】冠军侯策马铁蹄冲锋：向前猛冲 5 米撞飞沿途敌军 2.5 米造成 300 冲击伤害，自身冲锋蓄势立即拉满，下一刀必定触发 3 倍毁灭暴击！冷却 20 秒，冷却就绪即可使用。',
      dashDistance: 5.0,
      damage: 300,
      knockback: 2.5,
    },
    dynasty: "西汉 · 骠骑将军",
    historicalRecord: "《史记·卫将军骠骑列传》：十七岁两冠全军，六出祁连扫荡匈奴，深入瀚海两千余里，登狼居胥山筑坛祭天，立‘封狼居胥’之不世功勋。豪言‘匈奴未灭，何以家为！’",
    appearanceRef: "青年少壮，锐气逼人。着大汉鎏金细鳞锁子甲，绯红锦缎征袍迎风怒张，额系束发紫金冠，目光明澈如鹰隼疾顾，长靴跨神骏。",
    weaponHistory: "大汉精铁马槊与斩马长刀（汉武帝御赐上林苑工官精锻冷锻铁矛，利于高速骑战突刺贯穿）。",
    tacticalStyle: "千里奔袭 · 铁骑雷霆",
    look: { cloth: 0x8a6a3a, armor: 0xc9c4b4, trim: 0xd8b25a, skin: 0xd8c3a1, helmet: 'cone', weapon: 'spear', offhand: 'none', cape: 0xc9a25e, mount: null, size: 1.30, hero: true },
  },
  {
    id: 'wuzetian', archetype: 'resource', canAdvisor: true, name: '武则天', title: '则天女皇', gacha: true,
    quote: '日月当空，千秋功过。',
    theme: 0xd8b25a,
    passive: {
      name: '垂拱而治',
      unlockLevel: 3,
      desc: '【3级解锁被动】每 15 秒额外增加 4 点军令；受近战攻击反弹 30% 真实伤害，阵亡后原地留金碑震击 8 秒持续减速敌军。',
      template: 'energyTick', interval: 15, amount: 4
    },
    active: {
      name: '日月凌空 · 无字丰碑',
      desc: '【1级主动大招】乾陵汉白玉无字丰碑轰顶镇压敌阵核心造成 800 范围冲击与眩晕；全军获得 70% 黄金护盾 8 秒，期间受击 50% 真实反伤。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['日月凌空', '凰权降世'], fx: { type: 'wordlessMonument', color: 14201434 },
      effects: [{"template":"aoeAround","radius":5.5,"damage":800,"stun":2},{"template":"healShield","shield":0.7,"duration":8},{"template":"buffAll","thorns":0.5,"duration":8}],
    },
    gadget: {
      name: '天授神权',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】女皇天威御临四海：使战场上军令产出速度提升 100% 持续 6 秒，同时全场敌军受天威震慑攻击降低 35% 持续 4 秒！冷却 20 秒，冷却就绪即可使用。',
      duration: 6.0,
      atkReduction: 0.35,
    },
    dynasty: "武周 · 一代女皇",
    historicalRecord: "《旧唐书·本纪第六》：中国历史上唯一正统女皇帝。通文史，懂谋略。改国号为周，设铜匦、开殿试、创武举。治国半个世纪，使‘政启开元，治宏贞观’。立无字丰碑于乾陵，功过由后世评判。",
    appearanceRef: "头戴九旒十二珠金凤冠，身着绛纱彩云五凤盘龙帝袍，朱唇微启，明眸微睨俯瞰众生，通身皇皇天威，雍容尊贵无可比拟。",
    weaponHistory: "日月当空天枢神权玉圭（和阗羊脂白玉所雕帝王玉圭，勾勒日、月、空三才神印，聚万民皇威）。",
    tacticalStyle: "君临天下 · 万象归心",
    look: { cloth: 0x8a6a2a, armor: 0xc9c4b4, trim: 0xd8b25a, skin: 0xd8c3a1, helmet: 'crown', weapon: 'staff', offhand: 'none', cape: 0xd8b25a, mount: null, size: 1.30, hero: true },
  },
  {
    id: 'mengtian', archetype: 'guardian', canAdvisor: true, name: '蒙恬', title: '笔祖将军', gacha: true,
    quote: '北筑长城，却匈奴七百余里。',
    theme: 0x2a2a24,
    passive: {
      name: '固塞金汤',
      unlockLevel: 3,
      desc: '【3级解锁被动】所有防御建筑生命上限 +35%，免伤 15%；蒙恬自身自带 20% 减伤护体，可同时阻挡 3 名敌军。',
      template: 'buildingHp', value: 0.35
    },
    active: {
      name: '万里长城 · 墨笔山河金汤',
      desc: '【1级主动大招】如椽秦笔挥毫勾勒出一座 3500 耐久大秦万里长城城楼阻绝近战与箭矢 18 秒；城楼后我军远程射程 +30%、攻击 +35%！开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['墨笔长城', '固若金汤'], fx: { type: 'greatWall', color: 2763300 },
      effects: [{"template":"wallAt","hp":3500,"duration":18},{"template":"buffAll","atk":0.35,"shield":0.3,"duration":10}],
    },
    gadget: {
      name: '秦弩重阵',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】在身前架设三联重弩扇形齐射，射出 9 支穿甲重箭击退前方敌军 3.5 米并附加流血，自身阻挡人数 +2 且受击免伤 30% 持续 6 秒！冷却 20 秒，冷却就绪即可使用。',
      knockback: 3.5,
      damageReduction: 0.3,
      duration: 6.0,
    },
    dynasty: "秦朝 · 中华第一勇士",
    historicalRecord: "《史记·蒙恬列传》：名将之后。秦统一六国后，率三十万秦军北击匈奴，收复河南地，筑万里长城万余里，修筑直道。贾谊《过秦论》赞：‘却匈奴七百余里，胡人不敢南下而牧马。’又改良秦笔。",
    appearanceRef: "秦军铁统帅装束，着秦代黑漆皮甲与铜甲混编，头戴双鹖冠，身长魁梧如虎熊，威严庄重，尽显大秦帝国北疆长城守护者风范。",
    weaponHistory: "大秦百炼铁矛与改良秦制蒙恬笔（文武并济，既御强敌于千里，又著功绩于简帛）。",
    tacticalStyle: "北筑万里 · 铁壁秦风",
    look: { cloth: 0x2f3a3a, armor: 0x6b746d, trim: 0x7a9a7a, skin: 0xd8c3a1, helmet: 'cone', weapon: 'spear', weaponScale: 1.15, offhand: 'none', cape: 0x5a7a6a, mount: null, size: 1.30, hero: true, beard: true },
  },
  {
    id: 'diaochan', archetype: 'tactician', canAdvisor: false, name: '貂蝉', title: '闭月', gacha: true,
    quote: '闭月羞花，连环一计倾两雄。',
    theme: 0xe0d8e8,
    passive: {
      name: '倾国倾世',
      unlockLevel: 3,
      desc: '【3级解锁被动】敌军全体攻速 -15%；自身普攻附带 25% 减速，敌军男性单位对貂蝉与身周友军造成的伤害降低 20%。',
      template: 'enemyAspdDown', value: 0.15
    },
    active: {
      name: '闭月倾城 · 镜花水月魅魂',
      desc: '【1级主动大招】天降明月与绯红花瓣风暴：策反射程内最强的三名敌军反戈作战 15 秒，被魅惑单位生命与攻击提升 100%；花瓣引爆对全场造成 580 穿透伤害并附加易伤。开局大招需攻击充能至 100%（每次普攻命中充能 5%，大招期间不充能），释放后进入 50s 冷却（期间可继续充能，充能满且冷却完毕即可再次施展）。',
      cooldown: 50,
      banner: ['闭月倾城', '镜花水月'], fx: { type: 'moonFlowerMirage', color: 14735592 },
      effects: [{"template":"charm","radius":6,"count":3,"duration":15,"empower":2},{"template":"aoeAround","radius":8,"damage":580,"stun":1.5}],
    },
    gadget: {
      name: '红袖添香',
      unlockLevel: 7,
      cooldown: 20,
      desc: '【7级专属技能·不限次数】貂蝉起舞施展回春密仪：为生命百分比最低的 3 名友军（优先含主将）瞬间回复 35% 最大生命，并赋予 4 秒每秒回复 3% 的甘霖回春光环！冷却 20 秒，冷却就绪即可使用。',
      healPercent: 0.35,
      regenPercent: 0.03,
      duration: 4.0,
    },
    dynasty: "东汉末 · 绝代佳人",
    historicalRecord: "《三国演义》：中国古代四大美女之‘闭月’。司徒王允义女，为除奸臣董卓，甘舍己身行‘连环计’，巧妙周旋于董卓、吕布之间，终使二人反目成仇，除此巨寇，救汉室于倒悬。",
    appearanceRef: "云鬓高挽，肌理如雪，眉如翠羽，眼若横波。身着轻柔月白与淡粉流云水袖仙裙，手挽彩蝶轻纱，随风起舞，如洛神降世步步生莲。",
    weaponHistory: "飞燕流云水袖与双刺金凤短钗（舞动间乱人心魄，短钗暗藏锋芒，杀机隐于倾城国色之中）。",
    tacticalStyle: "倾国倾城 · 幻蝶迷踪",
    look: { cloth: 0xd8c8d8, armor: 0xe8e2d2, trim: 0xc9a25e, skin: 0xe8d0b8, helmet: 'bun', weapon: 'dagger', offhand: 'none', cape: 0xe0d8e8, mount: null, size: 1.30, hero: true },
  },
];

const HERO_MAP = new Map(HEROES.map((h) => [h.id, h]));

export function getHero(id) {
  return HERO_MAP.get(id) || HEROES[0];
}

export function heroUnlocked(save, id) {
  return save.unlocks.heroes.includes(id);
}

// 祈将台奖池英雄（6 位顶级欲望神将）
export const GACHA_HEROES = HEROES.filter((h) => h.gacha);

// 战斗属性加成上限封顶常量（design §4.1.2）
export const COMBAT_BUFF_CAPS = {
  atk: 0.60,         // 攻击加成上限 +60%
  attackSpeed: 0.60, // 攻速加成上限 +60%
  dmgReduction: 0.45,// 减伤加成上限 45%
  speed: 0.40,       // 移速加成上限 +40%
};

// 八大原型天赋库（3/6/10 级三选一，design §4.6）
export const ARCHETYPE_TALENTS = {
  commander: {
    name: '统帅',
    t3: [
      { id: 'c3_1', name: '威震三军', desc: '光环半径 +2 格' },
      { id: 'c3_2', name: '军心凝聚', desc: '光环增益效果 +8%' },
      { id: 'c3_3', name: '旗开得胜', desc: '首次施放技能全军攻击 +10% 持续 5s' },
    ],
    t6: [
      { id: 'c6_1', name: '从容不迫', desc: '技能期间全军免疫减速' },
      { id: 'c6_2', name: '休养生息', desc: '光环内友军每 3 秒恢复 1% 最大生命' },
      { id: 'c6_3', name: '肃清诸邪', desc: '技能释放附带净化负面效果' },
    ],
    t10: [
      { id: 'c10_1', name: '金戈铁马', desc: '光环额外提供 +12% 攻击速度' },
      { id: 'c10_2', name: '磐石之阵', desc: '光环额外提供 +15% 护甲' },
      { id: 'c10_3', name: '号令山河', desc: '光环内友军全员吸血 +8%' },
    ],
  },
  warrior: {
    name: '猛将',
    t3: [
      { id: 'w3_1', name: '嗜血追斩', desc: '斩杀生命阈值 +5%' },
      { id: 'w3_2', name: '横扫千军', desc: '技能攻击范围 +15%' },
      { id: 'w3_3', name: '战意回响', desc: '击杀敌人立即回复 2 军令' },
    ],
    t6: [
      { id: 'w6_1', name: '碎甲重击', desc: '技能命中削弱目标 15% 护甲' },
      { id: 'w6_2', name: '气冲斗牛', desc: '击杀敌将叠加 5% 攻击力' },
      { id: 'w6_3', name: '浴血狂澜', desc: '技能施放后 2 秒内获得 20% 吸血' },
    ],
    t10: [
      { id: 'w10_1', name: '蓄力重斩', desc: '技能伤害 +50%，冷却 +25%' },
      { id: 'w10_2', name: '狂暴无双', desc: '帅帐生命低于 40% 时自身攻击翻倍' },
      { id: 'w10_3', name: '万军辟易', desc: '技能击杀目标立即缩短 30% 技能冷却' },
    ],
  },
  ambush: {
    name: '奇袭',
    t3: [
      { id: 'a3_1', name: '精锐随从', desc: '召唤物生命与攻击 +10%' },
      { id: 'a3_2', name: '舍命引爆', desc: '召唤单位阵亡时自爆造成范围伤害' },
      { id: 'a3_3', name: '暗影迅捷', desc: '召唤技能冷却缩减 15%' },
    ],
    t6: [
      { id: 'a6_1', name: '突刺冲锋', desc: '召唤物首次接敌发动强力冲锋' },
      { id: 'a6_2', name: '潜影夜行', desc: '伏兵入场获得 3 秒隐匿' },
      { id: 'a6_3', name: '阵势相通', desc: '召唤物直接继承主将光环加成' },
    ],
    t10: [
      { id: 'a10_1', name: '影分身法', desc: '召唤物完成击杀后分裂一次' },
      { id: 'a10_2', name: '绝杀瞬影', desc: '刺客背刺伤害额外 +35%' },
      { id: 'a10_3', name: '十面埋伏', desc: '全战场召唤物上限 +1' },
    ],
  },
  tactician: {
    name: '谋略',
    t3: [
      { id: 't3_1', name: '画地为牢', desc: '控制技能持续时间 +0.5 秒' },
      { id: 't3_2', name: '攻心为上', desc: '所有减益效果数值 +10%' },
      { id: 't3_3', name: '弱点击破', desc: '被控制目标受到的伤害 +15%' },
    ],
    t6: [
      { id: 't6_1', name: '波及四野', desc: '技能多影响 1 个敌方目标' },
      { id: 't6_2', name: '禁断气脉', desc: '被控目标禁止施放技能 3 秒' },
      { id: 't6_3', name: '疫病蔓延', desc: '减益状态传染临近 1 名敌人' },
    ],
    t10: [
      { id: 't10_1', name: '连环奇谋', desc: '控制效果结束前 1 秒自动补一次定身' },
      { id: 't10_2', name: '水火相济', desc: '全军术法伤害提升 25%' },
      { id: 't10_3', name: '神机莫测', desc: '所有术法卡冷却缩减 20%' },
    ],
  },
  guardian: {
    name: '坚守',
    t3: [
      { id: 'g3_1', name: '固若金汤', desc: '全军护盾上限 +10%' },
      { id: 'g3_2', name: '荆棘战甲', desc: '受击反弹伤害 +15%' },
      { id: 'g3_3', name: '帅帐庇佑', desc: '帅帐受到伤害降低 5%' },
    ],
    t6: [
      { id: 'g6_1', name: '盾碎生威', desc: '护盾破碎时净化周围友军负面效果' },
      { id: 'g6_2', name: '冰霜倒刺', desc: '反伤附带 20% 移速减速' },
      { id: 'g6_3', name: '营砦同心', desc: '帅帐与建筑同步享受护盾加持' },
    ],
    t10: [
      { id: 'g10_1', name: '不动明王', desc: '每 30 秒自动为全军附加一层坚盾' },
      { id: 'g10_2', name: '铁壁铜墙', desc: '前排重装单位受到伤害额外 -15%' },
      { id: 'g10_3', name: '绝地反击', desc: '帅帐受损时全军攻击提升 25%' },
    ],
  },
  resource: {
    name: '资源',
    t3: [
      { id: 'r3_1', name: '广积粮草', desc: '军令上限 +2' },
      { id: 'r3_2', name: '调兵如神', desc: '全军卡牌冷却缩短 5%' },
      { id: 'r3_3', name: '首战先发', desc: '开局首次部署卡牌免费' },
    ],
    t6: [
      { id: 'r6_1', name: '以战养战', desc: '消灭敌军额外奖励 +1 军令' },
      { id: 'r6_2', name: '玄通灵妙', desc: '术法冷却缩减 20%' },
      { id: 'r6_3', name: '运筹帷幄', desc: '军令回复速度提升 15%' },
    ],
    t10: [
      { id: 'r10_1', name: '五谷丰登', desc: '每 60 秒免费放出一张 ≤3 费卡' },
      { id: 'r10_2', name: '天降神兵', desc: '开战初始军令 +8' },
      { id: 'r10_3', name: '万象更新', desc: '术法伤害提升 30% 且消耗 -2' },
    ],
  },
};

// 军师数值折算函数（design §4.1.2）
export function getAdvisorBonus(advisorHero, mainHero) {
  if (!advisorHero || !advisorHero.passive) return null;
  const isSameArchetype = mainHero && advisorHero.archetype === mainHero.archetype;
  const mul = isSameArchetype ? 0.60 : 0.50; // 同原型契合 60%，非同原型 50%
  const p = advisorHero.passive;
  return {
    hero: advisorHero,
    mul,
    isSameArchetype,
    name: p.name,
    desc: p.desc,
    template: p.template,
    radius: p.radius,
    value: p.value ? Math.floor(p.value * mul * 100) / 100 : 0,
    regen: p.regen ? Math.floor(p.regen * mul * 1000) / 1000 : 0,
    summary: advisorHero.name + '军师 · ' + (isSameArchetype ? '同原型契合(60%)' : '折算(50%)')
  };
}

// ==================== 三、荒野乱斗体系英雄战斗实战数值与 1~11 级成长 ====================
export const HERO_MAX_LEVEL = 11;

/**
 * 荒野乱斗里程碑解锁检测：
 * Lv.1: 主动大招（Super）
 * Lv.3: 解锁专属被动特质（Star Power）
 * Lv.7: 解锁专属妙具（Gadget）
 * Lv.11: 满阶战神（终极 200% 基础面板）
 */
export function isPassiveUnlocked(level) {
  return (Math.floor(Number(level)) || 1) >= 3;
}

export function isGadgetUnlocked(level) {
  return (Math.floor(Number(level)) || 1) >= 7;
}

export const DEFAULT_HERO_TUNING = {
  zhaoyun: {
    maxHp: 1200,             // 1级基础生命
    atk: 65,                 // 1级基础攻击
    armor: 10,               // 1级基础护甲
    atkInterval: 0.85,       // 普攻间隔(秒)
    speed: 1.6,              // 移速(m/s)
    regenRate: 0.04,         // 1级脱战回血(%/s)
    aggroRadius: 2.85,       // 迎敌警戒半径(m)
    superDamage: 550,        // 1级大招初段冲刺伤害
    superStrikeDamage: 180,  // 1级大招折返刺击伤害
    superCooldown: 50,       // 1级大招冷却(秒) - 释放后50s冷却
    gadgetCooldown: 20,      // 专属技能冷却(秒) - 冷却20s无次数限制
    gadgetRadius: 3.5,       // 技能震退半径(m)
    gadgetKnockback: 2.2,    // 技能击退距离(m)
  },
  hanxin: { maxHp: 950, atk: 45, armor: 6, regenRate: 0.03, aggroRadius: 2.6, speed: 1.4 },
  guanyu: { maxHp: 1400, atk: 85, armor: 14, regenRate: 0.035, aggroRadius: 2.8, speed: 1.3 },
  zhugeliang: { maxHp: 850, atk: 40, armor: 4, regenRate: 0.03, aggroRadius: 2.5, speed: 1.2 },
  lvbu: { maxHp: 1600, atk: 105, armor: 16, regenRate: 0.03, aggroRadius: 3.0, speed: 1.5 },
  libai: { maxHp: 1000, atk: 75, armor: 6, regenRate: 0.045, aggroRadius: 2.7, speed: 1.7 },
  sunwu: { maxHp: 900, atk: 42, armor: 12, regenRate: 0.03, aggroRadius: 2.5, speed: 1.3 },
  weiqing: { maxHp: 1300, atk: 60, armor: 12, regenRate: 0.04, aggroRadius: 2.8, speed: 1.4 },
  huoqubing: { maxHp: 1150, atk: 80, armor: 8, regenRate: 0.035, aggroRadius: 3.2, speed: 1.8 },
  wuzetian: { maxHp: 950, atk: 48, armor: 8, regenRate: 0.03, aggroRadius: 2.5, speed: 1.2 },
  mengtian: { maxHp: 1500, atk: 55, armor: 20, regenRate: 0.04, aggroRadius: 2.6, speed: 1.2 },
  diaochan: { maxHp: 800, atk: 50, armor: 4, regenRate: 0.04, aggroRadius: 2.5, speed: 1.4 },
};

/**
 * 十二将战斗手感配置：射程、阻挡、普攻特性。
 * range/block 由战斗层读取；其余字段由 hero.js 的通用普攻与被动钩子消费。
 */
export const HERO_COMBAT = {
  zhaoyun: { range: 1.75, block: 2, atkInterval: 0.85, audio: 'spear', vfx: 'jade', tripleThrust: true },
  guanyu: { range: 1.9, block: 3, atkInterval: 1.35, audio: 'sword', vfx: 'glaive', cleave: 2.2, cleaveRatio: 0.6 },
  lvbu: { range: 1.85, block: 4, atkInterval: 1.10, audio: 'sword', vfx: 'red', lifesteal: 0.25 },
  weiqing: { range: 1.7, block: 2, atkInterval: 1.25, audio: 'sword', vfx: 'gold' },
  mengtian: { range: 1.75, block: 3, atkInterval: 1.30, audio: 'spear', vfx: 'dust', shield: 0.2 },
  hanxin: { range: 1.65, block: 2, atkInterval: 1.10, audio: 'sword', vfx: 'jade', killEnergy: 3 },
  huoqubing: { range: 1.85, block: 1, atkInterval: 1.00, audio: 'spear', vfx: 'gold', chargeCrit: 3, speed: 2.6 },
  sunwu: { range: 1.7, block: 1, atkInterval: 1.50, audio: 'sword', vfx: 'jade', stealth: true, backstab: 2 },
  diaochan: { range: 1.75, block: 1, atkInterval: 1.00, audio: 'sword', vfx: 'pink', slow: 0.25 },
  zhugeliang: { range: 7.0, block: 0, atkInterval: 1.40, audio: 'bow', vfx: 'jade', ranged: true, meleePush: 3 },
  libai: { range: 4.0, block: 1, atkInterval: 1.10, audio: 'sword', vfx: 'jade', ranged: true, pierce: 3 },
  wuzetian: { range: 3.0, block: 1, atkInterval: 1.25, audio: 'gong', vfx: 'gold', ranged: true, thorns: 0.3, deathStele: true },
};

export function getHeroCombat(heroId) {
  const base = HERO_COMBAT[heroId] || HERO_COMBAT.zhaoyun;
  return {
    range: Math.max(1.2, Number(base.range) || 1.75),
    block: Math.max(0, Number(base.block ?? 2)),
    atkInterval: Math.max(0.5, Number(base.atkInterval) || 0.85),
    audio: base.audio || 'sword',
    vfx: base.vfx || 'ink',
    tripleThrust: !!base.tripleThrust,
    cleave: Number(base.cleave) || 0,
    cleaveRatio: Number(base.cleaveRatio) || 0.6,
    lifesteal: Number(base.lifesteal) || 0,
    killEnergy: Number(base.killEnergy) || 0,
    chargeCrit: Number(base.chargeCrit) || 0,
    speed: Number(base.speed) || 0,
    stealth: !!base.stealth,
    backstab: Number(base.backstab) || 1,
    slow: Number(base.slow) || 0,
    ranged: !!base.ranged,
    pierce: Number(base.pierce) || 0,
    meleePush: Number(base.meleePush) || 0,
    thorns: Number(base.thorns) || 0,
    deathStele: !!base.deathStele,
    shield: Number(base.shield) || 0,
  };
}

/**
 * 读取英雄 1 级基础面板实战参数（可叠加调校覆写）
 */
export function getHeroTuning(heroId, customOverrides = null) {
  const base = DEFAULT_HERO_TUNING[heroId] || DEFAULT_HERO_TUNING.zhaoyun;
  const ov = (customOverrides && (customOverrides[heroId] || (heroId === 'zhaoyun' ? customOverrides : null))) || {};
  return {
    maxHp: Math.max(100, Number(ov.maxHp ?? base.maxHp)),
    atk: Math.max(1, Number(ov.atk ?? base.atk)),
    armor: Math.max(0, Number(ov.armor ?? base.armor)),
    atkInterval: Math.max(0.4, Number(ov.atkInterval ?? (base.atkInterval || 0.85))),
    speed: Math.max(0.2, Number(ov.speed ?? (base.speed || 1.6))),
    regenRate: Math.max(0.005, Number(ov.regenRate ?? base.regenRate)),
    aggroRadius: Math.max(0.5, Number(ov.aggroRadius ?? base.aggroRadius)),
    superDamage: Math.max(50, Number(ov.superDamage ?? (base.superDamage || 550))),
    superStrikeDamage: Math.max(20, Number(ov.superStrikeDamage ?? (base.superStrikeDamage || 180))),
    superCooldown: Math.max(5, Number(ov.superCooldown ?? (base.superCooldown || 50))),
    gadgetCooldown: Math.max(2, Number(ov.gadgetCooldown ?? (base.gadgetCooldown || 20))),
    gadgetRadius: Math.max(1.0, Number(ov.gadgetRadius ?? (base.gadgetRadius || 3.5))),
    gadgetKnockback: Math.max(0.2, Number(ov.gadgetKnockback ?? (base.gadgetKnockback || 2.2))),
  };
}

/**
 * 局外升级消耗公式：(要升到的等级数 * 当前的等级数)
 * 满级 11 级返回 null
 */
export function getHeroUpgradeCost(currentLevel) {
  const cur = Math.max(1, Math.floor(Number(currentLevel) || 1));
  if (cur >= HERO_MAX_LEVEL) return null; // 满级 11 级
  const target = cur + 1;
  return target * cur;
}

/**
 * 局外永久等级属性倍率：荒野乱斗体系每级提升基础属性(Lv.1)的 10%
 * Lv.1: 1.00 (+0%)
 * Lv.2: 1.10 (+10%)
 * ...
 * Lv.11: 2.00 (+100%, 终极战神属性翻倍)
 */
export function getHeroPermMultiplier(outsideLevel) {
  const lv = Math.max(1, Math.min(HERO_MAX_LEVEL, Math.floor(Number(outsideLevel) || 1)));
  return 1 + (lv - 1) * 0.10;
}

/**
 * 获取英雄经局外永久升级加成后的基础属性与解锁状态
 */
export function getHeroStats(heroId, outsideLevel = 1, customOverrides = null) {
  const tuning = getHeroTuning(heroId, customOverrides);
  const mul = getHeroPermMultiplier(outsideLevel);
  return {
    ...tuning,
    outsideLevel,
    permMultiplier: mul,
    baseMaxHp: Math.round(tuning.maxHp * mul),
    baseAtk: Math.round(tuning.atk * mul),
    baseArmor: Math.round(tuning.armor * mul),
    baseSuperDamage: Math.round((tuning.superDamage || 550) * mul),
    baseSuperStrikeDamage: Math.round((tuning.superStrikeDamage || 180) * mul),
    isPassiveUnlocked: isPassiveUnlocked(outsideLevel),
    isGadgetUnlocked: isGadgetUnlocked(outsideLevel),
  };
}

