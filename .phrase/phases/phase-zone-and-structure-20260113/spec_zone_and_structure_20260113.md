# spec: zone-and-structure (2026-01-13)

## Summary
本阶段引入 Zone：画布上的区域容器。卡片可被拖入 Zone 并建立归属关系，同时保持自由摆放；Zone 移动时，归属卡片一起移动。Zone 支持嵌套 sub-zone（通过顶部按钮创建），不支持拖拽合并。

## Goals
- 实现 Zone MVP：创建/删除/移动/四角缩放。
- 实现卡片归属：重叠面积 > 50% 归属，移出则解除。
- 实现层级：主归属到最深层 Zone，同时属于 parent-zone 链（可用于面包屑/高亮）。
- 实现约束：Zone 移动/缩放导致子卡片越界时，自动把卡片推回 Zone 内（强约束）。
- 落地最小数据结构与持久化：刷新后 Zone 与归属关系不丢（Workspaces/Canvas 维度）。

## Non-goals
- 不引入 tldraw / 白板内核类库。
- 暂不做“视觉设计优化”（不把 issue001 纳入本阶段范围）。
- 绘制语义模型（issue003）本阶段只做数据结构/序列化的准备，不做大规模 UI 重构。

## Data Model Note (task009)
本阶段会新增一个 versioned 的 `sceneGraph` 结构作为未来“语义对象模型”的承载，但不改变现有绘制渲染行为（仍以 `drawings` 为准）。

## Definitions
- Zone：可自由摆放的区域容器节点，支持 `bounds`（矩形）、`children`（cards/sub-zones）。
- Card：对话便签（Sticky Note）。
- Primary zone：卡片的主归属（deepest zone wins）。
- Ancestor zones：primary zone 的 parent 链（派生归属）。

## User Flows
### Flow 1: Create Zone
1) 用户点击白板顶部按钮栏的 “Zone” 按钮。
2) 系统在当前视口中心创建一个空 Zone（满足最小尺寸约束）。
3) Zone 被选中，显示四角缩放把手与删除入口。

### Flow 2: Resize / Move Zone
1) 用户拖拽 Zone 边框移动；拖拽四角把手缩放。
2) 系统实时更新 Zone 边界。
3) 若移动/缩放导致归属卡片越界：系统自动将卡片推回 Zone 内（保持归属）。

### Flow 3: Delete Zone
1) 用户删除 Zone。
2) 系统解除该 Zone 内卡片的归属（或将其归属提升到 parent-zone，若存在；具体规则见 tech-refer）。

### Flow 4: Assign / Unassign Card
1) 用户拖拽卡片接近 Zone，系统给出轻微吸附感与视觉提示。
2) 松手时：若卡片与 Zone 重叠面积 > 50%，建立归属；否则不归属。
3) 用户把卡片拖出 Zone，使其与 Zone 重叠面积 <= 50%，解除归属。

### Flow 5: Create Sub-zone
1) 用户选中某个 Zone。
2) 用户点击顶部按钮栏 “Zone” 按钮。
3) 系统在该 Zone 内创建一个空 sub-zone（满足最小尺寸约束），并建立 parent/child 关系。

## Key Rules
### Membership Rule
- 重叠面积 > 50% 才建立归属。
- 主归属选择：deepest zone wins（基于嵌套结构）。
- 同时属于 parent-zone 链：用于高亮、过滤、导航（不等于多主归属写入）。

### Overflow Rule (Hard Constraint)
- 当 Zone 变换导致归属卡片越界：系统自动将卡片推回 Zone 内（保持归属）。

### Nesting Rule
- 允许通过“在选中 Zone 内创建 sub-zone”形成嵌套。
- 不支持通过拖拽把两个 Zone 合并（merge）。

### Minimum Size Rule
Zone 最小内部可用空间需容纳 **N=4 张卡片的紧凑网格排列（布局 C）**。
- 默认：2×2 网格。
- 卡片尺寸：以“默认折叠态”卡片尺寸为基准（由实现定义）。
- 间距：由实现定义（需在 tech-refer 固化一个常量或可配置项）。

## Acceptance Criteria
- [ ] A 创建/删除 Zone
- [ ] B Zone 可拖拽移动
- [ ] C Zone 四角把手缩放（resize）
- [ ] D 卡片拖入/拖出 Zone，归属规则按“重叠面积 > 50%”
- [ ] E Zone 移动/缩放时，归属卡片一起移动且越界会被推回 Zone 内
- [ ] F Zone/归属关系可持久化，刷新后不丢
