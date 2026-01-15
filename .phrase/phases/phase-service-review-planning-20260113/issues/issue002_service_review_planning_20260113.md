# issue002 [ ] 背景图无法缩放（缺少 resize 交互）

## Summary
背景图在被选中后可拖拽，但看起来无法进行缩放：鼠标移到图片边缘没有出现 resize 光标或可交互的缩放把手，导致用户无法调整背景图尺寸。

## Environment
- OS: （待补充）
- Browser: （待补充）
- Build: `npm run dev` / `npm run preview`（待补充）

## Repro
1) 上传并显示一张背景图。
2) 按 `Ctrl`/`Meta` 点击背景图使其进入选中状态（如当前交互所示）。
3) 将鼠标移动到背景图边缘/角落，尝试拖拽缩放。

## Expected vs Actual
- Expected: 存在明确的缩放交互（边缘/角落 resize 把手或可拖拽缩放手势），并且光标/视觉提示清晰。
- Actual: 未出现 resize 光标/把手，拖拽只表现为移动，无法缩放。

## Investigation
- 需要确认当前版本是否“只实现了缩放手势（pinch）而未实现鼠标 resize”：
  - `Canvas.jsx` 中存在 `onPinch` 对 `bgTransform.scale` 的更新逻辑（提示可能仅支持触控板/触屏缩放）。
  - UI/视觉上缺少缩放 affordance（手柄/光标），导致用户不知道如何缩放。

## Fix (Proposed)
（本 phase 不改代码）下一阶段可选方案：
- 方案 A：提供明确的 UI resize handles（角落/边缘），鼠标拖拽改变 `scale`。
- 方案 B：明确告知缩放手势（例如 trackpad pinch / Ctrl+wheel），并在选中态展示提示。
- 方案 C：两者都做，并定义“缩放”的验收口径（鼠标+触控板一致性）。

## Verification
（待执行）修复后验证：
- 鼠标能缩放且有清晰 affordance（光标/手柄）。
- 触控板 pinch（如支持）与鼠标缩放一致。
- 缩放结果持久化并在刷新后保留。

## User Confirmation
- 2026-01-13: 用户反馈“除了背景图似乎无法正确缩放（鼠标在图片边缘无变更大小的选择光标）之外，都正常”。

## Related
- Phase: `.phrase/phases/phase-service-review-planning-20260113/README.md`
- Spec checklist: C09（`.phrase/phases/phase-service-review-planning-20260113/spec_service_review_planning_20260113.md`）
- Task: task003（登记用户可感知问题为 issue）

