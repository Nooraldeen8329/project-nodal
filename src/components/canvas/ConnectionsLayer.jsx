/**
 * ConnectionsLayer - SVG 连线层组件
 * 渲染便签之间的连线
 * 
 * NOTE: This component must be rendered INSIDE the World container
 * so it shares the same coordinate space as Notes.
 */
import { getElementCenter, getRectIntersection } from '../../utils/coordinates';

/**
 * @param {Object} props
 * @param {Array} props.connections - 连线数组 [{id, fromId, toId}]
 * @param {Array} props.notes - 便签数组
 * @param {Object|null} props.connectionDrag - 正在拖拽创建的连线
 * @param {Map} props.draggingNoteIds - 正在拖拽的便签位置
 * @param {number} props.cardWidth - 便签宽度
 * @param {number} props.cardHeight - 便签高度
 * @param {Object} props.viewport - 视口状态 {x, y, zoom}
 */
export function ConnectionsLayer({
    connections,
    notes,
    connectionDrag,
    draggingNoteIds,
    cardWidth,
    cardHeight,
    selectedConnectionId,
    onSelectConnection,
    onDeleteConnection
}) {
    // 计算便签中心点 (world coordinates) - uses unified coordinate utility
    // Unified coordinate utility - we now render in World Space, so no screen projection needed.
    const getNoteCenter = (note) => {
        const draggingPos = draggingNoteIds.get(note.id);
        const pos = draggingPos || note.position;
        return getElementCenter(pos, cardWidth, cardHeight);
    };


    return (
        <svg
            className="absolute left-0 top-0 pointer-events-none overflow-visible"
            style={{ zIndex: 20, width: 1, height: 1 }}
        >
            {/* 已建立的连线 - project from World to Screen */}
            {connections.map(conn => {
                const fromNote = notes.find(n => n.id === conn.fromId);
                const toNote = notes.find(n => n.id === conn.toId);
                if (!fromNote || !toNote) return null;

                const startCenter = getNoteCenter(fromNote);
                const endCenter = getNoteCenter(toNote);

                // Calculate intersections with borders
                const start = getRectIntersection(startCenter, cardWidth, cardHeight, endCenter);
                const end = getRectIntersection(endCenter, cardWidth, cardHeight, startCenter);

                const isSelected = conn.id === selectedConnectionId;

                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;

                return (
                    <g
                        key={conn.id}
                        className="pointer-events-auto cursor-pointer focus:outline-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelectConnection && onSelectConnection(conn.id);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                onSelectConnection && onSelectConnection(conn.id);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select connection from ${fromNote.title || 'Note'} to ${toNote.title || 'Note'}`}
                    >
                        {/* Invisible thicker hit area for easier selection */}
                        <line
                            x1={start.x}
                            y1={start.y}
                            x2={end.x}
                            y2={end.y}
                            stroke="transparent"
                            strokeWidth="20"
                        />
                        {/* Visible line */}
                        <line
                            x1={start.x}
                            y1={start.y}
                            x2={end.x}
                            y2={end.y}
                            stroke={isSelected ? "#3b82f6" : "#cbd5e1"} // blue-500 if selected, else slate-300
                            strokeWidth={isSelected ? "3" : "2"}
                            className="transition-colors duration-200"
                        />

                        {/* Delete Button (Only when selected) */}
                        {/* Delete Button (Only when selected) - Polished Red Badge */}
                        {isSelected && (
                            <g
                                style={{ transform: `translate(${midX}px, ${midY}px)` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteConnection && onDeleteConnection(conn.id);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDeleteConnection && onDeleteConnection(conn.id);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Delete connection"
                                className="cursor-pointer group/btn focus:outline-none"
                            >
                                {/* 1. Invisible larger hit area to make clicking easier */}
                                <circle
                                    r="14"
                                    fill="transparent"
                                />
                                {/* 2. The Red Badge Background */}
                                <circle
                                    r="8"
                                    className="fill-red-500 transition-colors duration-200 group-hover/btn:fill-red-600"
                                    stroke="white"
                                    strokeWidth="1.5"
                                />
                                {/* 3. The White X Icon */}
                                <path
                                    d="M-3,-3 L3,3 M-3,3 L3,-3"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                />
                            </g>
                        )}
                    </g>
                );
            })}

            {/* 正在拖拽创建的连线 */}
            {connectionDrag && (() => {
                const fromNote = notes.find(n => n.id === connectionDrag.sourceId);
                if (!fromNote) return null;

                const startCenter = getNoteCenter(fromNote);
                const endWorld = connectionDrag.currentPoint; // connectionDrag uses world coords

                // Calculate intersection for start point only (end point follows cursor)
                const start = getRectIntersection(startCenter, cardWidth, cardHeight, endWorld);
                const end = endWorld;

                return (
                    <line
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke="#3b82f6" // blue-500
                        strokeWidth="2"
                        strokeDasharray="5,5"
                    />
                );
            })()}
        </svg>
    );
}

export default ConnectionsLayer;
