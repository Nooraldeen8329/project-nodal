# Canvas 坐标系统设计问题分析

## 问题本质

**Canvas.jsx 没有统一的坐标变换系统。**

每个组件各自实现坐标逻辑，导致：
- 代码重复
- 不一致的渲染位置
- 难以排查的 bug（如连线偏移 146px）

---

## 当前状态：三套独立的坐标系统

### 1. Notes (StickyNote.jsx)
```javascript
// 拖拽时：除以 zoom 得到世界坐标
let newX = memo.x + (mx / viewport.zoom);

// 渲染时：Framer Motion transform (相对于 World 容器)
animate={{ x: currentPos.x, y: currentPos.y }}
```

### 2. Connections (ConnectionsLayer.jsx)
```javascript
// 直接使用世界坐标画线
<line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />

// SVG 坐标系统，依赖父容器的 CSS transform 进行视口变换
```

### 3. Zones (Canvas.jsx inline)
```javascript
// 直接使用世界坐标作为 CSS left/top
style={{ left: x, top: y, width, height }}
```

---

## 为什么会偏移 146px？

```
                    ┌─────────────────────────────────────┐
                    │         Screen (viewport)           │
                    │  ┌──────────────────────────────────│──────┐
                    │  │  Header (146px)                  │      │
                    │  ├──────────────────────────────────│──────┤
                    │  │                                  │      │
  Notes 认为的      │  │  ●  Note at world(100, 100)      │      │
  (0,0) 在这里 ────────▶│     → screen(100 + 146, 100)     │      │
                    │  │                                  │      │
                    │  │                                  │      │
  SVG 认为的        │  │                                  │      │
  (0,0) 在这里 ─────│──▶  Line at svg(100, 100)           │      │
                    │  │     → screen(100, 100) ← 错了！   │      │
                    │  │                                  │      │
                    └──┴──────────────────────────────────┴──────┘
```

Notes 在 DOM 中的 offsetTop 不是 0（被 header 推下来），但 SVG 的坐标系原点在 World 容器的 (0,0)。

---

## 根本原因：缺少统一的坐标变换层

### 应该有的架构
```
┌─────────────────────────────────────────────────────────┐
│                    toScreen(worldPos)                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │  worldPos → screenPos = worldPos * zoom + offset    ││
│  └─────────────────────────────────────────────────────┘│
│                           │                              │
│           ┌───────────────┼───────────────┐              │
│           ▼               ▼               ▼              │
│        Notes          Connections       Zones            │
│    (都用同一个函数)   (都用同一个函数)  (都用同一个函数)  │
└─────────────────────────────────────────────────────────┘
```

### 实际的架构（混乱）
```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│    Notes     │   │  Connections │   │    Zones     │
│ FM animate() │   │ SVG coords   │   │ CSS left/top │
│ + drag/zoom  │   │ + g transform│   │ inline style │
│   补偿       │   │   (不一致)    │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
     各自计算           各自计算           各自计算
```

---

## 行业标准方案（tldraw / React Flow / Excalidraw）

| 库 | Screen 坐标 | World/Page 坐标 | 转换机制 |
|---|---|---|---|
| **tldraw** | 屏幕左上角为原点 | 无限画布的"零点" | `Editor` 类提供统一转换 API |
| **React Flow** | viewport `{x, y, zoom}` | 节点 `{x, y}` | `project()` 函数转换 |
| **Excalidraw** | 视口坐标 | 元素位置 | 内部变换矩阵 |

### 共同架构原则

1. **关注点分离**：Screen 坐标（UI 交互用）和 World 坐标（数据存储用）明确分开
2. **统一转换层**：提供 **单一的** `toScreen()`/`toWorld()` 函数，所有组件共用
3. **变换矩阵**：使用数学矩阵处理 translate/scale/rotate，而不是各组件自己算

### tldraw 的具体做法

```javascript
// tldraw 的 Editor 类提供：
editor.screenToPage(screenPoint)  // 屏幕 → 画布
editor.pageToScreen(pagePoint)    // 画布 → 屏幕

// 所有形状都维护自己的 transformation matrix
// 分组时矩阵层级组合
```

---

## 解决方案方向

### Option A: 统一使用 CSS Transform

所有元素（Notes, Connections, Zones）都：
1. 放在同一个 World 容器内
2. 使用相同的 `absolute left-0 top-0 + transform: translate(x, y)`
3. 连线改用 CSS/HTML 实现，不用 SVG

**优点**：完全统一，无坐标系不匹配
**缺点**：连线实现复杂（可能需要用 div + rotate）

### Option B: 给 SVG 正确的偏移

保持现有架构，但：
1. 计算 Notes 相对于 World 容器的实际偏移
2. 在 SVG 内应用相同的偏移

**优点**：改动小
**缺点**：治标不治本，下次还会出问题

### ✅ Option C: 创建统一的坐标变换工具（采用）

新建 `src/utils/coordinates.js`：
```javascript
export function worldToScreen(worldPos, viewport) {
    return {
        x: worldPos.x * viewport.zoom + viewport.x,
        y: worldPos.y * viewport.zoom + viewport.y
    };
}

export function screenToWorld(screenPos, viewport) {
    return {
        x: (screenPos.x - viewport.x) / viewport.zoom,
        y: (screenPos.y - viewport.y) / viewport.zoom
    };
}
```

所有组件都用这个，不再各自计算。

**优点**：标准化、符合行业最佳实践
**缺点**：需重构多处代码

---

## 下一步行动

1. ~~短期：先让连线能用（Option B）~~
2. **✅ 采用 Option C：创建统一坐标变换工具**
3. 重构 Notes、Connections、Zones 使用统一 API
