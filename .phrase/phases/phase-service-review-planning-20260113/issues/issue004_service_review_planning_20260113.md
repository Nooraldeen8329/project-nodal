# issue004 [ ] 引入 Zone 以表达“归属区域”

## Summary
需要一个可自由摆放在画布上的区域容器（Zone），用于表达卡片的“归属关系”而非列表布局：卡片完整进入 zone 后归属该 zone，仍保持自由位置；zone 移动时卡片随之移动。

## User Requirement (confirmed)
- Membership: 仅当卡片**完整进入**该 zone 边界才建立归属。
- Movement: zone 移动时，归属卡片一起移动（child 跟随 parent）。
- Layout: 归属后卡片仍自由摆放（非 Trello 列表/栈布局）。

## Open Questions
- containment 判定细节：以卡片外接矩形完全落入 zone 矩形为准？是否需要 margin/阈值？
- 多个 zone 重叠时：优先归属哪个？是否允许嵌套 zone？
- 解除归属：拖出即解除，还是提供显式操作（按钮/菜单）？
- 可见反馈：归属标签、边框高亮、面包屑、层级面板？

## Proposed Direction
- 在 scene graph 中将 zone 作为 first-class node：`Zone { id, bounds, children[] }`
- note/card 支持 `parentId` 或 `zoneId`，并明确 transform 传播规则
- UI 需要可发现的 drop feedback（hover 高亮、snap 指示等）

## Verification (future)
- 新增手动用例：
  - 完整进入 → 归属成立；部分进入 → 不归属
  - zone 移动 → child 卡片跟随；解除归属 → 不再跟随

## User Confirmation
- 2026-01-13: 用户确认规则：完整进入才归属；zone 移动时卡片一起移动；归属后保持自由摆放。

## Related
- Spec concept: `spec_service_review_planning_20260113.md` 的 “Zone”
- Next plan: `plan_service_review_planning_20260113.md` Initiative D
