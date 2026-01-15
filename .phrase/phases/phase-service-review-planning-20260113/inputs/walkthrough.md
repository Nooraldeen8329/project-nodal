# Sticky Note ChatBot - Phase 2 Walkthrough

## Overview
Phase 2 "The Brain" is complete! The app now supports real AI integration with **Ollama (Local)** and **OpenAI (Cloud)**, along with Markdown rendering for rich text responses.

## New Features to Test

### 1. AI Settings
- **Open Settings:** Click the **Settings Icon** (gear) in the sidebar header (next to "Workspaces").
- **Configure Provider:**
    - **Ollama (Default):** Ensure [Ollama](https://ollama.com/) is running locally (`ollama serve`). Default model is `llama3`. You can change the model### Interaction Refinements
- **Modal Expansion (Google Keep Style):**
    - Clicking a note header now opens it in a **fixed, centered modal overlay**.
    - The modal is independent of canvas zoom/pan, providing a focused editing experience.
    - **Expand:** Click the header OR **double-click the note body** to expand.
    - **Collapse:** Click the backdrop, the close button, or **double-click the header** to collapse.
    - **Animation:** Smooth fade-in and fade-out (exit) animations for the modal and backdrop.
    - **Backdrop:** A dark, blurred backdrop (`bg-black/60 backdrop-blur-md`) focuses attention on the note.
- **Background Selection:** Hold `Ctrl` (or `Meta` on Mac) and click the background image to select it for dragging/resizing.
- **Click-Outside:** Clicking the canvas (without Ctrl) deselects the background.

#### Bug Fixes & Stability
- **Fixed Note Jumping**: Removed `layoutId` and set `initial={false}` to strictly control animation via `animate` prop, eliminating unwanted layout transitions from top-left.
- **Fixed Double-Click Misfire**: Added strict target checking and `modalJustClosed` state to prevent creating new notes when double-clicking existing ones or immediately after closing a modal.
- **Fixed Modal Backdrop Visibility**: Implemented React Portal to render the modal and backdrop at the document root, ensuring correct stacking context. Used inline styles for the backdrop to guarantee visibility and blur effects.
- **Reliable Backdrop Click**: Moved backdrop rendering to `document.body` via Portal and added `stopPropagation` to ensure it is correctly rendered and clickable for collapsing notes without triggering canvas events.

### ✅ Interaction Verification
- **Create Note:** Double-click the canvas to create a note.
- **Expand:** Double-click the note header.
- **Chat:** Type a message.
    - If using **Ollama**: Ensure you have pulled the model (e.g., `ollama pull llama3`).
    - If using **OpenAI**: Ensure your key is valid.

### 2. Real AI Chat
- **Create Note:** Double-click the canvas to create a note.
- **Expand:** Double-click the note header.
- **Chat:** Type a message.
    - If using **Ollama**: Ensure you have pulled the model (e.g., `ollama pull llama3`).
    - If using **OpenAI**: Ensure your key is valid.
- **Streaming:** You should see the response streaming in real-time.

### 3. Markdown Rendering
- **Test Code:** Ask the AI to "write a Python function to calculate Fibonacci".
- **Verify:** The response should be formatted with syntax highlighting and proper code blocks.

## Troubleshooting
- **Ollama Connection Error:** Ensure Ollama is running and allowed to accept connections (default `localhost:11434`). If you are in a container or VM, you might need to configure `OLLAMA_HOST`.
- **OpenAI Error:** Check your API key and credit balance.

