# change: zone-and-structure (2026-01-13)

## 2026-01-15
- Add: `.phrase/phases/phase-zone-and-structure-20260113/issues/issue016_zone_and_structure_20260113.md` — 记录拖拽时 Spring 动画导致的视觉延迟问题。
- Modify: `.phrase/docs/ISSUES.md` — 增加 issue016 索引。
- Modify: `src/components/StickyNote.jsx` — 禁用拖拽时的 Spring 动画 (`transition: { duration: 0 }`)，实现光标与卡片的瞬时 1:1 跟随，消除视觉虚影（issue016）。
- Modify: `.phrase/phases/phase-zone-and-structure-20260113/issues/issue016_zone_and_structure_20260113.md` — 标记 issue016 为 Resolved。

## 2026-01-15 (Previous)
- Add: `.phrase/phases/phase-zone-and-structure-20260113/issues/issue015_zone_and_structure_20260113.md` — 记录 CSS 静态位置偏移导致的虚影 Bug。
- Modify: `.phrase/docs/ISSUES.md` — 增加 issue015 索引。
- Modify: `src/components/StickyNote.jsx` — 强制添加 `left-0 top-0` 到 Note 样式，彻底消除隐形渲染偏移（issue015）。
- Modify: `.phrase/phases/phase-zone-and-structure-20260113/issues/issue015_zone_and_structure_20260113.md` — 标记 issue015 为 Resolved。
...