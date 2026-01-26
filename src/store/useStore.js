import { create } from 'zustand';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { pickZoneIdForNotePosition } from '../utils/zoneUtils';

const createDefaultCanvas = () => ({
    schemaVersion: 1,
    backgroundImage: null,
    backgroundTransform: { x: 0, y: 0, scale: 1 },
    sceneGraph: { version: 1, nodes: [] },
    notes: [],
    connections: [], // { id, fromId, toId, type? }
    zones: [],
    viewport: { x: 0, y: 0, zoom: 1 }
});

const normalizeCanvas = (canvas) => {
    const raw = canvas && typeof canvas === 'object' ? canvas : {};
    const { drawings: _drawings, excalidrawElements: _excalidrawElements, ...input } = raw;

    const validNotes = Array.isArray(input.notes)
        ? input.notes.map(n => (n && typeof n === 'object' ? { zoneId: null, ...n } : n))
        : [];
    const validNoteIds = new Set(validNotes.map(n => n.id));

    const normalized = {
        ...createDefaultCanvas(),
        ...input,
        schemaVersion: typeof input.schemaVersion === 'number' ? input.schemaVersion : 1,
        backgroundTransform: input.backgroundTransform || { x: 0, y: 0, scale: 1 },
        sceneGraph:
            input.sceneGraph && typeof input.sceneGraph === 'object'
                ? {
                    version: typeof input.sceneGraph.version === 'number' ? input.sceneGraph.version : 1,
                    nodes: Array.isArray(input.sceneGraph.nodes) ? input.sceneGraph.nodes : []
                }
                : { version: 1, nodes: [] },
        notes: validNotes,
        connections: Array.isArray(input.connections)
            ? input.connections.filter(c => c && c.fromId && c.toId && validNoteIds.has(c.fromId) && validNoteIds.has(c.toId))
            : [],
        zones: Array.isArray(input.zones) ? input.zones.map(z => ({
            ...z,
            title: z.title || '',
            manualBounds: z.manualBounds || z.bounds
        })) : [], viewport: input.viewport || { x: 0, y: 0, zoom: 1 }
    };

    const changed =
        !canvas ||
        typeof canvas !== 'object' ||
        typeof input.schemaVersion !== 'number' ||
        !Array.isArray(input.zones) ||
        !Array.isArray(input.notes) ||
        'drawings' in raw ||
        !input.sceneGraph ||
        typeof input.sceneGraph !== 'object' ||
        !Array.isArray(input.sceneGraph.nodes) ||
        !Array.isArray(input.connections) ||
        (Array.isArray(input.connections) && input.connections.length !== normalized.connections.length) ||
        'excalidrawElements' in raw ||
        !input.viewport ||
        (Array.isArray(input.notes) &&
            input.notes.some(n => n && typeof n === 'object' && !('zoneId' in n)));

    return { normalized, changed };
};

const normalizeWorkspace = (ws) => {
    const input = ws && typeof ws === 'object' ? ws : {};
    const { normalized: canvas, changed: canvasChanged } = normalizeCanvas(input.canvas);

    const normalized = { ...input, canvas };
    return { normalized, changed: canvasChanged || !('canvas' in input) };
};

