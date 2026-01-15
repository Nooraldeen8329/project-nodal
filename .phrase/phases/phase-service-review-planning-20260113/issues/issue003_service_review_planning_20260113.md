# issue003 [ ] 绘制“底层模型”需要从像素走向语义对象（scene graph）

## Summary
当前绘制功能（square/circle/arrow/text/path）的交互链路可用，但底层不应定位为“像素画图”；应升级为一套可明确感知、可编辑、可序列化的对象模型（类似网页组件/scene graph），以支撑下一阶段的编辑能力与服务设计目标。

## Why This Matters (Service Design)
用户把画布当作“思考空间”，绘制元素不是装饰像素，而是信息结构与关系的一部分：
- 需要可选择、可编辑、可对齐、可约束、可链接、可查找
- 需要稳定的持久化与迁移（跨版本/跨设备）

## Current Observation
- 目前交互层面可创建/选中/移动/缩放/删除（用户反馈 Pass）。
- 但对象模型的“语义性与可扩展性”不足：后续一旦引入关系、布局、属性面板、历史/协作等，会被现模型限制。

## Proposed Direction (for next phase)
（本 phase 不改代码）建议下一阶段明确：
- 统一对象模型（Scene Graph）：`Node { id, type, props, style, transform, zIndex, bindings? }`
- 渲染层与数据层分离：数据层决定“是什么”，渲染层决定“怎么画”（SVG/Canvas/RoughJS）
- 操作层统一：选择/拖拽/缩放/编辑/删除走同一套命令与可撤销记录

## Options (non-exhaustive)
- Option A: 自研轻量 scene graph（继续基于 SVG + RoughJS，但结构化数据模型）
- Option B: 引入成熟白板内核（例如 Excalidraw / tldraw）并做最小集整合（当前偏好：不采用）
- Option C: 混合：保留现 UI 交互，逐步迁移绘制数据到 scene graph，再决定渲染实现

## Constraint / Preference
- 下一阶段不使用类似 tldraw 的库：不希望用“像素/画布绘制”的方式表达区域与对象，而是希望对象本身就是可感知的数据结构（更像组件）。

## Verification (future)
下一阶段定义验收口径：
- 同一对象在刷新/缩放/拖拽后属性稳定
- 属性面板可编辑并可追溯（序列化一致）
- 为“链接/语义/搜索/对齐”留出扩展点

## User Confirmation
- 2026-01-13: 用户反馈“C10 当前正常，但底层要换：不应作为像素，而是可明确感知的数据结构（类似网页组件）”。

## Related
- Spec checklist: C10（`.phrase/phases/phase-service-review-planning-20260113/spec_service_review_planning_20260113.md`）
