# Changelog & Progress Report

> **Current Version:** 0.3.0 (Phase 3 - Polish & Refinement)
> **Date:** 2025-11-20

This document tracks the development progress of the **Sticky Note ChatBot** against the original [Product Specification](../product_spec.md).

---

## 📊 Progress Overview

| Phase | Description | Status | Completion |
| :--- | :--- | :--- | :--- |
| **Phase 1** | The Foundation (MVP) | ✅ Completed | 100% |
| **Phase 2** | The Brain (AI Integration) | ✅ Completed | 100% |
| **Phase 3** | The Polish (UI/UX & Advanced Features) | 🔄 In Progress | ~85% |

---

## 📝 Detailed Changelog

### [Unreleased] - Phase 3 Refinements (Current Session)

#### ✨ Added / Changed
- **Canvas Interaction Model Redesign:**
    -   Switched from "Infinite Grid" to **"Finite Board in Infinite Space"** model (Figma-style).
    -   **Visuals:** Added a distinct white board with deep shadow (`shadow-[0_0_50px_rgba(0,0,0,0.3)]`) on a neutral gray background (`bg-neutral-300`).
    -   **Constraints:** Restricted drawing and note creation to the board area.
    -   **Drag Logic:** Implemented strict containment for note dragging (notes cannot be dragged outside the board).
- **Background Image Handling:**
    -   **Normalization:** Uploaded images are automatically resized/normalized to a standard width (1600px) to ensure consistent scale with notes.
    -   **Validation:** Added size checks (800px - 5000px) and quality compression (JPEG 0.85).
    -   **Default State:** Added a default 1600x900 dashed boundary for empty workspaces.
- **Markdown Support:**
    -   Replaced `react-markdown` with `marked` + `dompurify` to fix React v19 compatibility crashes.
    -   Restored full Markdown rendering in chat bubbles.
- **Advanced Drawing Tools:**
    -   Added **Color Picker** (Black, Red, Green, Blue).
    -   Added **Eraser Tool** (Proximity-based deletion).

#### 🐛 Fixed
- Fixed application crash caused by `react-markdown` incompatibility.
- Fixed "Fake Boundary" issue where the canvas was visually finite but interactively infinite.
- Fixed Note Dragging issue where notes could be dragged partially out of bounds.

---

## 🔍 Comparison with Product Spec

### ✅ Completed Features
*   **2.0 The Workspace:**
    *   [x] Create/Switch Workspaces.
    *   [x] Local-first storage (IndexedDB/Dexie.js).
*   **2.1 The Canvas:**
    *   [x] Background Image Upload (with normalization).
    *   [x] Native Drawing Tools (Pen, Eraser, Colors).
    *   [x] Navigation (Pan/Zoom with "Space" model).
    *   [x] Creation (Double-click to add note).
    *   [x] Persistence (Auto-save).
*   **2.2 The Sticky Note:**
    *   [x] Collapsed/Expanded states.
    *   [x] Drag & Drop (with physics & constraints).
    *   [x] Context isolation (Independent chat sessions).
*   **2.3 The Chat:**
    *   [x] Standard Chat UI.
    *   [x] AI Integration (Ollama / OpenAI compatible).
    *   [x] Streaming responses.
    *   [x] Markdown rendering.

### 🚧 Remaining / Planned Features (Phase 3)
*   **Advanced Drawing:**
    *   [ ] **Shapes:** Rectangle and Circle tools (specified in 2.1 & 4.1).
*   **Note Intelligence:**
    *   [ ] **Auto-Titling:** Automatically generate note titles based on chat content (implied in "The Polish").
*   **UI Polish:**
    *   [ ] **Glassmorphism:** Further refinement of the UI aesthetic (specified in 3.1).
    *   [ ] **Animations:** Enhance transitions for expand/collapse (specified in 3.1).

---

## 🛠 Technical Debt / Notes
- **React v19:** Currently running on React v19 (RC). Some libraries (`react-markdown`) had issues, resolved by switching to native implementations (`marked`).
- **Performance:** Drawing layer uses SVG. May need to switch to HTML5 Canvas if drawing complexity increases significantly (as noted in Spec 4.3).
