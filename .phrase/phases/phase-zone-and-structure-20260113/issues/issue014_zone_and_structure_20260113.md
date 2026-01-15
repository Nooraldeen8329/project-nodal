# Issue 014: Adaptive wrapping with Stable Anchor (manualBounds)

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: High
- **Related Phase**: phase-zone-and-structure-20260113

## Description
The "Tight Fit" adaptive sizing caused a "Shadow Effect" where the Zone would follow a single Note as it moved, rather than acting as a stable container. Users want the Zone to expand to wrap cards at the edges but remain stable when cards are moved within the core area.

## Impact
- **UX**: Eliminates the feeling that the Zone is "attached" to the Note.
- **Aesthetics**: Provides a stable spatial frame.

## Changes
- Introduced `manualBounds` in Zone data model (stored in `useStore.js`).
- `manualBounds` is updated only during manual creation, move, or resize of the Zone.
- `autoGrow` now calculates: `Final Bounds = Union(manualBounds, Content Bounds)`.
- **Result**: Zone grows when a Note pushes past `manualBounds` but shrinks back ONLY to `manualBounds` when the Note moves inward.

## Verification
- Place a note in a Zone. Move it inside -> Zone remains stable (at `manualBounds`).
- Drag note to the edge -> Zone expands to wrap.
- Drag note back to center -> Zone shrinks back to `manualBounds` (Stable Anchor).
