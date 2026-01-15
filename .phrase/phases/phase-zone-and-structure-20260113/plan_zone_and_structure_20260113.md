# plan: zone-and-structure (2026-01-13)

## Milestones
1) Zone 数据结构与持久化策略落地（含嵌套与主归属规则）。
2) Zone MVP 交互（创建/删除/移动/四角缩放）。
3) 卡片归属与吸附提示（>50% 规则、deepest wins、解除归属）。
4) Overflow 推回策略（Zone 变换时卡片不越界）。
5) 背景图缩放鼠标角把手（issue002）。
6) 绘制语义模型：仅补齐数据结构/序列化扩展点（issue003，A 档）。

## Scope
- Zone（issue004）全量落地到可用。
- 背景图缩放交互（issue002）：鼠标四角把手进入调整模式。
- 数据结构：支持 Zone/归属/嵌套，持久化不丢。

## Out of Scope
- SettingsModal 视觉可读性（issue001）延后。
- 引入 tldraw/excalidraw 等白板内核。
- 绘制系统的大重构（issue003 只做模型与序列化扩展点）。

## Priorities
P0
- Zone MVP + 归属规则 + 持久化（满足 spec A–F）。

P1
- 背景图缩放角把手（issue002）。

P2
- 绘制语义模型的最小数据结构扩展点（issue003）。

## Risks & Dependencies
- 交互复杂度：归属/嵌套/推回需要清晰反馈，避免“发生了但看不见”。
- 兼容性：mouse/pointer 事件在不同浏览器下的行为差异。
- 持久化频率：canvas 更新写入 IndexedDB 的性能与一致性（必要时引入 debounce）。

## Verification
- 手动：按 `spec_zone_and_structure_20260113.md` 的 flows 验证 A–F。
- 回归：现有 C01–C10 的基础流程不被破坏（创建 note、modal、聊天等）。

