# Canvas.jsx 重构实施计划

## 里程碑

| # | 里程碑 | 预期产出 | 风险 |
|---|--------|----------|------|
| 0 | **统一坐标系统** | `coordinates.js` 工具 + 各组件重构 | 高：涉及多处坐标逻辑 |
| 1 | 数据层修复 | Canvas 使用 Store 数据，刷新后持久化 | 中：需确保 UI 响应性 |
| 2 | 手势系统拆分 | 3 个独立 hooks，主文件 < 400 行 | 低：纯重构 |
| 3 | 清理与文档 | eslint 清洁，GEMINI.md 更新 | 低 |

---

## 实施顺序

### Milestone 0: 统一坐标系统（task000）⭐ 新增

**背景**：连线偏移 146px 问题的根因分析发现 Canvas 缺乏统一坐标变换系统。
详见 [analysis_coordinate_system.md](./analysis_coordinate_system.md)

**策略**：创建统一转换层，符合 tldraw/React Flow 等行业标准架构。

1. 创建 `src/utils/coordinates.js`
   ```javascript
   export function worldToScreen(worldPos, viewport) { ... }
   export function screenToWorld(screenPos, viewport) { ... }
   ```

2. 重构 `StickyNote.jsx` - 拖拽计算使用统一工具
3. 重构 `ConnectionsLayer.jsx` - 连线坐标使用统一工具
4. 重构 `Canvas.jsx` - Zones 坐标使用统一工具
5. 验证连线与 Notes 对齐正确

### Milestone 1: 数据层修复（task001-003）

**策略**：一次性切换，而不是渐进式。因为本地状态和 Store 混用会导致数据不一致。

1. 在 Canvas.jsx 顶部，从 Store 解构当前 workspace 的 canvas 数据
2. 将所有 `setNotes(...)` 替换为 `patchCanvas({ notes: ... })`
3. 删除所有 `useState` 副本和 `save*()` 函数
4. 添加 `patchCanvas` helper 封装 `updateCanvas(currentWorkspaceId, ...)`

### Milestone 2: 手势系统拆分（task004-006）

1. 创建 `src/hooks/useCanvasPan.js` - 处理 pan/zoom/wheel
2. 创建 `src/hooks/useZoneGestures.js` - 处理 Zone 交互
3. 创建 `src/hooks/useBackgroundGestures.js` - 处理背景图交互
4. 在 Canvas.jsx 中组合这些 hooks

### Milestone 3: 清理（task007-008）

1. 运行 `npm run lint` 确保无警告
2. 更新 GEMINI.md 反映新架构

---

## 破坏性影响分析

| 功能 | 影响 | 验证方法 |
|------|------|----------|
| Note 创建/编辑/删除 | 数据源变更 | 手动测试 |
| Zone 创建/移动/缩放 | 数据源变更 | 手动测试 |
| Note-Zone 归属 | 数据源变更 | 手动测试 |
| Canvas pan/zoom | 数据源变更 | 手动测试 |
| 背景图上传/变换 | 数据源变更 | 手动测试 |
| **Connections 连线** | **坐标系统变更** | **拖拽 Note 验证连线跟随** |
| 刷新后数据保持 | 新行为 | 刷新页面验证 |

---

## 回滚方案

如果重构导致严重问题：
1. Git revert 到重构前的 commit
2. 或者：保留 Canvas.jsx.backup 作为参考

