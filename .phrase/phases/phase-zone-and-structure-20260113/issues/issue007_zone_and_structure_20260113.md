# issue007 [x] 拖拽 Zone 边框时触发画布 PAN（viewport 变化）

## Summary
在 pointer 模式下尝试拖拽 Zone 边框移动 Zone 时，HUD 左上角显示的 `viewport.x/y` 会变化，表现为实际发生的是画布 PAN，而不是 Zone MOVE。

## Environment
- OS: （待补充）
- Browser: （待补充）
- Node: 20.10.0（当前环境提示 Vite 建议 20.19+）
- Run: `npm run dev`

## Repro
1) 创建一个 Zone
2) 将鼠标移动到 Zone 边框，按下并拖拽
3) 观察 HUD：`viewport.x/y` 在变化

## Expected vs Actual
- Expected: 拖拽 Zone 边框触发 `ZONE_MOVE`（Zone bounds 变化）；HUD 的 `viewport.x/y` 不应变化。
- Actual: 触发 `PAN`（viewport 变化），Zone 未按预期被拖动。

## Investigation
- `ZONE_MOVE` 的命中依赖 `event.target.closest('[data-zone-id]')`。
- 绘制层 SVG 在 pointer 模式下启用 `pointer-events-auto` 且 z-index 高于 Zone，导致 pointer down 的 `event.target` 常为 SVG（或其子元素），Zone 的 hit-test 失效，从而落入 `PAN` 分支。

## Fix
- 将 Zone 的交互 hit-area 从“整个矩形 div”改为“仅边框可拖拽”的 4 条透明 hit band，并显式放到 drawings SVG 之上（`z-30`）。
- Zone 边框视觉层保持 `pointer-events: none`，避免遮挡画布/绘制交互。
- 扩大边框 hit band 到 24px，并将 hit band 主要放在 Zone 外侧，提升易用性且减少遮挡 Zone 内部交互。

## Verification
- `npm run build` 通过。
- 手动回归：
  1) 拖拽 Zone 边框：HUD 的 `viewport.x/y` 不变；Zone 会移动。
  2) 在 Zone 内部空白处拖拽：仍可 PAN（HUD 的 `viewport.x/y` 变化）。

## User Confirmation
- 2026-01-13: 用户确认“已不再出现该问题”。
