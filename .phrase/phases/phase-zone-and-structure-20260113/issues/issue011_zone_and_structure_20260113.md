# Issue 011: Hit-testing offset (Virtual Position issue)

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: High
- **Related Phase**: phase-zone-and-structure-20260113

## Description
User reported a "virtual position" offset when dragging Notes into Zones. The system seemed to only recognize the Note's geometric center, causing confusion when dragging by corners or edges.

## Impact
- **UX**: Disconnect between user intent (where I'm looking/clicking) and system response (where the center is).

## Changes
- Modified `pickZoneIdForNotePosition` in `Canvas.jsx`.
- Switched algorithm from **Center-Point Check** to **Intersection Area Check**.
- Added a 20% overlap threshold to prevent accidental edge triggers.
- Prioritized deeper zones (nested children) and then largest overlap area.

## Verification
- Drag a note by its top-left corner into a Zone -> Zone should highlight as soon as significant overlap occurs, not waiting for the center.
