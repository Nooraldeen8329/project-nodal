import { create } from 'zustand';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

const createDefaultCanvas = () => ({
    schemaVersion: 1,
    backgroundImage: null,
    backgroundTransform: { x: 0, y: 0, scale: 1 },
    sceneGraph: { version: 1, nodes: [] },
    notes: [],
    zones: [],
    viewport: { x: 0, y: 0, zoom: 1 }
});

const normalizeCanvas = (canvas) => {
    const raw = canvas && typeof canvas === 'object' ? canvas : {};
    const { drawings: _drawings, excalidrawElements: _excalidrawElements, ...input } = raw;

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
        notes: Array.isArray(input.notes)
            ? input.notes.map(n => (n && typeof n === 'object' ? { zoneId: null, ...n } : n))
            : [],
                                    zones: Array.isArray(input.zones) ? input.zones.map(z => ({
                                        ...z,
                                        manualBounds: z.manualBounds || z.bounds
                                    })) : [],        viewport: input.viewport || { x: 0, y: 0, zoom: 1 }
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
