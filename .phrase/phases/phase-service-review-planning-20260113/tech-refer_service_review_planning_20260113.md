# tech-refer: Service Review Planning (2026-01-13)

## Context
本仓库当前为 React/Vite 前端项目，目标是“空间思考画布 + Sticky Note 对话”。本 phase 的目标是回顾与规划，因此本文件只记录架构现状、选项、风险与验证思路，不做实现。

## Current Architecture (as-is)
- UI：React 19 + Vite
- Styling：TailwindCSS v4
- State：Zustand（`src/store/useStore.js`）
- Persistence：Dexie.js (IndexedDB)（`src/db.js`）
- Canvas/Interaction：`@use-gesture/react` + `framer-motion`
- AI：Ollama（本地）与 OpenAI（云），流式输出（`src/services/ai_provider.js`）

## Data Model (observed)
- Workspace：`{ id, name, createdAt, canvas }`
- Canvas：`{ backgroundImage, drawings, notes, viewport, ... }`
- Note：`{ id, position, dimensions, isExpanded, title, messages, createdAt, ... }`

## Options (for next phase, not executed here)
### Drawing Data Model (Scene Graph)
- Motivation: 绘制元素是“可操作的信息结构”，不是像素；需要可编辑、可扩展、可序列化。
- Option A: 自研轻量 scene graph（数据层结构化，渲染层可继续 SVG + RoughJS）
- Option B: 引入成熟白板内核（Excalidraw / tldraw）并做最小集整合（当前偏好：不采用）
- Trade-offs:
  - 自研：可控但需要约束与演进策略
  - 引入：能力完整但集成成本与定制边界需要评估

### Decision (current preference)
- 本项目下一阶段**不引入**类似 tldraw 这类白板库，原因：不希望以“像素/画布绘制”的方式表达区域与对象；目标是“可明确感知的数据结构”（更接近组件/DOM/SVG 节点的对象模型）。
- 因此优先方向为：自研轻量 scene graph（数据模型 + 操作模型），渲染层采用 SVG/HTML 等可检查、可选择、可组合的结构化表达。

### Zone as a First-class Node
用户需求：需要一个类似 Trello “列”的基础组件，但不是列表布局；它是一个可自由摆放的区域容器，卡片进入后保持自由摆放，仅建立归属关系。

- Membership rule: 仅当卡片 **完整进入** zone 边界时才建立归属（partial overlap 不归属）。
- Transform rule: zone 移动时，归属卡片一起移动（parent/child 变换）。
- Implications:
  - 数据层需要支持 parent/child（或 group）关系与层级 transform；
  - Hit-test/containment 需要稳定定义（以卡片外接矩形完全落入 zone 矩形为准，或未来支持旋转/非矩形时扩展）；
  - 需要可见的“归属提示”与操作（移出/解除归属）。

### Markdown Rendering
- Option A: `marked` + `DOMPurify` + `dangerouslySetInnerHTML`（现状）
  - Pros：简单、流式拼接容易
  - Cons：需要严格净化与样式维护；语法高亮需另接方案
- Option B: `react-markdown` + `remark-gfm`（已在依赖中）
  - Pros：结构化渲染，安全性更好
  - Cons：流式增量渲染策略需要设计

### Persistence Granularity
- 现状：每次 updateCanvas 直接 `db.workspaces.update(..., { canvas })`
  - 风险：频繁写入可能导致性能/竞争；需要确认是否需要 debounce 或更细粒度表结构（下一 phase 决策）

## Risks & Mitigations (for review)
- 安全：OpenAI key 存于 localStorage（可接受但需提示与错误处理一致性）。
- 隐私：Ollama baseUrl 可配置；需要明确只连接用户指定的本地端点。
- 可用性：IndexedDB 权限/容量/隐私模式可能导致失败；需要用户可理解的降级策略（待规划）。
- 一致性：`walkthrough.md` 与实现可能不一致；以实现为准并记录差异。
- 可演进性：绘制模型若停留在“像素/一次性数据”，会阻碍下一阶段的编辑/语义能力；需在下一阶段明确对象模型与渲染分层。

## Verification Approach
本 phase 的验证聚焦“事实是否为真”，建议按两层：
1) 静态核验（代码阅读）：确认功能入口/数据流/持久化点/错误处理路径存在。
2) 动态核验（手动步骤）：按 `spec_*` 的旅途逐条操作，记录预期与实际差异，并在 `spec_*` 的 Truth Table 更新结论。
