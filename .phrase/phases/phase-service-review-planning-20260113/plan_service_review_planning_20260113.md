# plan: Service Review Planning (2026-01-13)

## Milestones
1) 迁移与拆解输入：把历史文档移动到本 phase `inputs/`，并在 `spec_*` 建立事实结构与引用。
2) 服务设计回顾：以用户旅途为主，补充必要的服务蓝图视角（后台依赖/失败路径）。
3) 真实性验证：对关键交互与陈述逐条核验，更新 `spec_*` 的 Truth Table 结论。
4) 改进计划草案：输出下一阶段（实现阶段）的改进方向、优先级、验收口径与验证方式（不拆 task）。
5) Phase 冻结：确认产出满足验收后，将 phase 目录重命名为 `DONE-phase-service-review-planning-20260113/`。

## Scope
- 文档：`spec_* / plan_* / tech-refer_*`。
- 输入迁移：`product_spec.md`、`walkthrough.md` 移入 phase `inputs/`。
- 事实核验：以当前实现（代码 + 实际运行）为准，不以历史文档为准。

## Out of Scope
- 不改代码。
- 不拆“实现类”`taskNNN`（本 phase 仅允许文档/验证活动用 `taskNNN` 做可追溯记录）。

## Priorities
P0
- 建立单一事实来源（phase 文档为准）。
- 核验“用户可感知”的关键流程：创建/展开/对话/持久化/AI 配置/错误反馈。

P1
- 画布工具与背景图交互的服务设计回顾与问题清单。

P2
- 下一阶段改进方向的排序（可用 RICE/ICE，但保持简洁）。

## Next Phase: Improvement Plan Draft (from verified issues)
说明：以下为“下一阶段（实现阶段）”的改进草案；本 phase 不做实现。

### Initiative A (P0): Settings 可读性与交互（issue001）
- Problem: Settings 弹窗内容在画布背景上不可读（背景过透明/缺失）。
- Proposed: 强化弹窗主体背景与对比度（不透明背景、边框/阴影、控件状态更清晰），在不同画布背景下保持可读。
- Acceptance:
  - 在浅色/深色/复杂纹理背景下，控件与文本均可清晰辨识（截图对比）。
  - 弹窗打开/关闭/点击外部关闭的交互一致且无误触。
- Verification: 以同一套背景图集合做手动回归（与 `issue001` 的复现步骤一致）。

### Initiative B (P0): 背景图缩放可用性（issue002）
- Problem: 背景图选中后可拖拽但缺少明确缩放交互（鼠标无 resize 光标/把手；用户无法缩放）。
- Proposed (choose one, or combine):
  - B1: 提供 resize handles（角落/边缘）+ 鼠标拖拽缩放；
  - B2: 明确并提示可用缩放手势（trackpad pinch / Ctrl+wheel），并在选中态展示提示；
  - B3: 两者都做，定义统一的缩放验收口径与持久化行为。
- Acceptance:
  - 鼠标用户可发现并完成缩放；交互有明确 affordance（光标/把手/提示）。
  - 缩放结果持久化并在刷新后保留。
- Verification: 执行 `spec_*` 的 C09 并补充截图证据。

### Initiative C (P1): 绘制语义对象模型（scene graph）（issue003）
- Problem: 绘制元素不应停留在“像素画图”，需要可编辑/可扩展/可序列化的对象模型支撑后续能力。
- Proposed:
  - 明确数据层对象模型（scene graph）与渲染层分离；
  - 明确操作层（选择/拖拽/缩放/编辑/删除）的命令与可撤销记录接口；
  - 评估“自研轻量 scene graph” vs “引入白板内核”。
- Acceptance (phase gate for implementation):
  - 输出 `tech-refer_*` 的决策（选型 + trade-offs + rollback）。
  - 最小可用对象模型可覆盖现有 rect/circle/arrow/text/path 并可稳定序列化（不要求 UI 完成）。
- Verification: 以 C10 的现状用例作为回归基线，并补充“模型一致性”验证用例。

### Initiative D (P1): Zone 作为基础组件（issue004）
- Problem: 需要在画布上表达“区域归属”（像 Trello 的列，但自由摆放、非列表布局），以便卡片能被组织进区域并随区域移动。
- Proposed:
  - 引入 first-class Zone 节点，支持边界、选择、高亮与归属关系；
  - 归属规则：卡片 **完整进入** zone 才归属；移出则解除归属；
  - 变换规则：zone 移动时 child 卡片一起移动。
- Acceptance:
  - 用户可创建/移动 zone；卡片在完整进入后显示“已归属”且跟随移动；
  - 卡片仍保持自由摆放（不自动列表化）；可解除归属。
- Verification: 增加对应手动用例与边界条件（partial overlap 不归属；多个 zone 冲突时优先级清晰）。

## Risks & Dependencies
- 依赖本机环境：Ollama 服务、OpenAI key（仅用于验证，不写入仓库）。
- 验证口径漂移：必须把“观察到的事实”写清楚（操作步骤 + 可见反馈）。
- 输入文档与实现不一致：以实现为准，文档做“纠错记录”。

## Rollback (Documentation)
- 若 phase 文档结构不合适，可保留 `inputs/` 原文档作为回退事实来源，并在 `tech-refer_*` 记录改动原因。
