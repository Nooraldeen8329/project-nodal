# Issue 016: Visual Latency (Spring Animation during Drag)

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: High
- **Related Phase**: phase-zone-and-structure-20260113

## Description
User reported a "Ghost Effect" where the Zone seemed to react to the Note's position *before* the Note visually arrived there.
Investigation revealed that `framer-motion`'s spring animation was active even during dragging.
While the Logical Coordinate (sent to Zone for hit-testing) updated instantly with the mouse, the Visual Coordinate (rendered Note) lagged behind due to the spring physics.
This caused a disconnect: The "Ghost" (Logical Position) was ahead of the "Body" (Visual Position).

## Impact
- **UX**: Dragging felt "mushy" or disconnected. Zone feedback felt premature.

## Changes
- Modified `StickyNote.jsx`: `transition={isDragging ? { duration: 0 } : { type: 'spring', ... }}`.
- This ensures 1:1 instantaneous tracking during drag (Direct Manipulation), while preserving the nice spring physics for release/animations.

## Verification
- Drag a note quickly. The cursor should remain glued to the exact same pixel on the note throughout the drag.
- Zone feedback should align perfectly with the visual edge of the note.
