# Issue 012: Zone only expands right/down (Need 4-way expansion)

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: Medium
- **Related Phase**: phase-zone-and-structure-20260113

## Description
Currently, Zones only expand their Width (right) and Height (bottom) to fit content. If a user drags a note to the left or top of a Zone (but still within it), the note effectively "leaves" the visual boundaries of the Zone, even if logically attached.

## Impact
- **Visuals**: Broken visual metaphor. Zone looks like a "drawer" instead of a "bubble".
- **Logic**: Inconsistent with the new Bounding Box philosophy.

## Changes
- Modified `autoGrowZonesToFitNotes` to calculate the full `minX, minY, maxX, maxY` of all content.
- Zone's `x` and `y` now dynamically update to wrap content that extends to the left or top.
- Ensured minimum size constraints are respected by expanding Right/Down if content is too small (keeping Top-Left stable for small content).

## Verification
- Drag a note to the LEFT of the Zone's current edge -> Zone should shift its X and expand to cover it.
- Drag a note ABOVE the Zone -> Zone should shift its Y and expand.
- Clear all notes -> Zone should remain visible (fallback logic handled).
