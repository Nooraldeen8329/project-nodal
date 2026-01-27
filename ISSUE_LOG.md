# Issue Log

## [Fixed] Blank Page Crash on Startup (Smart View Integration)
**Date:** 2026-01-27
**Severity:** Critical (App failed to mount)

### 🐛 Symptoms
- Browser showed a completely blank white page.
- Console error: `An error occurred in the <WorkspaceLayout> component`.
- Root element `#root` was empty.

### 🕵️ Root Cause Analysis
Two distinct errors contributed to the failure:

1.  **Missing Import (ReferenceError)**:
    - In `WorkspaceLayout.jsx`, the component tried to render `<Sparkles />` icon.
    - However, `Sparkles` was added to the usage but **omitted** from the `import { ... } from 'lucide-react'` statement.
    - This caused a runtime crash during the module evaluation/rendering of the Layout.

2.  **Incorrect Store Access (TypeError)**:
    - In `SmartViewLayer.jsx`, the code attempted: `const { notes } = useStore()`.
    - **Reality**: In our Zustand store, `notes` is NOT a root property. It nests inside `workspaces`.
    - Correct path: `useStore().workspaces.find(id).canvas.notes`.
    - This would have caused a crash immediately upon opening the view (or rendering it if not conditionally guarded).

### 🛠️ Fix
1.  **Added Import**: Included `Sparkles` in the named imports from `lucide-react`.
2.  **Corrected Data Access**: Updated `SmartViewLayer` to find the `currentWorkspace` first, then access `canvas.notes`.

### 🎓 Lessons Learned (Linus Philosophy)
- **"Don't guess API."** Always check `useStore` definition before destructuring properties.
- **Fail Fast**: The blank page is the ultimate "Fail Fast". It forced us to look at the console immediately.

## [Fixed] White Screen Crash (Refactor Regression)
**Date:** 2026-01-27
**Severity:** Critical

### 🐛 Symptoms
- Application went Blank (White Screen) during interactions.
- Console error: `ReferenceError: resizeZone is not defined`.

### 🕵️ Root Cause Analysis
- During the refactor of `Canvas.jsx` to adopt Global Store variables (`expandedNoteId`, etc.), I updated the destructuring list of `useStore()`.
- In the process, `resizeZone` was accidentally removed from the list.
- A downstream hook (`useCanvasGestures`) continued to request `resizeZone` as an argument, causing a crash when `Canvas` tried to render and pass this now-undefined variable.

### 🛠️ Fix
- Added `resizeZone` back to the `useStore()` destructuring in `Canvas.jsx`.

### 🎓 Lessons Learned
- **Destructuring Riskin**: When modifying a long list of destructured variables, it's easy to accidentally delete a neighbor.
- **Linter would have caught this**: A static analysis tool would likely have flagged "resizeZone is undefined".

