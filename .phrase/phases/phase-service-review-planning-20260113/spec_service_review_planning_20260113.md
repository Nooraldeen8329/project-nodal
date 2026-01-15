# spec: Service Review Planning (2026-01-13)

## Summary
本 spec 记录“当前已完成的产品事实”和“服务设计视角下的用户旅途”，并标注哪些内容已被验证为真、哪些仍需要验证。

本阶段产出仅限文档（`spec/plan/tech-refer`），不修改代码。

## Goals
- 将现有事实来源（代码行为 + 历史文档）迁移为本 phase 的单一事实来源。
- 以用户旅途为主，描述用户操作 → 系统反馈 → 失败/回退路径。
- 对历史文档中的关键陈述做真实性核验，产出“已验证/待验证/不一致”清单。
- 为下一阶段（实现阶段）准备可执行的改进计划输入（在 `plan_*` 中体现）。

## Non-goals
- 不修改任何代码。
- 不在本阶段拆分“实现类”`taskNNN`；仅允许“文档/验证活动”使用 `taskNNN` 做可追溯记录。

## Current Service: User Journey (Primary)
说明：以下旅途以“单人使用、隐私优先、本地优先”为前提；细节以当前代码行为为准。

### Concept Candidate: Zone
目的：在画布上提供一个“可摆放的区域容器”，用于表达归属关系（而非列表布局），类似 FigJam/Figma 的 Frame（在本项目中称为 Zone）。

- 用户操作：创建一个 Zone；拖拽对话卡片进入/移出该区域。
- 系统反馈：
  - 卡片在“完整进入区域边界”后建立归属关系（成为该 Zone 的 child）；
  - 卡片进入后仍保持自由摆放（不自动变成列表/栈布局）；
  - 当 Zone 移动时，其内部归属的卡片一起移动（child 跟随 parent）。
- 失败/回退：
  - 卡片只部分进入：不建立归属关系；
  - 需要清晰的归属提示（例如边框高亮、面包屑/标签）以避免“看不出来属于哪里”。

### Journey 0: 启动与进入工作区
- 用户操作：打开应用（Vite dev/preview）。
- 系统反馈：展示 sidebar（Workspaces）与画布区域。
- 回退/失败：
  - IndexedDB 不可用/被禁用：应有可理解的失败反馈（待验证）。

### Journey 1: Workspace 管理
- 用户操作：创建 Workspace（sidebar “New Workspace”）。
- 系统反馈：workspace 列表新增项并切换到新 workspace。
- 用户操作：切换 Workspace（点击列表项）。
- 系统反馈：画布内容切换。
- 用户操作：重命名 Workspace（列表项 hover 出现 edit）。
- 系统反馈：名称更新并持久化。
- 用户操作：删除 Workspace（trash + confirm）。
- 系统反馈：被删 workspace 消失；如果删的是当前 workspace，会切换到剩余或自动创建一个新的。

### Journey 2: 画布导航（Pan/Zoom）
- 用户操作：拖拽背景（手势）进行平移；滚轮/触控板进行缩放（具体手势待验证）。
- 系统反馈：viewport 更新，内容保持相对位置。
- 回退/失败：
  - 当 Note modal 展开时应禁用画布手势（已在代码中体现，需验证体验）。

### Journey 3: 背景图导入与调整
- 用户操作：上传背景图（UI 入口与交互待验证）。
- 系统反馈：背景图展示；被压缩到目标宽度后存储；可选择并拖拽/缩放（需按指定按键/操作）。
- 回退/失败：
  - 图片过小/过大：弹出提示并拒绝导入（已在代码中体现，需验证）。

### Journey 4: 绘制与选择（Shape / Path / Text）
- 说明：该能力已在后续实现阶段被移除（task014），当前产品不再提供画形状/文本/橡皮擦绘制功能。

### Journey 5: 创建便签（Sticky Note）
- 用户操作：在空白处双击（tool=pointer）。
- 系统反馈：创建一个新 Note，并立即展开为 modal（“零延迟捕捉”）。
- 回退/失败：
  - 双击发生在 Note/Backdrop/输入框上不应创建新 note（代码中有防护，需验证边界）。

### Journey 6: 展开/收起便签（Modal）
- 用户操作：点击 note header 或双击 note body 展开；点击 backdrop/close 收起。
- 系统反馈：出现居中 modal overlay，与 canvas 缩放/平移解耦；动画平滑。
- 回退/失败：
  - 收起后紧接着的双击不应误创建 note（代码中有 `modalJustClosed` 防护，需验证）。

