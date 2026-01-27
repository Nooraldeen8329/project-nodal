// Utilities for "Smart View" Clustering
// Uses Hybrid Graph-Vector Algorithm
// Linus Philosophy: "Good Taste" means handling special cases (Zones/Connections) naturally.

/**
 * Calculates Cosine Similarity between two vectors
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Similarity score (-1 to 1)
 */
export const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Union-Find (Disjoint Set) Helper
 */
class UnionFind {
    constructor(elements) {
        this.parent = {};
        elements.forEach(e => this.parent[e] = e);
    }

    find(i) {
        if (this.parent[i] === i) return i;
        return this.parent[i] = this.find(this.parent[i]); // Path compression
    }

    union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) {
            this.parent[rootI] = rootJ;
        }
    }
}

/**
 * Hybrid Clustering:
 * 1. Hard Links (Zones & Connections) -> Union-Find
 * 2. Soft Links (Embeddings) -> Attach orphans to similar clusters
 */
export const generateSmartView = async (notes, getEmbeddingsFn, zones = [], connections = []) => {
    if (!notes || notes.length === 0) return { zones: [], layout: {} };

    console.log(`Hybrid Clustering: ${notes.length} notes, ${zones.length} zones, ${connections.length} connections`);

    const noteIds = notes.map(n => n.id);
    const uf = new UnionFind(noteIds);

    // 1. Apply Hard Constraints (Graph Topology)

    // Union notes in the same Zone
    notes.forEach(note => {
        if (note.zoneId) {
            // Union with any other note in the same zone
            const sibling = notes.find(n => n.id !== note.id && n.zoneId === note.zoneId);
            if (sibling) {
                uf.union(note.id, sibling.id);
            }
        }
    });

    // Union connected notes
    connections.forEach(conn => {
        if (noteIds.includes(conn.fromId) && noteIds.includes(conn.toId)) {
            uf.union(conn.fromId, conn.toId);
        }
    });

    // 2. Fetch Embeddings (for Soft Links)
    const notesWithContent = notes.map(n => {
        const text = n.content || n.summary || (n.messages && n.messages[0]?.content) || "Empty Note";
        return { ...n, safeText: text };
    });

    const newEmbeddings = {};
    const embeddingMap = {}; // noteId -> vector

    await Promise.all(
        notesWithContent.map(async n => {
            // Check Cache first
            if (n.embedding && Array.isArray(n.embedding) && n.embedding.length > 0) {
                // console.log(`Using cached embedding for ${n.id}`);
                embeddingMap[n.id] = n.embedding;
                return;
            }

            // Fetch if missing
            try {
                // console.log(`Generating embedding for ${n.id}`);
                const vec = await getEmbeddingsFn(n.safeText.substring(0, 200));
                if (vec) {
                    embeddingMap[n.id] = vec;
                    newEmbeddings[n.id] = vec; // Mark for save
                }
            } catch (e) {
                console.warn(`Failed to embed note ${n.id}`, e);
            }
        })
    );

    // 3. Compute Initial Cluster Centroids
    // Group notes by UF Leader
    const clusters = {}; // leaderId -> { noteIds: [], vectors: [], manualZoneTitle: null }

    notes.forEach(n => {
        const leader = uf.find(n.id);
        if (!clusters[leader]) {
            clusters[leader] = { noteIds: [], vectors: [], manualZoneTitle: null };
        }
        clusters[leader].noteIds.push(n.id);
        if (embeddingMap[n.id]) {
            clusters[leader].vectors.push(embeddingMap[n.id]);
        }
        // If any note here is in a manual zone, adopt that title
        if (n.zoneId && !clusters[leader].manualZoneTitle) {
            const z = zones.find(z => z.id === n.zoneId);
            if (z) clusters[leader].manualZoneTitle = z.title;
        }
    });

    // Calculate Centroids
    Object.values(clusters).forEach(c => {
        if (c.vectors.length > 0) {
            const dim = c.vectors[0].length;
            const centroid = new Array(dim).fill(0);
            c.vectors.forEach(vec => {
                for (let i = 0; i < dim; i++) centroid[i] += vec[i];
            });
            c.centroid = centroid.map(x => x / c.vectors.length);
        }
    });

    // 4. Soft Linking (Orphans -> Best Cluster)
    // "Orphan" = Cluster with 1 note AND no manual zone title (weakly organized)
    const SIMILARITY_THRESHOLD = 0.8;
    const clusterKeys = Object.keys(clusters);

    for (let i = 0; i < clusterKeys.length; i++) {
        const idA = clusterKeys[i];
        const clusterA = clusters[idA];

        // Is A an orphan?
        const isAWeak = clusterA.noteIds.length === 1 && !clusterA.manualZoneTitle;
        if (!isAWeak) continue;
        if (!clusterA.centroid) continue;

        let bestMatchId = null;
        let bestSim = -1;

        for (let j = 0; j < clusterKeys.length; j++) {
            if (i === j) continue;
            const idB = clusterKeys[j];
            const clusterB = clusters[idB];

            if (!clusterB.centroid) continue;

            const sim = cosineSimilarity(clusterA.centroid, clusterB.centroid);
            if (sim > bestSim) {
                bestSim = sim;
                bestMatchId = idB;
            }
        }

        if (bestMatchId && bestSim >= SIMILARITY_THRESHOLD) {
            // Merge A into B
            clusters[bestMatchId].noteIds.push(...clusterA.noteIds);
            delete clusters[idA];
        }
    }

    // 5. Layout Generation (Grid)
    const finalClusters = Object.values(clusters);
    const savedZones = [];
    const layoutMap = {};

    const COLUMNS = 3;
    const ZONE_WIDTH = 420; // Slightly smaller to fix visual proportions
    const ZONE_PADDING = 48; // Large padding for "scaled down" look
    const HEADER_HEIGHT = 80;

    // Card Dimensions
    const CARD_WIDTH = ZONE_WIDTH - (ZONE_PADDING * 2); // 324px
    const CARD_HEIGHT = 140; // Smaller height
    const CARD_GAP = 32; // Larger Gap

    const ZONE_GAP = 80;
    const BASE_Y = 220;

    finalClusters.forEach((cluster, index) => {
        const col = index % COLUMNS;
        const row = Math.floor(index / COLUMNS);
        const zoneX = col * (ZONE_WIDTH + ZONE_GAP) + 100;

        // Simple row-based Y. 
        const zoneY = row * 1000 + BASE_Y;

        const zoneId = `virtual-zone-${index}`;
        // Smart Naming: if no manual title, use AI to name it? For now, 'Group X'.
        const label = cluster.manualZoneTitle || `Group ${index + 1}`;

        // Calculate Cluster Height
        const contentHeight = cluster.noteIds.length * (CARD_HEIGHT + CARD_GAP);
        const zoneHeight = HEADER_HEIGHT + contentHeight + ZONE_PADDING;

        savedZones.push({
            id: zoneId,
            title: label,
            x: zoneX,
            y: zoneY,
            width: ZONE_WIDTH,
            height: zoneHeight,
            isVirtual: true
        });

        cluster.noteIds.forEach((nid, nIdx) => {
            layoutMap[nid] = {
                x: zoneX + ZONE_PADDING,
                y: zoneY + HEADER_HEIGHT + (nIdx * (CARD_HEIGHT + CARD_GAP)),
                width: CARD_WIDTH,
                height: CARD_HEIGHT
            };
        });
    });

    return { zones: savedZones, layout: layoutMap, newEmbeddings };
};
