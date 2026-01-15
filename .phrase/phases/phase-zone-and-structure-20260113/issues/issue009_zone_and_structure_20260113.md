# Issue 009: Improve Zone visual affordance and drop feedback

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: Medium
- **Related Phase**: phase-zone-and-structure-20260113

## Description
User feedback indicates that the "dashed border" style for Zones feels temporary and lacks physical presence. Additionally, the feedback when dragging a Note into a Zone is unclear, leaving users uncertain if the Note will be attached.

## Impact
- **UX**: High cognitive load for users checking if a note is "inside".
- **Aesthetics**: Dashed lines look like "edit mode" artifacts rather than persistent UI elements.

## Proposed Solution (UI Expert)
- **Visuals**: Change Zone style to a rounded card with a subtle solid background (`bg-neutral-100/40`) and backdrop blur.
- **Feedback**: When a Note is dragged over a Zone (valid drop target), the Zone should highlight significantly (darker background + stronger border + ring).

## Changes
- Modified `Canvas.jsx` styling logic for Zones.
- Replaced `border-dashed` with `border-solid`.
- Added `backdrop-blur-sm`.
- Enhanced `isHover` styles.

## Verification
- Drag a note over a zone -> Zone should light up clearly.
- Zone should look like a frosted glass pane or a physical "mat" on the canvas.