### Journey 7: 对话（Ollama / OpenAI）
- 用户操作：在 note 输入框 Enter 发送。
- 系统反馈：
  - 立即追加 user message；
  - 追加 assistant 占位；
  - 通过流式回调逐步更新 assistant 内容；
  - 首条对话完成后自动生成 note title（最多 5 个词，英文提示词）。
- 回退/失败：
  - Ollama 不可用：显示可理解错误（需验证实际错误文案）。
  - OpenAI key 无效/额度不足：显示可理解错误（需验证）。

### Journey 8: Fork（从一条消息生成新便签）
- 用户操作：对某条消息点击 fork 按钮。
- 系统反馈：创建新 note，内容包含被 fork 的消息，并在附近偏移位置出现（是否自动展开待验证）。

## Truth Table: Verified vs Needs Verification
说明：本表用于核验历史文档与实现的一致性。

### Verified by Code Reading (static)
- 技术栈：React + Vite + TailwindCSS + Zustand + Dexie（见 `package.json`、`src/store/useStore.js`、`src/db.js`）。
- 本地持久化：IndexedDB 存 `workspaces`，workspace 记录内含 `canvas`（见 `src/db.js`、`src/store/useStore.js`）。
- AI Provider：Ollama + OpenAI，且均实现流式读取（见 `src/services/ai_provider.js`）。
- Note modal 通过 Portal 渲染到 `document.body`（见 `src/components/Canvas.jsx`）。

### Needs Runtime Verification (behavior)
- 画布缩放/平移的具体手势与是否稳定：用户确认稳定，可自如缩放（2026-01-13）。
- 背景图入口与选择/拖拽/缩放：C09 Partial（issue002）。
- 绘制工具链路：C10 N/A（后续已移除绘制功能，task014）。
- Markdown 渲染与代码块展示（已验证：C08 Pass）。

### Known Inconsistencies / Open Questions
- `walkthrough.md` 的 “syntax highlighting” 陈述：用户验证体验无问题（C08 Pass）；若下一阶段需要严格定义“高亮”标准（例如按语言 token 上色），再细化验收口径。

## Manual Verification Checklist (task002 inputs)
目标：把 “Needs Runtime Verification” 变成可执行的逐条验证，并把结果回写到本文件（Truth Table / Open Questions）。

### Prerequisites
- Node.js + npm
- （可选）Ollama：`ollama serve`，并已拉取模型（例如 `ollama pull llama3`）
- （可选）OpenAI：准备一个可用 API Key（仅用于本地验证，不写入仓库）

### How to Run
- `npm install`
- `npm run dev`

### Evidence Format (write back here)
对每条验证写 4 个字段：
- Result: Pass | Fail | Partial | N/A
- Evidence: 可见反馈描述 + 截图/录屏文件名（若有）+ 关键日志（若有）
- Notes: 与历史文档不一致处、边界条件
- Follow-up: 是否需要 issueNNN

### Checklist
#### C01 — App Launch & Default Workspace
- Steps:
  1) 清空站点存储（IndexedDB + localStorage）后刷新页面。
  2) 观察是否自动创建默认 workspace 并进入画布。
- Expected:
  - sidebar 出现 “Workspaces” 与至少 1 个 workspace；
  - 页面无明显报错；画布可交互。
- Result: Pass
- Evidence: 用户确认 C01 无问题（2026-01-13）。
- Notes: —
- Follow-up: N/A

#### C02 — Workspace CRUD & Persistence
- Steps:
  1) New Workspace 创建一个 workspace。
  2) 重命名 workspace。
  3) 切换到另一个 workspace，再切回来。
  4) 刷新页面，确认名称与当前 workspace 记忆是否符合预期。
  5) 删除当前 workspace，观察自动切换/自动创建逻辑。
- Expected:
  - 创建/重命名/切换/删除均有可见反馈；
  - 刷新后数据仍存在（持久化为真）。
- Result: Pass
- Evidence: 用户确认 C02 无问题（2026-01-13）。
- Notes: —
- Follow-up: N/A

#### C03 — Create Note (Double Click Empty Space)
- Steps:
  1) tool=pointer（默认）。
  2) 在空白处双击。
- Expected:
  - 创建新 note；
  - 新 note 自动展开为 modal。
- Result: Pass
- Evidence: 用户确认 C03 无问题（2026-01-13）。
- Notes: —
- Follow-up: N/A

