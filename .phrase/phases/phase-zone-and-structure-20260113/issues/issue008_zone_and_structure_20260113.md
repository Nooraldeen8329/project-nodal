# Issue 008: Zone renders as independent borders instead of a region

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: High
- **Related Phase**: phase-zone-and-structure-20260113

## Description
The current implementation of `Zone` in `Canvas.jsx` renders 4 separate `div` elements to represent the top, bottom, left, and right borders. This results in a poor user experience where the user must precisely click on the 1px-wide border to select or move the zone. The "Zone" concept implies a spatial region, but the implementation treats it as a hollow frame.

## Impact
- **Usability**: Extremely difficult to select or drag zones.
- **Code Quality**: "Bad Taste" - violates the concept of a cohesive object. Increases DOM complexity unnecessarily.

## Proposed Solution (Linus Style)
- **Refactor**: Replace the 4 border `div`s with a single `div` container positioned by `bounds`.
- **Styling**: Apply `border` to this container. Add a subtle transparent background (e.g., `bg-white/5`) to verify hit-testing on the body.
- **Interaction**: Ensure clicking anywhere inside the zone selects/moves it, unless interacting with a child Note.

## Verification
- Click anywhere inside a Zone to select it.
- Drag from the center of a Zone to move it.
- Ensure Notes inside the Zone are still clickable/draggable.