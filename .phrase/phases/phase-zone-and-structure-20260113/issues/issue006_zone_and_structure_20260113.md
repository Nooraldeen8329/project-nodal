# issue006 [ ] 卡片解除归属后，拖拽 Zone 仍会带动该卡片

## Summary
将卡片从某个 Zone 中拖拽“拉出来”（按 >50% overlap 规则应解除归属）后，再拖拽该 Zone，卡片仍会随 Zone 一起移动。

## Environment
- OS: （待补充）
- Browser: （待补充）
- Node: 20.10.0（当前环境提示 Vite 建议 20.19+）
- Run: `npm run dev`

## Repro
1) 创建 Zone
2) 创建/拖入一个卡片，使其归属到该 Zone（`note.zoneId = zone.id`）
3) 将卡片拖出 Zone，确保解除归属（`note.zoneId = null`）
4) 拖拽 Zone
5) 观察：卡片仍随 Zone 移动

## Expected vs Actual
- Expected: 仅 `note.zoneId` 属于该 Zone（或其 subtree）的卡片会被带动；解除归属的卡片保持原地不动。
- Actual: 已解除归属的卡片仍会被带动移动。

## Investigation
- Zone move 逻辑在 drag start 时会缓存需要跟随移动的卡片集合（`notePosById`）。
- 在后续拖拽帧中，更新卡片位置时只依赖 `notePosById`，没有再次校验卡片当前的 `note.zoneId` 是否仍属于该 Zone subtree。
- 这会导致“解除归属”与“拖拽 Zone”的状态更新存在竞争时，卡片仍被当作归属卡片一起移动。

## Fix
- Zone move 的卡片更新改为基于最新 state 的函数式更新，并在每一帧更新前校验 `zoneIds.includes(note.zoneId)`。

## Verification
- `npm run build` 通过。
- 手动回归：
  1) 卡片拖出 Zone 后（hover 提示消失），再拖拽 Zone，卡片不再跟随移动。
