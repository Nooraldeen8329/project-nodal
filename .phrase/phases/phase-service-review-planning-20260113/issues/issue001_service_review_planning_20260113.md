# issue001 [ ] Settings 页面缺乏背景导致不可读

## Summary
Settings 弹窗的样式/交互存在可读性问题：弹窗内容区域呈“纯透明/缺乏背景”，导致选项与输入框在画布背景上难以辨识。

## Environment
- OS: （待补充）
- Browser: （待补充）
- Build: `npm run dev` / `npm run preview`（待补充）

## Repro
1) 打开应用。
2) 点击 sidebar 顶部的 Settings（齿轮）。
3) 观察弹窗主体（选项按钮、输入框、文字）在当前画布背景上的可读性。

## Expected vs Actual
- Expected: 弹窗主体有稳定、清晰的背景（不受画布背景影响），控件对比度足够，信息可读。
- Actual: 弹窗主体背景看起来近似透明/缺失，导致选项看不清。

## Investigation
- 代码静态观察：`src/components/SettingsModal.jsx` 内层容器应有 `bg-white`，理论上不应“纯透明”；需要复现后检查：
  - Tailwind 样式是否正确注入（构建产物与运行时 class 是否生效）
  - 是否存在主题/全局 CSS 覆盖 `background-color` 或 `opacity`
  - 是否是“遮罩层”与“主体层”视觉混淆（例如内层背景与外层 overlay 叠加后仍过透明）

## Fix (Proposed)
（本 phase 不改代码）先在下一阶段实现时考虑：
- 强化主体背景与对比度（例如不透明背景、轻微边框与阴影、主题色对比检查）。
- 在不同画布背景图下做可读性验证（浅色/深色/复杂纹理）。

## Verification
（待执行）修复后以不同背景图复验可读性，并附截图对比（同一背景、同一缩放）。

## User Confirmation
- 2026-01-13: 用户反馈“功能 OK，但样式与交互需要优化：当前纯透明缺乏背景导致看不清”。

## Related
- Phase: `.phrase/phases/phase-service-review-planning-20260113/README.md`
- Spec checklist: C05（`.phrase/phases/phase-service-review-planning-20260113/spec_service_review_planning_20260113.md`）
- Task: task003（登记用户可感知问题为 issue）

