# Issue 017: Drag Hit-Testing Visual Sync

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-22
- **Resolved**: 2026-01-22
- **Priority**: Medium
- **Related Phase**: phase-zone-and-structure-20260113

## Description
User reported that Zone hit-testing (drag enter/leave) felt disconnected from the visual position of the note. The Zone would react based on a position that lagged behind or differed from where the note visually appeared, requiring "extra dragging" to trigger.

## Root Cause
- **Component**: `StickyNote.jsx`
- **Issue**: The drag logic (`useDrag`) initialized its starting coordinate `memo` from `note.position` (React state).
- **Why it failed**: If a spring animation was active (e.g., note settling into place), `note.position` (the target) differed from the actual visual position. Starting a drag used the target position, causing an offset between the mouse/visual note and the logical coordinates sent to the Zone.

## Changes
- Modified `StickyNote.jsx`: Changed `useDrag` initialization to use `ghostPosition` (which tracks visual state) instead of `note.position`.
- No new state introduced; leveraged existing `ghostPosition`.

## Verification
- Drag a note into a Zone.
- Release it, and *immediately* catch it again while it's springing into place.
- Drag slightly. The Zone highlight should track the note's visual edge perfectly, with no offset.
