# tech-refer: zone-and-structure (2026-01-13)

## Context
当前 canvas 数据结构为 `workspace.canvas`（notes/drawings/background/viewport）。需要新增 Zone（含嵌套与归属）并保持与现有交互兼容。

## Proposed Data Model (minimal)
### Zone
- `id: string`
- `bounds: { x: number, y: number, width: number, height: number }`（world coords）
- `parentZoneId: string | null`
- `createdAt: number`

### Note/Card
- 现有 `note.position`（world coords）
- 新增 `zoneId: string | null`（primary zone）

### Derived
- `ancestorZoneIds(note)`：沿 `zoneId -> parentZoneId` 计算（不持久化）。

## Membership Algorithm
### Overlap Ratio (> 50%)
- 以 note 与 zone 的 AABB（轴对齐矩形）计算交叠面积：
  - `overlapArea / noteArea > 0.5` => eligible
- 主归属选择：deepest wins
  - 前提：zone 只通过嵌套形成“包含关系”，避免复杂交叠；sub-zone 优先于 parent-zone。

## Overflow Push-back (Hard Constraint)
当 zone 移动/缩放后，对每个归属卡片执行 clamp：
- `noteRect` 必须完全落在 `zoneInnerRect` 内
- 若越界，将 `note.position` 推回到最近的可行位置

说明：zoneInnerRect 需要扣除边框与把手区域（常量）。

## Minimum Size (N=4 Grid)
目标：zoneInnerRect 至少容纳 2×2 卡片网格（默认折叠态尺寸）。
- 设 `CARD_W/CARD_H` 为折叠卡片尺寸
- 设 `GAP` 为卡片间距
- 最小内部尺寸：
  - `minInnerWidth = CARD_W * 2 + GAP`
  - `minInnerHeight = CARD_H * 2 + GAP`

实现建议：把 `CARD_W/CARD_H/GAP/HANDLE_SIZE/BORDER` 作为同一处常量，避免散落。

## UI Interaction Notes
- Top toolbar: 新增 “Zone” 按钮
  - 若当前选中的是 zone，则创建 sub-zone；否则创建 root zone
- Resize handles: 四角把手（cursor + hit area）
- Snap/feedback: 接近边界时轻微吸附（建议仅影响视觉与最终落点，不强行改用户意图）

## Carry-over Issues Mapping
- issue002: 背景图缩放需要鼠标角把手，避免依赖触控板 pinch
- issue003: 本阶段仅补齐“对象模型可演进”的数据结构/序列化扩展点

## Drawing Semantic Model (task009)
本项目不引入 tldraw 等白板内核，绘制/结构应以“可感知的数据结构”演进。为避免一次性重构，本阶段采用增量策略：保留现有 `canvas.drawings` 作为 legacy 渲染来源，同时新增 `canvas.sceneGraph` 作为未来的单一对象模型承载。

### Decision
- **新增 `canvas.sceneGraph`（versioned）**，并保留 `canvas.drawings` 不动。
- 本阶段不做 UI 迁移与渲染切换；`sceneGraph` 仅用于序列化与未来扩展点。

### Minimal Schema (v1)
- `canvas.schemaVersion: number`（用于后续迁移）
- `canvas.sceneGraph: { version: number, nodes: Node[] }`
- `Node`（建议）：`{ id: string, type: 'zone'|'note'|'shape'|'text', props: object, style?: object, transform?: object, parentId?: string|null }`

### Migration Strategy
- 读取时：若缺少 `schemaVersion/sceneGraph`，在 `init` 归一化补齐默认值并写回 IndexedDB（不改变现有行为）。
- 写入时：保持 `drawings/notes/zones` 为当前 UI 的事实来源；`sceneGraph` 作为并行结构，后续再逐步填充与切换。

