/**
 * Zone 相关的工具函数
 * 用于判断便签与 Zone 的关系
 */

// 便签的默认尺寸
export const CARD_W = 280;
export const CARD_H = 200;

// Zone 相关常量
export const MIN_ZONE_W = CARD_W + 30;  // Single card + 15px padding on each side
export const MIN_ZONE_H = CARD_H + 30;
export const ZONE_HANDLE_SIZE = 10;
export const ZONE_PADDING = 15;  // Gap between zone edge and content
export const ZONE_BORDER_HIT_SIZE = 24;

/**
 * 计算 note 中心点是否在 zone 内
 */
export function isNoteCenterInZone(position, zone) {
    if (!position || !zone) return false;
    const cx = position.x + CARD_W / 2;
    const cy = position.y + CARD_H / 2;
    const { x, y, width, height } = zone.bounds;
    return cx >= x && cx <= x + width && cy >= y && cy <= y + height;
}

/**
 * 计算 note 与 zone 的重叠比例
 */
export function getNoteZoneOverlapRatio(position, zone) {
    if (!position || !zone) return 0;
    const nx = position.x;
    const ny = position.y;
    const { x: zx, y: zy, width: zw, height: zh } = zone.bounds;

    const ix = Math.max(nx, zx);
    const iy = Math.max(ny, zy);
    const iRight = Math.min(nx + CARD_W, zx + zw);
    const iBottom = Math.min(ny + CARD_H, zy + zh);

    if (ix >= iRight || iy >= iBottom) return 0;
    return ((iRight - ix) * (iBottom - iy)) / (CARD_W * CARD_H);
}

/**
 * 判定 note 应该归属哪个 zone（用于最终分配，标准较严格：中心点必须在内）
 */
export function pickZoneIdForNotePosition(zones, position) {
    if (!position || !Array.isArray(zones) || zones.length === 0) return null;

    const zoneById = new Map(zones.map(z => [z.id, z]));
    const depthCache = new Map();

    const getZoneDepth = (zoneId) => {
        if (depthCache.has(zoneId)) return depthCache.get(zoneId);
        let depth = 0;
        let cur = zoneById.get(zoneId);
        while (cur && cur.parentZoneId) {
            depth += 1;
            cur = zoneById.get(cur.parentZoneId);
        }
        depthCache.set(zoneId, depth);
        return depth;
    };

    let best = null;

    for (const z of zones) {
        // 严格标准：中心点必须在zone内
        if (!isNoteCenterInZone(position, z)) continue;

        const depth = getZoneDepth(z.id);
        const overlapRatio = getNoteZoneOverlapRatio(position, z);

        // 优先选择更深的嵌套zone，同深度选重叠更多的
        if (!best || depth > best.depth || (depth === best.depth && overlapRatio > best.overlapRatio)) {
            best = { id: z.id, depth, overlapRatio };
        }
    }

    return best ? best.id : null;
}

/**
 * 判定 note 正在进入哪个 zone（用于拖拽时 hover 提示）
 */
export function pickHoverZoneId(zones, position) {
    if (!position || !Array.isArray(zones) || zones.length === 0) return null;

    const zoneById = new Map(zones.map(z => [z.id, z]));
    const depthCache = new Map();

    const getZoneDepth = (zoneId) => {
        if (depthCache.has(zoneId)) return depthCache.get(zoneId);
        let depth = 0;
        let cur = zoneById.get(zoneId);
        while (cur && cur.parentZoneId) {
            depth += 1;
            cur = zoneById.get(cur.parentZoneId);
        }
        depthCache.set(zoneId, depth);
        return depth;
    };

    let best = null;

    for (const z of zones) {
        // 只用中心点判定
        if (!isNoteCenterInZone(position, z)) continue;

        const depth = getZoneDepth(z.id);

        // 优先选择更深的嵌套zone
        if (!best || depth > best.depth) {
            best = { id: z.id, depth };
        }
    }

    return best ? best.id : null;
}
