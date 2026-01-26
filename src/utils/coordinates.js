/**
 * Unified Coordinate Transformation Utilities
 * 
 * 统一的坐标变换工具，解决 Canvas 组件坐标系统不一致问题。
 * 所有组件（Notes, Connections, Zones）应使用这些函数进行坐标转换。
 * 
 * @see .phrase/phases/phase-canvas-refactor-20260125/analysis_coordinate_system.md
 */

/**
 * 将世界坐标转换为屏幕坐标
 * World → Screen: 应用 viewport 的 translate 和 scale
 * 
 * @param {Object} worldPos - 世界坐标 {x, y}
 * @param {Object} viewport - 视口状态 {x, y, zoom}
 * @returns {Object} 屏幕坐标 {x, y}
 */
export function worldToScreen(worldPos, viewport) {
    return {
        x: worldPos.x * viewport.zoom + viewport.x,
        y: worldPos.y * viewport.zoom + viewport.y
    };
}

/**
 * 将屏幕坐标转换为世界坐标
 * Screen → World: 反向应用 viewport 的 translate 和 scale
 * 
 * @param {Object} screenPos - 屏幕坐标 {x, y}
 * @param {Object} viewport - 视口状态 {x, y, zoom}
 * @returns {Object} 世界坐标 {x, y}
 */
export function screenToWorld(screenPos, viewport) {
    return {
        x: (screenPos.x - viewport.x) / viewport.zoom,
        y: (screenPos.y - viewport.y) / viewport.zoom
    };
}

/**
 * 计算拖拽增量在世界坐标系中的值
 * 用于处理拖拽时的坐标补偿
 * 
 * @param {number} screenDelta - 屏幕像素增量
 * @param {number} zoom - 当前缩放级别
 * @returns {number} 世界坐标增量
 */
export function screenDeltaToWorld(screenDelta, zoom) {
    return screenDelta / zoom;
}

/**
 * 计算元素中心点的世界坐标
 * 
 * @param {Object} position - 元素左上角位置 {x, y}
 * @param {number} width - 元素宽度
 * @param {number} height - 元素高度
 * @returns {Object} 中心点世界坐标 {x, y}
 */
export function getElementCenter(position, width, height) {
    return {
        x: position.x + width / 2,
        y: position.y + height / 2
    };
}

/**
 * Calculate the intersection point of a line segment from the center of a rectangle
 * to a target point with the rectangle's border.
 * 
 * @param {Object} center - Rectangle center {x, y}
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @param {Object} target - Target point {x, y}
 * @returns {Object} Intersection point {x, y}
 */
export function getRectIntersection(center, width, height, target) {
    const dx = target.x - center.x;
    const dy = target.y - center.y;

    if (dx === 0 && dy === 0) return center;

    const hW = width / 2;
    const hH = height / 2;

    // Aspect ratio comparison approach
    // Y-axis increases downwards in DOM
    const slope = Math.abs(dy / dx);
    const aspect = hH / hW;

    let x, y;

    if (slope <= aspect) {
        // Intersects Left or Right
        // dx > 0 means target is to the right
        x = (dx > 0) ? center.x + hW : center.x - hW;
        y = center.y + (dx > 0 ? hW : -hW) * (dy / dx);
    } else {
        // Intersects Top or Bottom 
        // dy > 0 means target is below
        y = (dy > 0) ? center.y + hH : center.y - hH;
        x = center.x + (dy > 0 ? hH : -hH) * (dx / dy);
    }

    return { x, y };
}