#### C04 — Modal Expand/Collapse & Misfire Guard
- Steps:
  1) 展开一个 note（header click 或 body double click）。
  2) 关闭 modal（backdrop click 或 close）。
  3) 立即在画布上做一次双击，观察是否误创建 note。
- Expected:
  - modal 与 canvas pan/zoom 解耦；
  - 关闭后不会因“关闭瞬间双击”误创建 note（`modalJustClosed` 防护为真）。
- Result: Pass
- Evidence: 用户确认 C04 无问题（2026-01-13）。
- Notes: —
- Follow-up: N/A

#### C05 — AI Settings (Ollama)
- Steps:
  1) 打开 Settings，选择 Ollama。
  2) 修改 baseUrl/model（例如 `http://localhost:11434` / `llama3`）。
  3) Done 关闭后刷新页面，确认设置是否保留。
- Expected:
  - 设置可编辑、保存并在刷新后仍存在（localStorage 为真）。
- Result: Pass
- Evidence: 用户确认功能无问题（设置可保存且刷新后保留，2026-01-13）。
- Notes: 设置页样式/交互需要优化：当前“纯透明/缺乏背景”，导致选项看不清（待复现与定位）。
- Follow-up: issue001

#### C06 — AI Chat Streaming (Ollama)
- Steps:
  1) 确保 Ollama 可用。
  2) 在 note 输入一条消息并 Enter。
- Expected:
  - assistant 内容逐步更新（流式）；
  - 首次对话完成后 note title 自动更新（若触发条件满足）。
- Result: Pass
- Evidence: 用户确认 C06 无问题（流式对话正常，2026-01-13）。
- Notes: —
- Follow-up: N/A

#### C07 — AI Chat Error Handling (Ollama Unavailable)
- Steps:
  1) 将 baseUrl 改为不可访问地址（例如 `http://localhost:9999`）。
  2) 发送消息。
- Expected:
  - UI 显示可理解的错误信息（而非静默失败）。
- Result: Pass
- Evidence: 用户确认 C07 无问题（错误反馈可理解，2026-01-13）。
- Notes: —
- Follow-up: N/A

#### C08 — Markdown Rendering & “Syntax Highlighting” Claim
- Steps:
  1) 让 AI 输出一个带代码块的回答（例如 Fibonacci）。
  2) 观察代码块样式与是否存在语法高亮。
- Expected:
  - markdown 基础渲染存在（段落/列表/代码块）；
  - “语法高亮”若不存在，应将 `walkthrough` 的该陈述标记为不一致并说明现状。
- Result: Pass
- Evidence: 用户确认 C08 无问题（2026-01-13）。
- Notes: —
- Follow-up: N/A

#### C09 — Background Image: Select/Move/Scale
- Steps:
  1) 找到背景图上传入口并设置一张图片。
  2) 按 `Ctrl`/`Meta` 点击背景图使其被选中（如 walkthrough 所述）。
  3) 拖拽/缩放背景图，观察是否可用，取消选择是否符合描述。
- Expected:
  - 上传成功且持久化；
  - 选中、拖拽、缩放、取消选择行为一致或能解释差异。
- Result: Partial
- Evidence: 用户反馈除“缩放”外均正常（2026-01-13）。
- Notes: 背景图似乎无法正确缩放：鼠标移动到图片边缘未出现变更大小的选择光标/resize affordance。
- Follow-up: issue002

#### C10 — Drawing Tools: Create/Select/Move/Delete
- Steps:
  1) 用 square/circle/arrow/text 各画一个对象。
  2) 选中对象并移动/缩放（如有 handle）。
  3) Backspace/Delete 删除选中对象。
- Expected:
  - 创建/选中/移动/缩放/删除链路完整；
  - 不会误触创建 note（尤其在非 pointer 工具下）。
- Result: N/A
- Evidence: 2026-01-13 用户曾确认 C10 正常；后续绘制功能已被移除（task014）。
- Notes: 当前阶段不再回归该链路；若未来重引入绘制能力，应基于语义对象模型（scene graph）重新定义并验收。
- Follow-up: issue003（保留：绘制语义对象模型方向）

## Acceptance Criteria (for this phase)
- 本 phase 文档存在且互相引用清晰（`README/spec/plan/tech-refer/change`）。
- `inputs/` 内保留迁移前的源文档，且源文档已不再位于仓库根目录。
- Truth Table 中的 “Needs Runtime Verification” 被逐条补齐验证结论（未来更新本 spec）。