export const useStore = create((set, get) => ({
    workspaces: [],
    currentWorkspaceId: null,
    isLoading: true,

    // Initialize store from DB
    init: async () => {
        const rawWorkspaces = await db.workspaces.toArray();
        const normalizedWorkspaces = [];
        const updates = [];

        for (const ws of rawWorkspaces) {
            const { normalized, changed } = normalizeWorkspace(ws);
            normalizedWorkspaces.push(normalized);
            if (changed && normalized.id) {
                updates.push({ id: normalized.id, canvas: normalized.canvas });
            }
        }

        if (updates.length > 0) {
            await Promise.all(updates.map(u => db.workspaces.update(u.id, { canvas: u.canvas })));
        }

        const workspaces = normalizedWorkspaces;
        if (workspaces.length === 0) {
            // Create default workspace if none exist
            const defaultWs = {
                id: uuidv4(),
                name: 'My First Workspace',
                createdAt: Date.now(),
                canvas: createDefaultCanvas()
            };
            await db.workspaces.add(defaultWs);
            set({ workspaces: [defaultWs], currentWorkspaceId: defaultWs.id, isLoading: false });
        } else {
            // Load the most recently created or first one
            // Ideally we should store 'lastOpenedWorkspaceId' in localStorage
            const lastId = localStorage.getItem('lastWorkspaceId');
            const targetId = lastId && workspaces.find(w => w.id === lastId) ? lastId : workspaces[0].id;
            set({ workspaces, currentWorkspaceId: targetId, isLoading: false });
        }
        get().loadSettings();
    },

    // Workspace Actions
    addWorkspace: async (name) => {
        const newWs = {
            id: uuidv4(),
            name: name || 'Untitled Workspace',
            createdAt: Date.now(),
            canvas: createDefaultCanvas()
        };
        await db.workspaces.add(newWs);
        set(state => ({ workspaces: [...state.workspaces, newWs], currentWorkspaceId: newWs.id }));
        localStorage.setItem('lastWorkspaceId', newWs.id);
    },

    switchWorkspace: (id) => {
        set({ currentWorkspaceId: id });
        localStorage.setItem('lastWorkspaceId', id);
    },

    deleteWorkspace: async (id) => {
        await db.workspaces.delete(id);
        set(state => {
            const remaining = state.workspaces.filter(w => w.id !== id);
            let nextId = state.currentWorkspaceId;
            if (state.currentWorkspaceId === id) {
                nextId = remaining.length > 0 ? remaining[0].id : null;
                // If no workspaces left, we might want to create a default one or handle empty state
                // For now, let's ensure there's always at least one by creating a new one if empty
            }
            return { workspaces: remaining, currentWorkspaceId: nextId };
        });

        // If we deleted the last one, re-init or create default
        const state = get();
        if (state.workspaces.length === 0) {
            await state.addWorkspace('New Workspace');
        }
    },

    updateWorkspaceName: async (id, name) => {
        await db.workspaces.update(id, { name });
        set(state => ({
            workspaces: state.workspaces.map(w => w.id === id ? { ...w, name } : w)
        }));
    },


    // Connection Actions
    addConnection: (workspaceId, fromId, toId) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        // Prevent duplicates
        if (ws.canvas.connections && ws.canvas.connections.some(c =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId) // Optional: Undirected graph? Let's assume directed for now, or undirected checking both. Let's stick to unique link between two.
        )) {
            return;
        }

        const newConnection = {
            id: uuidv4(),
            fromId,
            toId,
            createdAt: Date.now()
        };

        const newConnections = [...(ws.canvas.connections || []), newConnection];
        get().updateCanvas(workspaceId, { connections: newConnections });
    },

    deleteConnection: (workspaceId, connectionId) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const newConnections = (ws.canvas.connections || []).filter(c => c.id !== connectionId);
        get().updateCanvas(workspaceId, { connections: newConnections });
    },

    // Explicitly expose a method to clean connections for a deleted note
    // Note: The caller (component) handles the UI note deletion, but the store needs to handle the data consistency.
    // However, currently `deleteNote` only exists inside the Canvas component as a local helper or passed via specific logic.
    // Wait, looking at Canvas.jsx line 354: `deleteNote` updates local state.
    // But `useStore` doesn't have a `deleteNote` action directly exposed for *logic*, it just has `updateCanvas`.
    // We should probably help the component by providing a utility or just let the component handle it.
    // "Simple approach": The component handles the array filtering.
    // BUT, we need to expose a way for the component to easily know it needs to delete connections.
    // Actually, `updateCanvas` is what persists data.
    // So I will just add these helpers here so the component can call them.


    // Canvas Actions
    updateCanvas: async (workspaceId, patch) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        // Merge patch deeply if needed, but for now shallow merge of canvas props is fine
        // (arrays like notes/zones are replaced by the component)
        const updatedCanvas = { ...ws.canvas, ...patch };
        const updatedWs = { ...ws, canvas: updatedCanvas };

        // Optimistic update
        set(state => ({
            workspaces: state.workspaces.map(w => w.id === workspaceId ? updatedWs : w)
        }));

        // Persist to DB (Debounce could be added here if performance is an issue)
        // We update the whole workspace record because 'canvas' is a property of it
        await db.workspaces.update(workspaceId, { canvas: updatedCanvas });
    },

    // Note Actions
    addNote: (workspaceId, note) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const newNotes = [...(ws.canvas.notes || []), note];
        get().updateCanvas(workspaceId, { notes: newNotes });
    },

    updateNote: (workspaceId, noteId, patch) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const notes = ws.canvas.notes || [];
        const zones = ws.canvas.zones || [];

        const newNotes = notes.map(n => {
            if (n.id !== noteId) return n;
            const updated = { ...n, ...patch };
            if (patch.position) {
                const zoneId = pickZoneIdForNotePosition(zones, patch.position);
                if (updated.zoneId !== zoneId) updated.zoneId = zoneId;
            }
            return updated;
        });
        get().updateCanvas(workspaceId, { notes: newNotes });
    },

    deleteNote: (workspaceId, noteId) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        // Filter out note
        const newNotes = (ws.canvas.notes || []).filter(n => n.id !== noteId);

        // Filter out connections attached to this note
        const newConnections = (ws.canvas.connections || []).filter(c => c.fromId !== noteId && c.toId !== noteId);

        get().updateCanvas(workspaceId, { notes: newNotes, connections: newConnections });
    },

    // Zone Actions
    addZone: (workspaceId, zone) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const newZones = [...(ws.canvas.zones || []), zone];
        get().updateCanvas(workspaceId, { zones: newZones });
    },

    updateZone: (workspaceId, zoneId, patch) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const newZones = (ws.canvas.zones || []).map(z => z.id === zoneId ? { ...z, ...patch } : z);
        get().updateCanvas(workspaceId, { zones: newZones });
    },

    deleteZone: (workspaceId, zoneId) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const zones = ws.canvas.zones || [];
        const notes = ws.canvas.notes || [];

        // Helper to get zone and all its children
        const getZoneSubtreeIds = (rootId) => {
            const result = [rootId];
            for (let i = 0; i < result.length; i += 1) {
                const parentId = result[i];
                for (const z of zones) {
                    if (z.parentZoneId === parentId) result.push(z.id);
                }
            }
            return result;
        };

        const zoneIdsToDelete = getZoneSubtreeIds(zoneId);
        const newZones = zones.filter(z => !zoneIdsToDelete.includes(z.id));

        // Detach notes from deleted zones
        const newNotes = notes.map(n =>
            zoneIdsToDelete.includes(n.zoneId) ? { ...n, zoneId: null } : n
        );

        get().updateCanvas(workspaceId, { zones: newZones, notes: newNotes });
    },



    moveZone: (workspaceId, zoneIds, delta) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const zones = ws.canvas.zones || [];
        const notes = ws.canvas.notes || [];
        const { dx, dy } = delta;

        // Zones to identify base positions? 
        // Actually, we usually apply delta to current state. 
        // But for robust gesture handling, we might want atomic updates or just delta.
        // The hook calculates new position based on 'base' captured at start.
        // But wait, Actions generally work on current state.
        // If we pass delta, we add to current. 
        // For drag, it's better to pass *new positions* or imply delta applies to current state.
        // Let's stick to updateZone (singular) or bulk update.
        // Actually, moveZone is a bulk operation on a zone tree.
        // But doing the tree traversal inside Action on every drag frame (16ms) might be costly if tree is huge.
        // However, for typical size, it's fine.

        // BETTER APPROACH for Action: `updateZones(patches)` where patches is [{id, patch}]
        // The hook can calculate the new positions for all affected zones/notes and send a bulk update.
        // This keeps the "geometry calculation" (what moves with what) in the Hook (or Helper), 
        // and the Store just accepts the new state.

        // WAIT. Linus principle: "Logic in Store".
        // Who decides *what* moves? The "Zone Move" rule (children move with parent).
        // That IS business logic.
        // So the Action should take `zoneId` and `delta`, and the Store decides what else moves.

        const getZoneSubtreeIds = (rootIds) => {
            const result = [...rootIds];
            for (let i = 0; i < result.length; i++) {
                const parentId = result[i];
                for (const z of zones) {
                    if (z.parentZoneId === parentId && !result.includes(z.id)) result.push(z.id);
                }
            }
            return result;
        };

        const targetIds = Array.isArray(zoneIds) ? zoneIds : [zoneIds];
        const allMovingZoneIds = getZoneSubtreeIds(targetIds);

        const newZones = zones.map(z =>
            allMovingZoneIds.includes(z.id)
                ? { ...z, bounds: { ...z.bounds, x: z.bounds.x + dx, y: z.bounds.y + dy }, manualBounds: { ...z.manualBounds, x: z.manualBounds.x + dx, y: z.manualBounds.y + dy } }
                : z
        );

        const newNotes = notes.map(n =>
            allMovingZoneIds.includes(n.zoneId)
                ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
                : n
        );

        get().updateCanvas(workspaceId, { zones: newZones, notes: newNotes });
    },

    resizeZone: (workspaceId, zoneId, newBounds) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        const zones = ws.canvas.zones || [];
        const notes = ws.canvas.notes || [];

        // 1. Update Zone Bounds
        const newZones = zones.map(z => z.id === zoneId ? { ...z, bounds: newBounds, manualBounds: newBounds } : z);

        // 2. Clamp Notes
        // Import constants if we can, or hardcode. Ideally pass constraints or utils.
        const CARD_W = 200; // Copying for now to avoid circular dependency issues or pass as arg
        const CARD_H = 100; // Logic duplication - implies "Good Taste" requires extracting config.
        const ZONE_PADDING = 20;

        const inner = {
            x: newBounds.x + ZONE_PADDING,
            y: newBounds.y + ZONE_PADDING,
            w: newBounds.width - ZONE_PADDING * 2,
            h: newBounds.height - ZONE_PADDING * 2
        };

        const newNotes = notes.map(n => {
            if (n.zoneId !== zoneId) return n;
            const px = Math.max(inner.x, Math.min(n.position.x, inner.x + inner.w - CARD_W));
            const py = Math.max(inner.y, Math.min(n.position.y, inner.y + inner.h - CARD_H));
            return (px === n.position.x && py === n.position.y) ? n : { ...n, position: { x: px, y: py } };
        });

        get().updateCanvas(workspaceId, { zones: newZones, notes: newNotes });
    },



    updateViewport: (workspaceId, patch) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;
        get().updateCanvas(workspaceId, { viewport: { ...ws.canvas.viewport, ...patch } });
    },

    updateBackgroundTransform: (workspaceId, patch) => {
        const state = get();
        const ws = state.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;
        get().updateCanvas(workspaceId, { backgroundTransform: { ...ws.canvas.backgroundTransform, ...patch } });
    },

    // Settings Actions
    settings: {
        provider: 'ollama',
        apiKey: '',
        model: 'llama3',
        baseUrl: 'http://localhost:11434'
    },

    updateSettings: (patch) => {
        set(state => {
            const newSettings = { ...state.settings, ...patch };
            localStorage.setItem('appSettings', JSON.stringify(newSettings));
            return { settings: newSettings };
        });
    },

    loadSettings: () => {
        try {
            const saved = localStorage.getItem('appSettings');
            if (saved) {
                set({ settings: JSON.parse(saved) });
            }
        } catch (e) {
            console.warn('Failed to load settings', e);
        }
    }
}));
