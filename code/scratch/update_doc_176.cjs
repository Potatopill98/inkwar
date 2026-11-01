const fs = require('fs');
let doc = fs.readFileSync('E:/taptapgame/inkwar/doc/iteration.md', 'utf8');

const entry = `## v1.76 · 2026-10-30 · 修复新手引导全屏遮罩事件拦截 · 完善聚光灯点击代理与关卡节点 data-id 绑定 · 100% 打通征战/选关/出战全流程

**类型**：核心交互阻断 Bug 修复、DOM 属性规范化、无头浏览器真实端到端自动化验证闭环（代码 v1.73 → **v1.76**）
**反馈来源**：用户——「点了征战没有用」并附带主界面引导截图。

### 根因分析与深度修复细节

1. **核心根因一：全局全屏遮罩层（#first-guide）层级阻隔与事件捕获拦截**：
   - **机理分析**：新手引导遮罩 \`#first-guide\` 采用 \`position: fixed; inset: 0; z-index: 9500;\` 挂载在 \`<body>\` 根节点上；而主界面的「征战」按钮 \`#btn-campaign\` 位于 \`#app > #screen-home\` 内；
   - **阻断现象**：由于 \`#first-guide\` 在全局设置了捕获型 \`pointerdown\` 事件拦截并对非目标区域调用 \`e.stopPropagation(); e.preventDefault();\`，且聚光灯高亮孔洞 \`.fg-spot\` 原为 \`pointer-events: none\`，导致玩家在主界面点击高亮的「征战」按钮时，点击事件在最外层的 \`#first-guide\` 处即被全部拦截吞噬，事件根本无法下发给底层的 \`#btn-campaign\`。
   - **修复方案**：
     - 将 \`.fg-spot\` 升级为具备最高响应优先级的实体可交互代理元素（\`pointer-events: auto !important; cursor: pointer; z-index: 9520;\`）；
     - 为 \`.fg-spot\` 绑定点击代理分发器 \`handleTargetClick()\`，在捕获玩家点击时原生触发目标元素的 \`target.click()\`（或分发 Pointer/Mouse 事件）；
     - 结合外层遮罩的阻止默认行为，既能确保防乱点拦截严密生效（点击发光区域外提示「请遵从军师指引，点击发光指定目标！」），又能 100% 确保高亮目标平滑响应。

2. **核心根因二：关卡节点（.level-node）缺失 \`data-id\` 属性导致第二步目标检索失步**：
   - **排查发现**：进入关卡界面后，引导第 2 步的目标选择器配置为 \`#level-path .level-node[data-id=\"1\"]\`；然而在 \`src/ui.js\` 的 \`renderLevelPath()\` 中，创建节点时仅设置了 \`className\` 与内容，漏赋了 \`btn.dataset.id = id\`！
   - **连锁影响**：导致 \`findTarget\` 轮询超时后无法定位第 1 关节点，引导未能顺利在第一关与「出征」之间建立有效目标代理，点将台无法无缝唤出。
   - **修复方案**：
     - 在 \`ui.js\` 的 \`renderLevelPath()\` 节点生成逻辑中显式注入 \`btn.dataset.id = id;\`；
     - 将引导第 2 步目标配置为组合选择器 \`#btn-level-go, #level-path .level-node[data-id=\"1\"]\`;
     - 在 \`handleTargetClick\` 中协同加入场景切换保障：当玩家在第 2 步点击节点时，立即触发 \`this.app.openPrep(1)\`，平滑切入点将台并顺畅展示「第三步 · 擂鼓开战」。

3. **全栈模块依赖缓存穿透（v1.76）**：
   - 执行全局版本升级脚本 \`scratch/bump_version.cjs\`，将 \`index.html\` 入口标头与 \`src/\` 目录下全部 ES 模块相对引用升级为 \`?v=1.76\`，杜绝浏览器静态强缓存干扰。

### 自动化验证结果（真实无头 Edge 浏览器 + CDP）

运行 \`node scratch/test_first_guide_headless.mjs\`：
1. **主界面（screen-home）**：引导「第一步 · 领兵征战」聚光灯精准锁定【征战】按钮，模拟点击瞬间成功触发 \`openLevels()\`；
2. **关卡界面（screen-levels）**：界面稳定切至关卡路径，第 1 关【初阵·乡勇】高亮闪烁，模拟点击顺畅触发 \`openPrep(1)\` 进入点将台；
3. **点将台界面（screen-prep）**：引导「第三步 · 擂鼓开战」聚光灯精准锁定【出战】按钮，模拟点击顺利调用 \`beginBattleFromPrep()\`；
4. **战场启动（screen-battle）**：局外新手引导自动隐藏（\`fgDisplay: none\`），战场初始化启动（\`battleRunning: intro\`），无缝衔接局内战术暂停与实战教学。

---\n\n`;

const targetAnchor = '## v1.70 · 2026-10-30';
if (!doc.includes('## v1.76')) {
  doc = doc.replace(targetAnchor, entry + targetAnchor);
}
fs.writeFileSync('E:/taptapgame/inkwar/doc/iteration.md', doc, 'utf8');
console.log('iteration.md successfully updated with v1.76 entry');
