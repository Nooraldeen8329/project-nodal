# Issue 010: Zone adaptive sizing (Bounding Box based)

## Metadata
- **Status**: Resolved
- **Created**: 2026-01-15
- **Resolved**: 2026-01-15
- **Priority**: High
- **Related Phase**: phase-zone-and-structure-20260113

## Description
Zones should automatically adjust their size to contain all assigned Notes and sub-zones. The previous grid-count-based approach was too rigid and didn't account for specific placements.

## Impact
- **UX**: Zones now "hug" their content tightly.
- **Logic**: Sizing is now based on the actual Bounding Box of contents plus padding.

## Changes
- Refactored `autoGrowZonesToFitNotes` to use Bounding Box calculation.
- Added support for recursive sizing (parent zones grow to fit children zones).
- Sizing settlement occurs on Drop (last state of drag) to avoid "catch-me-if-you-can" jitter.

## Verification
- Drag a note to the edge of a Zone and drop -> Zone should expand to cover it.
- Drag a note out of a Zone and drop -> Zone should shrink to fit remaining content.
- Resize a sub-zone -> Parent zone should adapt its size.
