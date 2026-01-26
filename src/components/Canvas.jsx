import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { SquareDashed } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import StickyNote from './StickyNote';
import { useCanvasGestures } from '../hooks/useCanvasGestures';

import {
    CARD_W,
    CARD_H,
    MIN_ZONE_W,
    MIN_ZONE_H,
    ZONE_HANDLE_SIZE,
    ZONE_PADDING,
    ZONE_BORDER_HIT_SIZE,
    pickHoverZoneId
} from '../utils/zoneUtils';
import { screenToWorld } from '../utils/coordinates';
import { ConnectionsLayer } from './canvas/ConnectionsLayer';
// TODO: 待后续完全集成
// import { useCanvasKeyboard } from '../hooks/useCanvasKeyboard';
// import { useBackgroundImage } from '../hooks/useBackgroundImage';

const ZONE_GRID_GAP = 16;


export default function Canvas() {
    const {
        workspaces,
        currentWorkspaceId,
        updateCanvas,
        addNote,
        updateNote: updateNoteAction,
        deleteNote: deleteNoteAction,
        addConnection,
        addZone,
        updateZone,

        deleteZone: deleteZoneAction,
        deleteConnection, // Added
        moveZone,
        resizeZone,
        updateViewport,
        updateBackgroundTransform
    } = useStore();
    const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

    // ========== 从 Store 读取持久化数据 ==========
    const canvas = currentWorkspace?.canvas || {};
    const zones = canvas.zones || [];
    const notes = canvas.notes || [];
    const connections = canvas.connections || [];
    const viewport = canvas.viewport || { x: 0, y: 0, zoom: 1 };
    const backgroundImage = canvas.backgroundImage || null;
    const backgroundTransform = canvas.backgroundTransform || { x: 0, y: 0, scale: 1 };

    // ========== 统一的数据更新函数 ==========
    const patchCanvas = useCallback((patch) => {
        if (!currentWorkspaceId) return;
        updateCanvas(currentWorkspaceId, patch);
    }, [currentWorkspaceId, updateCanvas]);

    // ========== Refs ==========
    const containerRef = useRef(null);
    const modalContentRef = useRef(null);
    const modalPreviouslyFocusedRef = useRef(null);
    const fileInputRef = useRef(null);

    // ========== 仅 UI 状态（不持久化） ==========
    const [bgSelected, setBgSelected] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const [expandedNoteId, setExpandedNoteId] = useState(null);
    const [modalJustClosed, setModalJustClosed] = useState(false);
    const [selectedZoneId, setSelectedZoneId] = useState(null);
    const [hoverZoneId, setHoverZoneId] = useState(null);
    const [leavingZoneId, setLeavingZoneId] = useState(null);
    const [editingZoneTitleId, setEditingZoneTitleId] = useState(null);
    const [zoneTitleDraft, setZoneTitleDraft] = useState('');

    const [connectionDrag, setConnectionDrag] = useState(null);
    const [selectedConnectionId, setSelectedConnectionId] = useState(null); // Added
    // eslint-disable-next-line no-unused-vars
    const [draggingNoteIds, setDraggingNoteIds] = useState(new Map());

    // 坐标转换函数：屏幕坐标 -> 世界坐标 (使用统一坐标工具)
    const toWorld = useCallback((clientX, clientY) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;
        return screenToWorld({ x: screenX, y: screenY }, viewport);
    }, [viewport]);

    // 获取世界中心点 (使用统一坐标工具)
    const getWorldCenter = useCallback(() => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const centerScreen = { x: rect.width / 2, y: rect.height / 2 };
        return screenToWorld(centerScreen, viewport);
    }, [viewport]);

    // Keep toWorld stable for callbacks using ref
    const toWorldRef = useRef(toWorld);
    useEffect(() => {
        toWorldRef.current = toWorld;
    }, [toWorld]);

    // 创建并展开笔记
    // 创建并展开笔记
    const createAndExpandNoteAtWorldPosition = useCallback((worldPos) => {
        const newId = uuidv4();
        const newNote = {
            id: newId,
            position: worldPos,
            dimensions: { width: CARD_W, height: CARD_H },
            zoneId: null,
            isExpanded: false,
            title: '',
            messages: [],
            createdAt: Date.now()
        };
        addNote(currentWorkspaceId, newNote);
        setExpandedNoteId(newId);
    }, [currentWorkspaceId, addNote]);

    // 删除 Zone
    // 删除 Zone
    const deleteZone = useCallback((zoneId) => {
        deleteZoneAction(currentWorkspaceId, zoneId);

        if (selectedZoneId === zoneId) {
            setSelectedZoneId(null);
        }
    }, [currentWorkspaceId, deleteZoneAction, selectedZoneId]);

    // 更新 Zone 标题
    const updateZoneTitle = useCallback((zoneId, title) => {
        updateZone(currentWorkspaceId, zoneId, { title });
    }, [currentWorkspaceId, updateZone]);

    // 背景图片上传处理
    const handleBackgroundUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const bgData = {
                    dataUrl: event.target.result,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    displayWidth: img.width,
                    displayHeight: img.height
                };
                patchCanvas({ backgroundImage: bgData });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }, [patchCanvas]);

    const handleNoteDrag = useCallback((noteId, pos, meta) => {
        // Handle Note Position Dragging (updates draggingNoteIds for ConnectionsLayer)
        if (pos && meta?.first !== undefined) {
            if (meta.first) {
                // Start dragging: add to map
                setDraggingNoteIds(prev => new Map(prev).set(noteId, pos));
            } else if (meta.last) {
                // End dragging: remove from map
                setDraggingNoteIds(prev => {
                    const next = new Map(prev);
                    next.delete(noteId);
                    return next;
                });
            } else {
                // During drag: update position in map
                setDraggingNoteIds(prev => new Map(prev).set(noteId, pos));
            }
            return;
        }

        if (!meta) return;

        // Handle Connection Dragging
        const toWorldFn = toWorldRef.current;
        if (meta.type === 'connection-start') {
            const { event } = meta;
            const p = toWorldFn(event.clientX, event.clientY);
            setConnectionDrag({ sourceId: noteId, currentPoint: p });
            return;
        }

        if (meta.type === 'connection-move') {
            const { event } = meta;
            const p = toWorldFn(event.clientX, event.clientY);
            setConnectionDrag(prev => prev ? { ...prev, currentPoint: p } : null);
            return;
        }

        if (meta.type === 'connection-end') {
            const { event } = meta;
            const p = toWorldFn(event.clientX, event.clientY);
            setConnectionDrag(null);

            const targetNote = notes.find(n => {
                if (n.id === noteId) return false;
                const w = CARD_W;
                const h = CARD_H;
                return (
                    p.x >= n.position.x &&
                    p.x <= n.position.x + w &&
                    p.y >= n.position.y &&
                    p.y <= n.position.y + h
                );
            });

            if (targetNote) {
                const fromId = noteId;
                const toId = targetNote.id;

                const exists = connections.some(c =>
                    (c.fromId === fromId && c.toId === toId) ||
                    (c.fromId === toId && c.toId === fromId)
                );

                if (!exists) {
                    addConnection(currentWorkspaceId, fromId, toId);
                }
            }
            return;
        }
    }, [connections, notes, currentWorkspaceId, addConnection]); // Removed toWorld dependency

    const handleDragMove = useCallback((noteId, position, meta) => {
        if (meta && meta.type && meta.type.startsWith('connection-')) {
            handleNoteDrag(noteId, position, meta);
            return;
        }

        const { first, last } = meta;

        if (first) {
            setSelectedZoneId(null);
            setSelectedConnectionId(null); // Added
        }

        const targetZoneId = pickHoverZoneId(zones, position);
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        const originalZoneId = note.zoneId;

        if (targetZoneId !== originalZoneId) {
            if (targetZoneId) {
                setHoverZoneId(targetZoneId);
            } else {
                setHoverZoneId(null);
            }
            if (originalZoneId) {
                setLeavingZoneId(originalZoneId);
            } else {
                setLeavingZoneId(null);
            }
        } else {
            setHoverZoneId(null);
            setLeavingZoneId(null);
        }

        if (last) {
            setHoverZoneId(null);
            setLeavingZoneId(null);
        }
    }, [zones, notes, handleNoteDrag]);

    const handleDoubleTap = (e) => {
        // Block note creation when a modal is open or just closed
        if (expandedNoteId || modalJustClosed) {
            // Reset the just‑closed flag after it has blocked this click
            if (modalJustClosed) setModalJustClosed(false);
            return;
        }

        // Only create note if clicking on empty space (not on note)
        // Event delegation handles this naturally if notes stop propagation
        // Double check target to prevent accidental note creation
        if (
            e.target.closest('[data-note-id]') ||
            e.target.closest('[data-zone-id]') ||
            e.target.closest('[data-zone-handle]') ||
            e.target.closest('[data-bg-image]') ||
            e.target.closest('button') ||
            e.target.closest('input')
        ) return;

        const p = toWorld(e.clientX, e.clientY);
        // 在无限画布下直接创建笔记（不再限制范围）
        createAndExpandNoteAtWorldPosition(p);
    };

    const updateNote = useCallback((id, patch) => {
        updateNoteAction(currentWorkspaceId, id, patch);
    }, [currentWorkspaceId, updateNoteAction]);

    const deleteNote = useCallback((id) => {
        deleteNoteAction(currentWorkspaceId, id);

        // Close modal if the deleted note was expanded
        if (expandedNoteId === id) {
            setExpandedNoteId(null);
            setModalJustClosed(true);
        }
        // Deselect if the deleted note was selected
        if (selectedNoteId === id) {
            setSelectedNoteId(null);
        }
    }, [currentWorkspaceId, deleteNoteAction, expandedNoteId, selectedNoteId]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;

            if (e.key === 'Escape' && expandedNoteId) {
                e.preventDefault();
                setExpandedNoteId(null);
                setModalJustClosed(true);
                return;
            }

            if (e.key === 'n' || e.key === 'N') {
                if (expandedNoteId || modalJustClosed) return;
                const c = getWorldCenter();
                createAndExpandNoteAtWorldPosition(c);
                return;
            }

            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (selectedZoneId) deleteZone(selectedZoneId);
                if (selectedConnectionId) deleteConnection(currentWorkspaceId, selectedConnectionId); // Added
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [createAndExpandNoteAtWorldPosition, deleteZone, expandedNoteId, getWorldCenter, modalJustClosed, selectedZoneId, selectedConnectionId, deleteConnection, currentWorkspaceId]);

    useEffect(() => {
        if (!expandedNoteId) return;

        modalPreviouslyFocusedRef.current = document.activeElement;

        const focusFirst = () => {
            const root = modalContentRef.current;
            if (!root) return;
            const focusable = root.querySelector(
                'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus?.();
        };

        const handleKeyDown = (e) => {
            if (e.key !== 'Tab') return;
            const root = modalContentRef.current;
            if (!root) return;

            const focusable = root.querySelectorAll(
                'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };

        const timer = window.setTimeout(focusFirst, 0);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            modalPreviouslyFocusedRef.current?.focus?.();
        };
    }, [expandedNoteId]);

    const handleForkNote = useCallback((sourceNoteId, message) => {
        const sourceNote = notes.find(n => n.id === sourceNoteId);
        if (!sourceNote) return;

        const newId = uuidv4();
        // Offset position slightly from source
        const newPosition = {
            x: sourceNote.position.x + 50,
            y: sourceNote.position.y + 50
        };

        const newNote = {
            id: newId,
            position: newPosition,
            dimensions: { width: 200, height: 100 },
            zoneId: null,
            isExpanded: false,
            title: `Fork: ${sourceNote.title || 'Note'}`,
            messages: [message],
            createdAt: Date.now()
        };

        addNote(currentWorkspaceId, newNote);
    }, [notes, currentWorkspaceId, addNote]);

    const handleCanvasClick = (e) => {
        if (!e.target.closest('[data-zone-id]')) {
            setSelectedZoneId(null);
        }
        setSelectedConnectionId(null); // Added: Click background/unhandled areas deselects connection
    };

    const handleExpandNote = useCallback((noteId) => {
        setExpandedNoteId(noteId);
    }, []);

    const createZone = useCallback(() => {
        const id = uuidv4();
        const now = Date.now();

        const parentZone = selectedZoneId ? zones.find(z => z.id === selectedZoneId) : null;
        const bounds = parentZone
            ? {
                x: Math.max(
                    parentZone.bounds.x,
                    Math.min(parentZone.bounds.x + 20, parentZone.bounds.x + parentZone.bounds.width - MIN_ZONE_W)
                ),
                y: Math.max(
                    parentZone.bounds.y,
                    Math.min(parentZone.bounds.y + 20, parentZone.bounds.y + parentZone.bounds.height - MIN_ZONE_H)
                ),
                width: MIN_ZONE_W,
                height: MIN_ZONE_H
            }
            : (() => {
                const c = getWorldCenter();
                return { x: c.x - MIN_ZONE_W / 2, y: c.y - MIN_ZONE_H / 2, width: MIN_ZONE_W, height: MIN_ZONE_H };
            })();

        const newZone = {
            id,
            bounds,
            manualBounds: bounds, // Sync manualBounds on creation
            title: '',
            createdAt: now,
            parentZoneId: parentZone?.id || null
        };

        addZone(currentWorkspaceId, newZone);
        setSelectedZoneId(id);
    }, [addZone, currentWorkspaceId, selectedZoneId, zones, getWorldCenter]);



    // Canvas gestures (pan, zoom, zone drag/resize, background drag/resize)
    useCanvasGestures({
        containerRef,
        viewport,
        zones,
        notes,
        backgroundImage,
        backgroundTransform,
        bgSelected,
        expandedNoteId,
        patchCanvas,
        setSelectedZoneId,
        currentWorkspaceId,
        moveZone,
        resizeZone,
        updateViewport,
        updateBackgroundTransform,
        onDoubleTap: handleDoubleTap
    });

    if (!currentWorkspace) return <div className="flex items-center justify-center h-full text-neutral-400">No Workspace Selected</div>;

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            onClick={handleCanvasClick}
        >
            <div className="absolute inset-0 ui-dot-grid pointer-events-none" />

            {/* Global Backdrop & Modal (Portal to body) */}
            {expandedNoteId && createPortal(
                <>
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Lighter backdrop for context awareness
                            backdropFilter: 'blur(2px)', // Minimal blur to keep context visible
                            zIndex: 9998,
                            pointerEvents: 'auto'
                        }}
                        data-backdrop="true"
                        onClick={() => {
                            setExpandedNoteId(null);
                            setModalJustClosed(true);
                        }}
                        // Prevent double‑clicks on the backdrop from bubbling to the canvas
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setExpandedNoteId(null);
                            setModalJustClosed(true);
                        }}
                    />
                    <AnimatePresence>
                        {(() => {
                            const expandedNote = notes.find(n => n.id === expandedNoteId);
                            if (!expandedNote) return null;
                            return (
                                <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
                                    <div
                                        ref={modalContentRef}
                                        className="pointer-events-auto"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label={`Note: ${expandedNote.title || 'New Note'}`}
                                    >
                                        <StickyNote
                                            key={`modal-${expandedNote.id}`}
                                            note={expandedNote}
                                            variant="modal"
                                            onCollapse={() => {
                                                setExpandedNoteId(null);
                                                setModalJustClosed(true);
                                            }}
                                            onUpdate={updateNote}
                                            onDelete={deleteNote}
                                            isSelected={false}
                                            onSelect={() => { }}
                                            isExpanded={true}
                                            onExpand={() => { }}
                                            zoom={viewport.zoom}
                                            onFork={handleForkNote}
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </AnimatePresence>
                </>,
                document.body
            )}

            {/* HUD / Overlays */}
            <div className="absolute top-4 left-4 ui-panel px-4 py-2 z-10 pointer-events-none select-none">
                <h2 className="font-semibold text-neutral-800">{currentWorkspace.name}</h2>
                <div className="text-xs text-neutral-500 flex gap-2">
                    <span>{Math.round(viewport.zoom * 100)}%</span>
                    <span>{Math.round(viewport.x)}, {Math.round(viewport.y)}</span>
                </div>
            </div>

            {/* Toolbar - Horizontal Layout */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 ui-panel px-3 py-2 z-10 flex items-center gap-2">
                {/* Note Button */}
                <button
                    type="button"
                    onClick={() => {
                        if (expandedNoteId || modalJustClosed) return;
                        createAndExpandNoteAtWorldPosition(getWorldCenter());
                    }}
                    className="ui-btn ui-btn-secondary ui-btn-sm"
                    title="New Note (N)"
                    aria-label="New note"
                >
                    <span className="font-semibold" aria-hidden="true">＋</span>
                    Note
                </button>

                {/* Zone Button */}
                <button
                    type="button"
                    onClick={() => createZone()}
                    className="ui-btn ui-btn-secondary ui-btn-sm"
                    title={selectedZoneId ? 'Create Sub-zone inside selected Zone' : 'Create Zone'}
                    aria-label={selectedZoneId ? 'Create sub-zone inside selected zone' : 'Create zone'}
                >
                    <SquareDashed size={14} />
                    Zone
                </button>

                {/* Zone Select (only when zones exist) */}
                {zones.length > 0 && (
                    <>
                        <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700" />
                        <label className="sr-only" htmlFor="zone-select">Selected zone</label>
                        <select
                            id="zone-select"
                            className="ui-select text-xs py-1.5"
                            value={selectedZoneId || ''}
                            onChange={(e) => setSelectedZoneId(e.target.value || null)}
                        >
                            <option value="">Select Zone</option>
                            {zones.map((z, idx) => (
                                <option key={z.id} value={z.id}>
                                    {`Zone ${idx + 1}`}
                                </option>
                            ))}
                        </select>
                        {selectedZoneId && (
                            <button
                                type="button"
                                onClick={() => deleteZone(selectedZoneId)}
                                className="ui-icon-btn ui-icon-btn-danger"
                                title="Delete selected Zone"
                                aria-label="Delete selected zone"
                            >
                                <span aria-hidden="true">🗑️</span>
                            </button>
                        )}
                    </>
                )}

                {/* Divider */}
                <div className="w-px h-5 bg-neutral-200" />

                {/* Background Upload */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="ui-btn ui-btn-ghost ui-btn-sm"
                    title="Upload Background Image"
                    aria-label="Upload background image"
                >
                    <span aria-hidden="true">{backgroundImage ? '🖼️' : '📁'}</span>
                    Background
                </button>
                {backgroundImage && (
                    <button
                        type="button"
                        onClick={() => setBgSelected(v => !v)}
                        className={`ui-btn ui-btn-sm ${bgSelected ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                        aria-pressed={bgSelected}
                        aria-label={bgSelected ? 'Finish editing background' : 'Edit background'}
                        title={bgSelected ? 'Finish editing background' : 'Edit background'}
                    >
                        {bgSelected ? '✓ Done' : 'Edit'}
                    </button>
                )}
                {backgroundImage && (
                    <button
                        type="button"
                        onClick={() => {
                            patchCanvas({ backgroundImage: null });
                            setBgSelected(false);
                        }}
                        className="ui-icon-btn ui-icon-btn-danger"
                        title="Remove Background"
                        aria-label="Remove background image"
                    >
                        <span aria-hidden="true">🗑️</span>
                    </button>
                )}
            </div>


            {/* World */}
            <div
                className="absolute top-0 left-0 origin-top-left will-change-transform"
                style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
            >
                {/* Connections Layer moved after Zones */}

                {/* 直接在世界层渲染背景、网格等（无限画布） */}
                {/* Background Image – 交互在后面实现 */}

                {backgroundImage && (
                    <div
                        data-bg-image="true"
                        className="absolute opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        style={{
                            left: backgroundTransform.x,
                            top: backgroundTransform.y,
                            width:
                                ((typeof backgroundImage === 'object' && backgroundImage?.displayWidth) ||
                                    (typeof backgroundImage === 'object' && backgroundImage?.originalWidth) ||
                                    1600) * (backgroundTransform.scale || 1),
                            height:
                                ((typeof backgroundImage === 'object' && backgroundImage?.displayHeight) ||
                                    (typeof backgroundImage === 'object' && backgroundImage?.originalHeight) ||
                                    900) * (backgroundTransform.scale || 1),
                            pointerEvents: bgSelected ? 'auto' : 'none'
                        }}
                        onClick={(e) => {
                            if (!bgSelected) return;
                            e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                            if (!bgSelected) return;
                            if (e.key === 'Backspace' || e.key === 'Delete') {
                                patchCanvas({ backgroundImage: null });
                                setBgSelected(false);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Canvas Background Image"
                    >
                        <img
                            src={backgroundImage.dataUrl || backgroundImage}
                            alt="Canvas Background"
                            className="w-full h-full object-contain cursor-pointer shadow-2xl rounded"
                            draggable={false}
                        />
                        {bgSelected && (
                            <>
                                <div
                                    data-bg-handle="tl"
                                    className="absolute -left-1.5 -top-1.5 bg-white border border-blue-500 rounded-sm"
                                    style={{ width: 10, height: 10, cursor: 'nwse-resize' }}
                                />
                                <div
                                    data-bg-handle="tr"
                                    className="absolute -right-1.5 -top-1.5 bg-white border border-blue-500 rounded-sm"
                                    style={{ width: 10, height: 10, cursor: 'nesw-resize' }}
                                />
                                <div
                                    data-bg-handle="bl"
                                    className="absolute -left-1.5 -bottom-1.5 bg-white border border-blue-500 rounded-sm"
                                    style={{ width: 10, height: 10, cursor: 'nesw-resize' }}
                                />
                                <div
                                    data-bg-handle="br"
                                    className="absolute -right-1.5 -bottom-1.5 bg-white border border-blue-500 rounded-sm"
                                    style={{ width: 10, height: 10, cursor: 'nwse-resize' }}
                                />
                            </>
                        )}
                    </div>
                )}



                {/* Zones */}
                {Array.isArray(zones) && zones.map(z => {
                    const isSelected = z.id === selectedZoneId;
                    const isHover = z.id === hoverZoneId;
                    const isLeaving = z.id === leavingZoneId;
                    const { x, y, width, height } = z.bounds;
                    const handleBase = `absolute bg-white border border-blue-500 rounded-sm z-50`;
                    const handleStyle = { width: ZONE_HANDLE_SIZE, height: ZONE_HANDLE_SIZE };

                    const selectZone = (e) => {
                        e.stopPropagation();
                        setSelectedZoneId(z.id);
                    };

                    return (
                        <React.Fragment key={z.id}>
                            {/* Main Zone Container */}
                            <div
                                data-zone-id={z.id}
                                onClick={selectZone}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        selectZone(e);
                                    }
                                    if (isSelected && (e.key === 'Backspace' || e.key === 'Delete')) {
                                        deleteZone(z.id);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Zone: ${z.title || 'Untitled'}`}
                                className={`absolute rounded-2xl transition-all duration-200 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                    ${isSelected || isHover || isLeaving ? 'z-10' : 'z-0'}
                                    ${isSelected
                                        ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                                        : (isHover
                                            ? 'border-blue-400 bg-blue-100/50 shadow-lg ring-4 ring-blue-500/10'
                                            : (isLeaving
                                                ? 'border-orange-400 bg-orange-100/50 shadow-lg ring-4 ring-orange-500/20'
                                                : 'border-neutral-200 bg-neutral-100/40 hover:bg-neutral-100/60 shadow-sm'))
                                    }
                                `}
                                style={{
                                    left: x,
                                    top: y,
                                    width,
                                    height,
                                    borderWidth: isHover || isLeaving ? 2 : 1,
                                    borderStyle: isLeaving ? 'dashed' : 'solid',
                                    cursor: 'move',
                                    pointerEvents: 'auto'
                                }}
                            >
                                {/* Zone Title */}
                                {(z.title || isSelected) && (
                                    <div
                                        className={`absolute -top-6 left-2 right-2 h-6 flex items-center cursor-text
                                            ${isSelected ? 'pointer-events-auto' : 'pointer-events-none'}
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isSelected && editingZoneTitleId !== z.id) {
                                                setEditingZoneTitleId(z.id);
                                                setZoneTitleDraft(z.title || '');
                                            }
                                        }}
                                        onDoubleClick={(e) => e.stopPropagation()}
                                    >
                                        {editingZoneTitleId === z.id ? (
                                            <input
                                                type="text"
                                                value={zoneTitleDraft}
                                                onChange={(e) => setZoneTitleDraft(e.target.value)}
                                                onBlur={() => {
                                                    updateZoneTitle(z.id, zoneTitleDraft.trim());
                                                    setEditingZoneTitleId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        updateZoneTitle(z.id, zoneTitleDraft.trim());
                                                        setEditingZoneTitleId(null);
                                                    } else if (e.key === 'Escape') {
                                                        setEditingZoneTitleId(null);
                                                    }
                                                }}
                                                className="w-full bg-white/80 backdrop-blur-sm border border-blue-400 
                                                    rounded px-2 py-0.5 text-xs font-medium text-neutral-700
                                                    focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="Zone title..."
                                                autoFocus
                                            />
                                        ) : (
                                            <span
                                                className={`text-xs font-medium px-2 py-0.5 rounded
                                                    ${z.title
                                                        ? 'text-neutral-600 bg-white/60 backdrop-blur-sm'
                                                        : 'text-neutral-400 italic bg-white/40'}
                                                `}
                                            >
                                                {z.title || (isSelected ? 'Double-click to add title' : '')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Resize Handles (Only when selected) */}
                            {isSelected && (
                                <>
                                    <div
                                        data-zone-id={z.id}
                                        data-zone-handle="tl"
                                        className={handleBase}
                                        style={{ ...handleStyle, left: x - ZONE_HANDLE_SIZE / 2, top: y - ZONE_HANDLE_SIZE / 2, cursor: 'nwse-resize' }}
                                    />
                                    <div
                                        data-zone-id={z.id}
                                        data-zone-handle="tr"
                                        className={handleBase}
                                        style={{ ...handleStyle, left: x + width - ZONE_HANDLE_SIZE / 2, top: y - ZONE_HANDLE_SIZE / 2, cursor: 'nesw-resize' }}
                                    />
                                    <div
                                        data-zone-id={z.id}
                                        data-zone-handle="bl"
                                        className={handleBase}
                                        style={{ ...handleStyle, left: x - ZONE_HANDLE_SIZE / 2, top: y + height - ZONE_HANDLE_SIZE / 2, cursor: 'nesw-resize' }}
                                    />
                                    <div
                                        data-zone-id={z.id}
                                        data-zone-handle="br"
                                        className={handleBase}
                                        style={{ ...handleStyle, left: x + width - ZONE_HANDLE_SIZE / 2, top: y + height - ZONE_HANDLE_SIZE / 2, cursor: 'nwse-resize' }}
                                    />
                                </>
                            )}
                        </React.Fragment>
                    );
                })}

                {/* Connections Layer (Rendered here to be ABOVE Zones but BELOW Notes) */}
                <ConnectionsLayer
                    connections={connections}
                    notes={notes}
                    connectionDrag={connectionDrag}
                    draggingNoteIds={draggingNoteIds}
                    cardWidth={CARD_W}
                    cardHeight={CARD_H}
                    selectedConnectionId={selectedConnectionId}
                    onSelectConnection={setSelectedConnectionId}
                    onDeleteConnection={(id) => deleteConnection(currentWorkspaceId, id)}
                />

                {/* Connections Layer (Moved above to top of World) */}
                {/* <ConnectionsLayer ... removed duplicate > */}

                {/* Notes Layer */}
                {notes.map(note => (
                    <StickyNote
                        key={note.id}
                        note={note}
                        variant="canvas"
                        onUpdate={updateNote}
                        onDelete={deleteNote}
                        isSelected={selectedNoteId === note.id}
                        onSelect={setSelectedNoteId}
                        onExpand={handleExpandNote}
                        zoom={viewport.zoom}
                        onFork={handleForkNote}
                        onDragMove={handleDragMove}
                        // Hide original note when expanded
                        hidden={expandedNoteId === note.id}
                    />
                ))}

            </div>
        </div>
    );
}
