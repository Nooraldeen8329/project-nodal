# Issue 015: Ghost Offset due to implicit static positioning

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: Critical
- **Related Phase**: phase-zone-and-structure-20260113

## Description
User persistently reported a "Ghost Position" or "Virtual Offset" where the Note's interactive area seemed misaligned with its visual position. 
Upon deep inspection, it was found that `StickyNote` used `absolute` positioning without explicit `left: 0; top: 0;`.
In the DOM, even empty text nodes (newlines in JSX) can displace the static position of an absolute element if the parent is a block container.
`framer-motion`'s `transform: translate(x, y)` applies *on top of* this implicit static offset, creating a discrepancy between the Logical Coordinate `(x, y)` (used by Zone Hit-Testing) and the Visual Coordinate `(staticOffset + x, staticOffset + y)`.

## Impact
- **UX**: Dragging feels "off". Hit-testing triggers early or late.
- **Visuals**: Notes may jump slightly when mounting/unmounting.

## Changes
- Modified `StickyNote.jsx` to explicitly include `left-0 top-0` in its class list.
- This forces the element's origin to be exactly `(0, 0)` of the parent `Canvas` world container, aligning the visual coordinate system perfectly with the logical one.

## Verification
- Drag a note. The Zone feedback should now align *pixel-perfectly* with the visual overlap of the Note card.
