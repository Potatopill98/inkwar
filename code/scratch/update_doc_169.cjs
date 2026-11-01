const fs = require('fs');

const docPath = 'E:/taptapgame/inkwar/doc/iteration.md';
let doc = fs.readFileSync(docPath, 'utf8');

const statusOld = `## 当前状态速览（2026-10-30）

| 项 | 状态 |
|---|---|
| 最新版本 | **代码 v1.68 / 文档 v2.50**（v1.68 架构级实体/幽灵材质解耦、场景销毁防误注销、全链路 ES 模块防缓存穿透、点将台选将选兵与异常容错）（v1.67 修复材质半透明污染隔离、修正无尽波次精确属性公式、无尽模式全链路接入点将台自选将领卡组） |`;

const statusNew = `## 当前状态速览（2026-10-30）

| 项 | 状态 |
|---|---|
| 最新版本 | **代码 v1.69 / 文档 v2.51**（v1.69 无尽模式9项全量升级：将领死亡实心材质、HUD第x波展示、固定间隔出兵、张角首领战血条与全技能、根除首帧跳波、传奇卡波次限制与第10波解锁、肉鸽增益全局时停、出兵动态阶梯上限、霹雳车平稳滑行）（v1.68 架构级实体/幽灵材质解耦、场景销毁防误注销、点将台选兵选将） |`;

