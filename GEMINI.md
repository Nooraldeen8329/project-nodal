# Sticky Note ChatBot

## Project Overview

**Sticky Note ChatBot** is a "spatial thinking canvas" where AI conversations are treated as persistent, movable objects (Sticky Notes) rather than a linear stream. The project prioritizes privacy (local-first storage), simplicity, and a fluid user experience.

**Key Features:**
*   **Workspaces:** Multiple independent canvases for different contexts.
*   **Spatial Canvas:** Infinite panning/zooming canvas to organize notes.
*   **Sticky Notes:** Independent chat sessions that can be dragged, collapsed, and expanded.
*   **AI Integration:** Supports local LLMs (via Ollama) and cloud providers (OpenAI).
*   **Privacy:** Data is stored locally using IndexedDB (Dexie.js). No server-side storage of chat history.

## Tech Stack

*   **Frontend Framework:** React 19 + Vite
*   **Styling:** TailwindCSS v4
*   **State Management:** Zustand
*   **Persistence:** Dexie.js (IndexedDB wrapper)
*   **Animations:** Framer Motion
*   **Gestures:** @use-gesture/react
*   **Icons:** Lucide React
*   **Markdown:** react-markdown, remark-gfm, marked

## Building and Running

### Prerequisites
*   Node.js (latest stable version recommended)
*   npm

### Commands

*   **Start Development Server:**
    ```bash
    npm run dev
    ```
    Runs the app at `http://localhost:5173`.

*   **Build for Production:**
    ```bash
    npm run build
    ```

*   **Linting:**
    ```bash
    npm run lint
    ```

*   **Preview Build:**
    ```bash
    npm run preview
    ```

## Architecture & Key Components

### File Structure
*   `src/store/useStore.js`: Central Zustand store. Manages `Workspaces`, `Canvas` state, and `Notes`. Handles interaction with IndexedDB.
*   `src/services/ai_provider.js`: Handles AI API calls (Ollama/OpenAI) with streaming support.
*   `src/db.js`: Dexie.js database schema and configuration.
*   `src/components/`:
    *   `Canvas.jsx`: The main workspace area. Handles pan/zoom and background interaction.
    *   `StickyNote.jsx`: The core interactive unit. Handles chat UI, drag logic, and expand/collapse states.
    *   `SettingsModal.jsx`: Configuration for AI providers.
    *   `WorkspaceLayout.jsx`: Main application layout wrapper.

### Data Model
*   **Workspace:** The root entity. Contains one Canvas.
*   **Canvas:** Holds the state of the background, drawings (planned), and list of Notes.
*   **Note:** Represents a single chat session. Contains position, dimensions, state (expanded/collapsed), and messages.

## Development Conventions

*   **Local-First:** All state changes should be reflected in the UI immediately (optimistic updates) and persisted to IndexedDB.
*   **Styling:** Use TailwindCSS utility classes.
*   **Components:** Functional components with Hooks.
*   **AI Handling:** AI logic is abstracted in `ai_provider.js`. Use the `createAIProvider` factory.
*   **State:** Complex global state lives in Zustand (`useStore`). Local component state (like UI toggles) stays local.
