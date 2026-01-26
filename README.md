# Project Nodal: Chat is a Line, Thought is a Network.

> **🎥 [Watch the 15s Demo Video (MP4)](image/demo.mp4)**

**The "Chat Interface" is the biggest lie in modern computing.**

Open ChatGPT, Claude, or Gemini. What do we see?
A linear feed. A text stream. A modernized teletype machine from the 1970s.

They force our brains into a single-threaded, chronological queue.
But **that is not how we think.**

Our minds are graphs. They jump from a coding bug, to a deployment strategy, to a marketing slogan, and back to the bug. It is concurrent, messy, and spatial.
Forcing networked brains into a linear interface is cognitive suffocation.

We built **Project Nodal** to break the timeline.

## 1. Space > Time
In standard AI, "Context" is just the previous 50 messages. If we change the subject, we pollute the context.
In **Project Nodal**, context is **Spatial**.
*   **The Infinite Canvas**: Drag the viewport. Zoom out to see the big picture. Zoom in to focus on a detail.
*   **Zones**: Create a "Zone" for backend logic. Create another for frontend design. Move them apart. Visually group our thoughts.

## 2. Objects > Streams
In Nodal, a conversation isn't a fleeting moment in a scroll; it's a **Persistent Object** (A Sticky Note).
*   **Multi-Threaded**: Have 5 conversations with the AI simultaneously.
*   **Drag & Drop**: Treat thoughts like physical objects. Move them. Resize them. Collapse them when they are "done" but keep them visible.

## 3. Fork Thoughts
This is our "Killer Feature".
In linear chat, if we want to explore a "What If" scenario, we often have to derail the whole conversation.
In **Nodal**, just click **Fork**.
*   **Branching**: Take a specific message, spin it off into a new Note, and explore that path without losing the original context.
*   **Exploration**: Go down the rabbit hole. If it's a dead end, just delete the note. The original conversation remains pure.

## 4. Synapses > Lists 
*   **Connections**: Draw a line from a "Product Idea" note to a "Database Schema" note.
*   Build a **Knowledge Graph**, not a chat history. Make the relationships between our ideas explicit.

## 5. Our Minds are Private
Most "AI Workspaces" are just SaaS traps waiting to lock our data in.
*   **Local-First**: Nodal stores everything in the browser (IndexedDB). We don't have a database. We don't see the notes.
*   **BYO-AI**: Connect an OpenAI Key, or better yet, run **Ollama** locally. Our thoughts never leave our machines.

---

**Project Nodal** is not a "better chatbot".
It is a **Thinking OS**.

Stop scrolling. Start mapping.

---
### ⚠️ A Note on Web Deployment (Vercel/Netlify)
If you are viewing this demo online (HTTPS), you **cannot** connect to a local Ollama instance (HTTP) due to browser security policies (Mixed Content Blocking).

*   **To use Local Ollama**: Please [clone this repo](https://github.com/yibie/project-nodal) and run it locally:
    ```bash
    git clone https://github.com/yibie/project-nodal.git
    cd project-nodal
    npm install
    npm run dev
    ```
*   **To use the Online Demo**: Please use an **OpenAI** or **DeepSeek** API Key in the settings.
