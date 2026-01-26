import { v4 as uuidv4 } from 'uuid';

const NOTE_1_ID = uuidv4();
const NOTE_2_ID = uuidv4();
const NOTE_3_ID = uuidv4();
const ZONE_1_ID = uuidv4();

export const DEMO_WORKSPACE = {
    id: uuidv4(),
    name: '👋 Welcome to Nodal',
    createdAt: Date.now(),
    canvas: {
        schemaVersion: 1,
        viewport: { x: 0, y: 0, zoom: 1 },
        backgroundTransform: { x: 0, y: 0, scale: 1 },
        backgroundImage: null,
        sceneGraph: { version: 1, nodes: [] },
        notes: [
            {
                id: NOTE_1_ID,
                title: 'Start Here',
                messages: [
                    { role: 'user', content: 'What is Project Nodal?', timestamp: Date.now() - 10000 },
                    { role: 'assistant', content: 'Welcome to your **Thinking OS**.\n\nNodal is an infinite canvas where you can map your thoughts spatially.\n\n*   **Drag** notes to organize them.\n*   **Connect** them to build relationships.\n*   **Fork** threads to explore ideas without losing context.', timestamp: Date.now() - 9000 }
                ],
                position: { x: 100, y: 100 },
                width: 300,
                height: 380,
                zoneId: null,
                color: '#fef3c7',
                createdAt: Date.now()
            },
            {
                id: NOTE_2_ID,
                title: 'Why Spatial?',
                messages: [
                    { role: 'assistant', content: 'Traditional chat interfaces force you into a linear timeline. \n\nBut real thinking is **networked**. \n\nThis canvas lets you see the "big picture" while focusing on the details.', timestamp: Date.now() - 8000 }
                ],
                position: { x: 500, y: 100 },
                width: 280,
                height: 250,
                zoneId: null,
                color: '#e0f2fe',
                createdAt: Date.now()
            },
            {
                id: NOTE_3_ID,
                title: 'Try Zoning',
                messages: [
                    { role: 'user', content: 'How do I organize complex projects?', timestamp: Date.now() - 7000 },
                    { role: 'assistant', content: 'Use **Zones** to group related notes. \n\nTry dragging this note out of the zone!', timestamp: Date.now() - 6000 }
                ],
                position: { x: 140, y: 560 }, // Relative to simplified zone placement or global
                width: 280,
                height: 200,
                zoneId: ZONE_1_ID,
                color: '#dcfce7',
                createdAt: Date.now()
            }
        ],
        zones: [
            {
                id: ZONE_1_ID,
                title: 'Example Zone: Project Planning',
                bounds: { x: 100, y: 500, width: 400, height: 300 },
                manualBounds: { x: 100, y: 500, width: 400, height: 300 },
                createdAt: Date.now()
            }
        ],
        connections: [
            {
                id: uuidv4(),
                fromId: NOTE_1_ID,
                toId: NOTE_2_ID,
                createdAt: Date.now()
            }
        ]
    }
};
