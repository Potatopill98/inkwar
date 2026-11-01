const fs = require('fs');
let doc = fs.readFileSync('E:/taptapgame/inkwar/doc/iteration.md', 'utf8');

const targetHeader = `## 当前状态速览（2026-10-30）

| 项 | 状态 |
|---|---|
| 最新版本 | **代码 v1.67 / 文档 v2.49**`;

const newHeader = `## 当前状态速览（2026-10-30）

| 项 | 状态 |
|---|---|
| 最新版本 | **代码 v1.68 / 文档 v2.50**（v1.68 架构级实体/幽灵材质解耦、场景销毁防误注销、全链路 ES 模块防缓存穿透、点将台选将选兵与异常容错）`;

const v168Section = `## v1.68 · 2026-10-30 · 材质双态架构彻底根治半透明 · 场景销毁单例保护杜绝渲染失败 · 全链路 ES 模块版本号穿透防缓存 · 100% 确保点将台选兵选将

**类型**：架构级材质解耦、WebGL 资源生命周期安全保护、全量浏览器端模块防缓存穿透、点将台交互闭环（代码 v1.67 → **v1.68**）
**反馈来源**：用户——上传点将台报错与半透明战场双截图，反馈「现在选择无尽模式 还是直接进入了 没有让我点兵点将」及「军队 将领和大本营都是半透明的」。

### 根因分析与深度修复细节

1. **核心根因一：浏览器强缓存 ES 模块脚本（Stale Browser Cache）**：
   - **现象排查**：本地静态服务器（Python \`http.server\`）默认不带 \`Cache-Control: no-cache\`，浏览器（Edge/Chrome）对 ES Module 脚本文件有极高强度的本地磁盘缓存；
   - **后果**：即使后端修复了逻辑代码，由于 \`index.html\` 仅写有 \`<script type="module" src="src/main.js"></script>\`，玩家在前端页面点击刷新时，浏览器依然执行本地旧版脚本，直接旁路跳过了点将台；
   - **解决方案**：
     - 在 \`index.html\` 的 \`<head>\` 中注入 \`Cache-Control: no-cache, no-store, must-revalidate\`、\`Pragma: no-cache\`、\`Expires: 0\` 三重防缓存标头；
     - 将主入口升级为 \`<script type="module" src="src/main.js?v=1.68"></script>\`；
     - 在 \`src/main.js\`、\`src/ui.js\`、\`src/battle.js\`、\`src/scene.js\`、\`src/battle/combat.js\`、\`src/battle/hero.js\`、\`src/battle/waves.js\` 的全部相对模块依赖引用后统一追加 \`?v=1.68\` 强力缓存穿透版本查询串，强制浏览器瞬间拉取最新文件。

2. **核心根因二：\`scene.dispose()\` 误注销全局共享材质触发「战场渲染失败」**：
   - **深度机理**：旧局结束或撤退时，\`BattleScene.dispose()\` 执行了 \`scene.traverse(obj => obj.material?.dispose())\`；由于所有建筑、大本营、松石、单位和英雄均使用导出的 \`toonMaterial\` 单例，导致其底层 WebGLProgram 被销毁注销！下一局进入战斗时 Three.js 试图以已销毁的材质渲染网格引发底层 WebGL 异常；
   - **修复措施**：在 \`scene.dispose()\` 中加入白名单保护机制：\`if (m && m !== toonMaterial && m !== ghostMaterial) m.dispose();\`，彻底杜绝全局材质被误销毁；并在 \`Battle\` 初始化时强制保障 \`toonMaterial\` 的 \`depthWrite = true; depthTest = true; needsUpdate = true;\`；
   - **点将台容错**：在 \`startBattle\` 的 \`catch\` 块中，由原本的直接切屏改为正规调用 \`openEndlessPrep()\` 或 \`openPrep()\`，确保任何极端情况下点将台 DOM 均被完整初始化与渲染，绝不出现卡死或空壳。

3. **核心根因三：实体材质与半透明幽灵材质架构级解耦（Dual Material Architecture）**：
   - **解耦设计**：
     - \`toonMaterial\`：严格保持 \`transparent: false, opacity: 1.0, depthWrite: true, depthTest: true\`，专供正常状态下的建筑、小兵、将领、树木；
     - \`ghostMaterial\`：独立定义专属半透明材质 \`transparent: true, opacity: 0.35, depthWrite: false\`，专供刺客隐匿与主将战跪力竭英灵姿态；
   - **状态流转**：
     - 主将倒下（\`killHero\`）/ 刺客隐匿（\`stealth\`）：网格材质直接切换为 \`ghostMaterial\`；
     - 主将复活（\`reviveHero\`）/ 刺客破隐（\`revealStealth\`）：网格材质直接切换回 \`toonMaterial\`；
     - 彻底弃用对 \`toonMaterial.transparent\` 的动态赋值，从物理上隔绝任何半透明透光污染。

### 验证结果

- **真实无头浏览器（Edge + CDP）端到端端到端全链路测试（\`test_prep_flow_headless.mjs\`）**：100% 成功通过
  1. 主页点击「墨影试炼 · 无尽」成功稳定切入点将台（\`screen-prep\`），标题为「墨影试炼 · 无尽之阵」，6 卡槽位与将领选择卡组完全正常；
  2. 点将台点击「踏入试炼」顺利开启无尽模式战场（\`screen-battle\`，第 1 波）；
  3. 战场内所有 3D 模型材质严格保持 \`toonTransparent: false, toonOpacity: 1\`，大本营、树木、小兵、赵云 100% 实体着色，无透光；
  4. 赵云在第 1 波交战中稳健格挡并斩敌，血量稳步消耗未受秒杀；
  5. 撤退后从关卡残卷界面【墨影试炼】Tab 再次踏入试炼，同样稳定切入点将台。

---
`;

doc = doc.replace(targetHeader, newHeader);
doc = doc.replace('## v1.67 · 2026-10-30', v168Section + '\n## v1.67 · 2026-10-30');
fs.writeFileSync('E:/taptapgame/inkwar/doc/iteration.md', doc);
console.log('Successfully updated iteration.md to v1.68');
