# Issue 013: Zone shrinks unexpectedly (Need Greedy Expansion)

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: High
- **Related Phase**: phase-zone-and-structure-20260113

## Description
When dragging a Note inside a Zone, if the Zone becomes empty in some areas (e.g., dragging the rightmost note to the left), the Zone immediately shrinks to wrap the new content tightly. This creates a jarring "Shadow Effect" where the Zone seems to follow the Note instead of acting as a container.

## Impact
- **UX**: Unstable layout. User feels they are "dragging the Zone" instead of "moving a Note inside".
- **Visuals**: Loss of established whitespace/territory.

## Changes
- Modified `autoGrowZonesToFitNotes` to use **Greedy Expansion Strategy**.
- New Bounds = `Union(Current Bounds, Content Bounds)`.
- Zone will expand to fit new content positions but will **never automatically shrink** just because content moved inward.

## Verification
- Drag a note to the edge -> Zone expands.
- Drag that note back to the center -> Zone STAYS expanded (preserving the space).
- To shrink the Zone, user must use the manual resize handles.
