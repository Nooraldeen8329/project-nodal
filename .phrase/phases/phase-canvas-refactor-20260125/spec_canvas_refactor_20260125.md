# Canvas.jsx 数据流重构规格

## 问题描述

`Canvas.jsx` 当前是一个 1223 行的单体组件，存在以下架构问题：

### 1. 数据孤岛（致命问题）

```javascript
// L31: 从 Store 读取 workspaces
const { workspaces, currentWorkspaceId, updateCanvas: _updateCanvas } = useStore();

// L44-L55: 但所有实际数据都存在本地 useState 中
const [zones, setZones] = useState([]);      // 应该来自 Store
const [notes, setNotes] = useState([]);      // 应该来自 Store
const [connections, setConnections] = useState([]);  // 应该来自 Store
const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });  // 应该来自 Store
const [backgroundImage, setBackgroundImage] = useState(null);  // 应该来自 Store
```

**后果**：刷新页面 = 数据归零。Store 中 `updateCanvas` 被标记为 `_updateCanvas`（未使用）。

### 2. 死代码

```javascript
// L137-L160: 五个 save* 函数全部只是 console.log
const saveZones = useCallback((newZones) => {
    console.log('Saving zones:', newZones);  // TODO 未实现
}, []);
```

这些函数被 23 处调用，但全部是假的。

### 3. 手势处理器过大

`useGesture.onDrag` 回调长达 258 行，使用 `memo.mode` 模拟状态机，混杂 5 种不同的交互逻辑。

---

## 目标

1. **单一数据源**：所有 canvas 数据（notes, zones, connections, viewport, background）从 Store 读取，修改时调用 `updateCanvas`
2. **消除死代码**：删除所有 `save*()` 函数
3. **模块化手势**：将手势处理拆分为独立 hooks

---

## 数据模型

Store 中已有的数据结构（`useStore.js` L5-L14）：

```javascript
const createDefaultCanvas = () => ({
    schemaVersion: 1,
    backgroundImage: null,
    backgroundTransform: { x: 0, y: 0, scale: 1 },
    sceneGraph: { version: 1, nodes: [] },
    notes: [],
    connections: [],
    zones: [],
    viewport: { x: 0, y: 0, zoom: 1 }
});
```

**结论**：Store 结构完备，Canvas.jsx 只需使用它，不需要本地副本。

---

## 非目标

- 不修改 Store 结构
- 不增加新功能
- 不修改 StickyNote.jsx
