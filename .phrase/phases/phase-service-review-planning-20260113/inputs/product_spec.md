# Product Specification: Sticky Note ChatBot

> "Good design is not just what it looks like and feels like. Design is how it works." — *And in our case, it must work simply, privately, and without breaking.*

## 1. Core Philosophy & Vision
**The Concept:** A spatial thinking canvas where conversations with AI are treated as persistent, movable objects (Sticky Notes) rather than ephemeral streams.
**The "Linus" Standard:**
1.  **Privacy First:** "Privacy computing" means the data belongs to the user. No server-side storage of chat history. Everything lives locally or is encrypted.
2.  **No Fluff:** The interface is a canvas. The unit is a note. Interactions are physical (drag, double-click).
3.  **Pragmatism:** We don't build a metaverse. We build a board where you stick thoughts.

## 2. User Stories & Requirements

### 2.0 The Workspace (The "Container")
- **Definition:** The top-level unit of organization. Each **Workspace** contains exactly **one Canvas**.
- **Usage:** Users can create and switch between multiple Workspaces (e.g., "Project Alpha", "Daily Journal", "Learning Rust") to keep contexts separate.

### 2.1 The Canvas (The "Space")
- **Background Customization:**
    -   *Image:* Upload or link an image as the "grounding" context.
    -   *Drawing:* Use **native drawing tools** (pen, marker, basic shapes) to sketch layouts or annotate directly on the background.
- **Navigation:** Infinite or bounded panning to allow spatial organization.
- **Creation:** **Double-click** on empty space creates a new Sticky Note.
- **Persistence:** The state of the canvas (drawings, note positions, background) is saved automatically.

### 2.2 The Sticky Note (The "Atom")
- **States:**
    -   *Collapsed:* Shows a summary/title. Small footprint.
    -   *Expanded:* Shows the full Chat Interface.
- **Interaction:**
    -   **Drag & Drop:** Move notes freely to organize thoughts.
    -   **Double-click:** Toggle between Collapsed and Expanded states.
- **Context:** Each note is an independent conversation session.

### 2.3 The Chat (The "Intelligence")
- **Standard Chat:** Text input, streaming response.
- **Privacy:** All inference requests are routed to a privacy-compliant backend (Local LLM or User-Key API).

## 3. UX/UI Design Specifications

### 3.1 Visual Style
- **Aesthetics:** Premium, clean, "Glassmorphism" elements to sit naturally on top of variable backgrounds.
- **Motion:** Physics-based damping for dragging. Smooth transitions for Expand/Collapse.

### 3.2 Interaction Flow
1.  **User enters:** Selects a Workspace (or loads the last one).
2.  **User thinks:** "I need to sketch a flow."
3.  **Action:** Selects "Pen" tool and draws a rough flowchart on the canvas.
4.  **Action:** Double-clicks inside one of the drawn boxes.
5.  **System:** Spawns a fresh Sticky Note.
6.  **User types:** "What should go in this module?"
7.  **Result:** The AI conversation is physically attached to the user's sketch.

## 4. Technical Architecture (The "Engine")

### 4.1 Data Structure (The "Truth")
We introduce `Workspace` as the root entity.

```typescript
interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  canvas: CanvasState;
}

interface CanvasState {
  backgroundImage: string | null; // URL or Base64
  drawings: DrawingObject[]; // Vector paths or shapes
  notes: Note[];
  viewport: { x: number; y: number; zoom: number };
}

interface DrawingObject {
  id: string;
  type: 'path' | 'rect' | 'circle';
  points?: { x: number; y: number }[]; // For paths
  x?: number; y?: number; width?: number; height?: number; // For shapes
  color: string;
  strokeWidth: number;
}

interface Note {
  id: string; // UUID
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  isExpanded: boolean;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
```

### 4.2 Privacy & Storage Strategy
- **Local-First:** IndexedDB stores the list of `Workspaces`.
- **Zero-Knowledge Server:** No data egress.
- **AI Provider:** Local LLM or User API Key.

### 4.3 Technology Stack
- **Framework:** React (Vite).
- **State/Canvas:**
    -   `react-use-gesture` + `framer-motion` (Interaction).
    -   **SVG** or **HTML5 Canvas** (for the Drawing layer). *Recommendation: SVG for simpler, scalable vector paths if drawing is basic; Canvas if it gets complex.*
- **Styling:** TailwindCSS (v3).
- **Icons:** Lucide React.

## 5. Implementation Phases

### Phase 1: The Foundation (MVP)
- Workspace Management (Create/Switch).
- Canvas rendering with pan/zoom.
- **Drawing Layer** (Basic Pen).
- Create/Delete/Move Notes.

### Phase 2: The Brain
- Integrate Chat UI inside Notes.
- Connect to AI Service.
- Expand/Collapse transitions.

### Phase 3: The Polish
- Advanced Drawing (Shapes, Colors).
- Markdown rendering.
- Local Persistence (IndexedDB).

---
*Signed,*
*Linus (Acting PM)*

