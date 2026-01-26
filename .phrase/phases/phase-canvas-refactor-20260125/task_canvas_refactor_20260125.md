3343# Canvas.jsx 重构任务清单

## Phase 目标
将 Canvas.jsx 从 1223 行的单体组件重构为模块化、数据驱动的架构，消除数据孤岛，统一使用 Zustand Store 作为单一数据源。

---

## 任务列表

### Phase 0: 统一坐标系统（核心） ⭐ 新增

> **背景**：连线偏移问题的根因分析发现 Canvas 缺乏统一坐标变换系统。
> 详见 [analysis_coordinate_system.md](./analysis_coordinate_system.md)

- [x] **task000a** 创建 `src/utils/coordinates.js` 统一坐标变换工具
  - 函数: `worldToScreen(worldPos, viewport)` 和 `screenToWorld(screenPos, viewport)`
  - 验证: 单元测试或手动验证转换正确

- [x] **task000b** 重构 `StickyNote.jsx` 拖拽使用统一工具
  - 影响: L78-79 的 `mx / viewport.zoom` 计算
  - 验证: Note 拖拽位置正确

- [x] **task000c** 重构 `ConnectionsLayer.jsx` 连线使用统一工具
  - 影响: `getCenter()` 函数的坐标计算
  - 验证: **连线正确连接到 Note 中心**

- [x] **task000d** 重构 `Canvas.jsx` toWorld 函数使用统一工具
  - 影响: L79 的 `toWorld` 函数
  - 验证: 双击创建 Note 位置正确

- [x] **task000e** 验证连线与 Notes 对齐
  - 验证: 拖拽 Note 时连线实时跟随，无偏移

---

### Phase 1: 数据层修复（核心）

- [ ] **task001** 从 Canvas.jsx 移除本地 useState 副本，改为从 Store 读取
  - 影响: `notes`, `zones`, `connections`, `viewport`, `backgroundImage`, `backgroundTransform`
  - 验证: 刷新页面后数据应保持

- [ ] **task002** 删除死代码 `save*()` 函数（L137-L160）
  - 影响: `saveZones`, `saveNotes`, `saveViewport`, `saveBackgroundImage`, `saveBackgroundTransform`
  - 验证: Lint 无未使用变量警告

- [ ] **task003** 所有数据修改统一调用 `updateCanvas(workspaceId, patch)`
  - 影响: 23+ 处原本调用 `save*()` 的位置
  - 验证: 所有操作后 IndexedDB 中的数据正确更新

---

### Phase 2: 手势系统拆分

- [ ] **task004** 创建 `useCanvasPan.js` - 提取画布平移/缩放手势
  - 验证: 画布 pan/zoom/wheel 功能正常

- [ ] **task005** 创建 `useZoneGestures.js` - 提取 Zone 拖拽/缩放手势
  - 验证: Zone 移动、缩放、选择功能正常

- [ ] **task006** 创建 `useBackgroundGestures.js` - 提取背景图手势
  - 验证: 背景图移动、缩放功能正常

---

### Phase 3: 清理与验证

- [ ] **task007** 在 Canvas.jsx 中组合拆分后的 hooks
  - 目标: Canvas.jsx 核心逻辑降至 < 300 行
  - 验证: 所有功能回归测试通过

- [ ] **task008** 更新 GEMINI.md 架构文档
  - 验证: 文档反映新的模块结构

---

## 验收标准

1. 连线正确连接到 Note 中心（Phase 0 核心目标）
2. Canvas.jsx 行数 < 400
3. 所有数据通过 Store 读写，刷新后保持
4. 无死代码（eslint 清洁）
5. 所有现有功能无回归