const v169Section = `## v1.69 · 2026-10-30 · 无尽模式 9 项专项升级与体验优化 · 首领机制打通 · 肉鸽增益全局暂停 · 兵种阶梯与出车限制

**类型**：无尽模式机制深度重构、首领战场生命周期、肉鸽全局暂停控制、出兵阶梯与数值规整、重型攻城车运动学优化（代码 v1.68 → **v1.69**）
**反馈来源**：用户——「无尽模式游玩发现一下问题:#1将领死亡后不要半透明 #2要在顶部显示当前波次 不需要x/x 直接显示第x波就好 #3不是一波兵死完了再出下一波 和关卡模式一样 每隔一段时间出一波兵 #3 没有出现boss 检查原因 #4 刚进入就错误的显示\"墨影第二波\" #5敌方霹雳车出现数量太多了 限制:敌方传奇卡出兵数量每一波不得高于当前波次的0.1倍 #6选择增益的时候应该全局暂停 等待选择完再继续 不然我选东西的时候我方还在攻击敌方大本营 或者 敌方还在攻击我 #7每个波次的敌人数量每5波敌人出兵的数量限制+2 初始限制5 #8修改霹雳车移动逻辑 移动时候不再上下摇晃 #9敌方第10波开始才允许出现传奇卡」

### 9 项具体需求落实与技术细节

1. **#1 将领死亡保持实心实体姿态（Hero Defeat Opacity）**：
   - 彻底移除 \`hero.js\` 中 \`killHero()\` 对幽灵材质的赋值逻辑，主将倒下时继续使用全局实体材质 \`toonMaterial\`（\`transparent: false, opacity: 1.0\`），呈现硬朗沉稳的水墨战跪力竭英姿，绝无半透明透光。
2. **#2 顶部 HUD 简化波次展示（HUD Wave Text）**：
   - \`src/ui/battle-hud.js\` 重构无尽 HUD，不再显示 \`1/4\` 或时间轴，直接显示干净纯粹的 \`第 x 波\`（如 \`第 1 波\`），保持界面洗练统一。
3. **#3 关卡制时间间隔出兵（Wave Interval Spawning）**：
   - \`src/battle/waves.js\` 引入 \`ENDLESS_WAVE_INTERVAL = 20.0\` 秒计时器，与主线关卡节奏对齐；无论前一波敌兵是否肃清，每隔 20 秒准时启动新一波兵锋，形成层层推进的压制感。
4. **#3（二）排查并修复首领未现身问题（Boss Ladder & Activation）**：
   - **根因**：原机制中首领未设定 \`isBoss: true\`，且受普通小兵上限挤出队列；同时 \`boss_dongzhuo\` 单位定义不存在导致中断；
   - **修复**：在 \`endless-manager.js\` 阶梯配置中修正首领单位类型；在 \`waves.js\` 实现 \`setupEndlessBoss\`，第 10 波出击【黄巾天公 · 张角】并全量激活首领血条（BossBar）、朱砂预警法阵、全场咆哮震撼与专属技能定时器（召唤黄巾、狂暴妖风、冲锋破阵、戟气斩）。
5. **#4 修复刚进入错误显示「墨影第二波」的缺陷（Root Wave Fix）**：
   - 彻底清除 \`mechanics-controller.js\` 中残留的旧无尽原型逻辑，彻底杜绝首帧将 \`e.team\` 误判并自增跳至波次 2 的问题，确保进入后正规呈现「第 1 波」。
6. **#5 传奇卡出兵数量严格限制（Legendary Spawn Cap）**：
   - 每一波敌方传奇卡（霹雳车）出兵数量上限严格限制为 $\\le \\lfloor wave \\times 0.1 \\rfloor$。
7. **#6 选择增益全局时停（Roguelike Buff Global Pause）**：
   - 触发 3 选 1 增益弹窗时，强制执行 \`battle.paused = true; battle.endlessBuffSelecting = true;\`，主循环 \`simDt\` 瞬间归零，我方与敌军全部单位位移、普攻、技能与基地攻击 100% 冻结；选卡后恢复 \`paused = false\` 并同步时间戳，彻底杜绝选牌期间被偷家或偷输出。
8. **#7 敌人出兵数量阶梯递增（Wave Soldier Progression）**：
   - 严格遵循公式：$\\text{出兵数量} = 5 + \\lfloor (wave - 1) / 5 \\rfloor \\times 2$；
   - 第 1–5 波：初始 5 名士兵；第 6–10 波：7 名士兵；第 11–15 波：9 名士兵……平滑稳健。
9. **#8 霹雳车移动无颠簸平稳滑行（Siege Movement Stabilization）**：
   - 在 \`src/battle/combat.js\` 的 \`moveBob\` 中对 \`trebuchet\` 及重型攻城车加入特判，强制将 \`position.y\`、\`rotation.z\`、\`rotation.y\` 锁死为 0 并提前返回，实现平地行车平稳推进。
10. **#9 传奇卡解锁波次后移（Legendary Wave Threshold）**：
    - 严格规定敌方第 10 波前（第 1–9 波）传奇卡概率与上限硬性封锁为 0；从第 10 波起才随波次渐进允许出现。

### 自动化验证

- **真实无头浏览器（Edge + CDP）端到端测试（\`test_endless_v169.mjs\`）**：100% 通过！
  - 将领战跪姿态材质实体不透明；
  - HUD 顶部显示干净的 \`第 1 波\`；
  - 启动战场横幅确认非第二波；
  - 第 1 波出兵 5 且 0 传奇卡，第 6 波出兵 7，第 10 波出兵 7 且传奇卡 $\\le 1$ 且包含张角首领；
  - 霹雳车移动重置颠簸偏移量为 0；
  - 增益弹窗时 \`battle.paused === true\`，选卡后平滑恢复继续；
  - 首领战与首领技能成功就绪。

---

`;

if (!doc.includes(statusOld)) {
  console.error("statusOld not found!");
  process.exit(1);
}

doc = doc.replace(statusOld, statusNew);

// Insert v169Section right before `## v1.68`
const marker = '## v1.68 · 2026-10-30';
if (!doc.includes(marker)) {
  console.error("marker not found!");
  process.exit(1);
}

doc = doc.replace(marker, v169Section + marker);

fs.writeFileSync(docPath, doc, 'utf8');
console.log("Successfully updated iteration.md with v1.69!");
