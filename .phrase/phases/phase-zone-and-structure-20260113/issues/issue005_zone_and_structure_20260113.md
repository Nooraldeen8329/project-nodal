# issue005 [ ] Zone 阶段变更后页面空白（疑似运行时崩溃）

## Summary
在 `phase-zone-and-structure-20260113` 的实现改动（task004/task005）后，页面出现“一片空白”的现象，疑似运行时异常导致应用未渲染。

用户要求：先记录 issue，待当前任务序列执行完再回头处理。

## Environment
- OS: （待补充）
- Browser: （待补充）
- Node: 20.10.0（当前环境提示 Vite 建议 20.19+）
- Run: `npm run dev`

## Repro
1) `npm run dev`
2) 打开页面
3) 观察：页面空白
4) 打开 DevTools Console 查看是否有报错（待补充）

## Expected vs Actual
- Expected: 应正常显示 Workspace sidebar 与画布。
- Actual: 页面空白（无内容或仅空白背景）。

## Investigation (TODO)
- 收集 Console 错误堆栈（最高优先级）。
- 观察到的错误样例：`Uncaught ReferenceError: Cannot access 'Sn' before initialization`（minified bundle）。
- 初步判断：build 后压缩/作用域重写导致 `Canvas.jsx` 内某些 `const fn = () => {}` 被重命名并在 JSX/Hook 中先引用后初始化（TDZ）。

## Suspected Area
- `src/components/Canvas.jsx`（Zone MVP 变更点较集中）
- `src/store/useStore.js`（init/normalize 逻辑变更）

## Fix Plan (Deferred)
已执行最小修复（2026-01-13）：
1) 将 `Canvas.jsx` 中关键的函数从 `const fn = () => {}` 改为 `function fn(){}`（避免 TDZ 风险）。
2) 重新 `npm run build` 生成新的 bundle 文件名。
3) 待用户在浏览器确认错误消失后，将本 issue 标记为 [x]。

## Verification
-（待执行）修复后：
- 页面不再空白，可正常进入 Workspace/Canvas
- `npm run build` 通过
- 手动回归：创建 note / 打开 modal / Zone 基本操作不受影响

## User Confirmation
- 2026-01-13: 用户反馈“之前的改动影响页面结构，现在网页显示一片空；先记录 issue，稍后处理”。
- 2026-01-13: 用户反馈 build 后 console 报错 `Cannot access 'Sn' before initialization`。

## Related
- Phase: `.phrase/phases/phase-zone-and-structure-20260113/README.md`
- Tasks: `task004`, `task005`（`.phrase/phases/phase-zone-and-structure-20260113/task_zone_and_structure_20260113.md`）
