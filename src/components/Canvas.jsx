import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useGesture } from '@use-gesture/react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { SquareDashed } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import StickyNote from './StickyNote';

const CARD_W = 200;
const CARD_H = 200;
const ZONE_GRID_GAP = 16;
const MIN_ZONE_W = CARD_W + 30;  // Single card + 15px padding on each side
const MIN_ZONE_H = CARD_H + 30;
const ZONE_HANDLE_SIZE = 10;
const ZONE_PADDING = 15;  // Gap between zone edge and content
const ZONE_BORDER_HIT_SIZE = 24;

// Helper: 计算note中心点是否在zone内
function isNoteCenterInZone(position, zone) {
    if (!position || !zone) return false;
    const cx = position.x + CARD_W / 2;
    const cy = position.y + CARD_H / 2;
    const { x, y, width, height } = zone.bounds;
    return cx >= x && cx <= x + width && cy >= y && cy <= y + height;
}

// Helper: 计算note与zone的重叠比例
function getNoteZoneOverlapRatio(position, zone) {
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

// 判定note应该归属哪个zone（用于最终分配，标准较严格：中心点必须在内）
function pickZoneIdForNotePosition(zones, position) {
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

// 判定note正在进入哪个zone（用于拖拽时hover提示）
function pickHoverZoneId(zones, position) {
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

// 判定note是否正在离开某个zone
function isNoteLeavingZone(zones, position, originalZoneId) {
    if (!originalZoneId || !position) return false;
    const zone = zones.find(z => z.id === originalZoneId);
    if (!zone) return false;

    // 离开判定：中心点移出zone即离开
    return !isNoteCenterInZone(position, zone);
}

export default function Canvas() {
    const { workspaces, currentWorkspaceId, updateCanvas } = useStore();
    const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

    const containerRef = useRef(null);
    const modalContentRef = useRef(null);
    const modalPreviouslyFocusedRef = useRef(null);
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
    const viewportRef = useRef(viewport);
    const workspacesRef = useRef(workspaces);
    const [bgSelected, setBgSelected] = useState(false);
    const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [zones, setZones] = useState([]);
    const [notes, setNotes] = useState([]);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const [expandedNoteId, setExpandedNoteId] = useState(null);
    const [modalJustClosed, setModalJustClosed] = useState(false);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [selectedZoneId, setSelectedZoneId] = useState(null);
    const [hoverZoneId, setHoverZoneId] = useState(null);  // Zone the note is entering
    const [leavingZoneId, setLeavingZoneId] = useState(null);  // Zone the note is leaving
    const [editingZoneTitleId, setEditingZoneTitleId] = useState(null);
    const [zoneTitleDraft, setZoneTitleDraft] = useState('');
    const fileInputRef = useRef(null);
    const isInitialLoadRef = useRef(true);

    useEffect(() => {
        workspacesRef.current = workspaces;
    }, [workspaces]);

    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport]);

    // Sync local state with store (only when switching workspace)
    useEffect(() => {
        isInitialLoadRef.current = true; // Block sync during initialization
        const ws = workspacesRef.current.find(w => w.id === currentWorkspaceId);
        if (!ws) return;
        setViewport(ws.canvas.viewport);
        setNotes(ws.canvas.notes || []);
        setZones(ws.canvas.zones || []);
        setBackgroundImage(ws.canvas.backgroundImage || null);
        setBgTransform(ws.canvas.backgroundTransform || { x: 0, y: 0, scale: 1 });
        setSelectedNoteId(null);
        setExpandedNoteId(null);
        setSelectedZoneId(null);
        setBgSelected(false);

        // Use a timeout to ensure state has settled before allowing sync
        const timer = setTimeout(() => {
            isInitialLoadRef.current = false;
        }, 100);
        return () => clearTimeout(timer);
    }, [currentWorkspaceId]);

    // Callback definitions (must be before useEffect that uses them)
    const saveViewport = useCallback((newViewport) => {
        if (currentWorkspaceId) updateCanvas(currentWorkspaceId, { viewport: newViewport });
    }, [currentWorkspaceId, updateCanvas]);

    const saveNotes = useCallback((newNotes) => {
        if (currentWorkspaceId) updateCanvas(currentWorkspaceId, { notes: newNotes });
    }, [currentWorkspaceId, updateCanvas]);

    const saveZones = useCallback((newZones) => {
        if (currentWorkspaceId) updateCanvas(currentWorkspaceId, { zones: newZones });
    }, [currentWorkspaceId, updateCanvas]);

    const saveBackgroundImage = useCallback((imageData) => {
        if (currentWorkspaceId) updateCanvas(currentWorkspaceId, { backgroundImage: imageData });
    }, [currentWorkspaceId, updateCanvas]);

    const saveBackgroundTransform = useCallback((transform) => {
        if (currentWorkspaceId) updateCanvas(currentWorkspaceId, { backgroundTransform: transform });
    }, [currentWorkspaceId, updateCanvas]);

    // Centralized Sync: Notes
    useEffect(() => {
        if (!currentWorkspaceId || isInitialLoadRef.current) return;
        saveNotes(notes);
    }, [notes, currentWorkspaceId, saveNotes]);

    // Centralized Sync: Zones
    useEffect(() => {
        if (!currentWorkspaceId || isInitialLoadRef.current) return;
        saveZones(zones);
    }, [zones, currentWorkspaceId, saveZones]);

    const handleBackgroundUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Constants
        const MIN_WIDTH = 800;
        const MAX_WIDTH = 5000;
        const TARGET_WIDTH = 1600;
        const COMPRESSION_QUALITY = 0.85;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // 1. Validate dimensions
                if (img.width < MIN_WIDTH) {
                    alert(`图片宽度太小（${img.width}px）。最小宽度：${MIN_WIDTH}px\n建议：使用至少 1600px 宽的图片以获得最佳效果。`);
                    return;
                }
                if (img.width > MAX_WIDTH) {
                    alert(`图片宽度过大（${img.width}px）。最大宽度：${MAX_WIDTH}px\n建议：请先压缩图片或使用较小尺寸。`);
                    return;
                }

                // 2. Calculate target dimensions
                const scale = TARGET_WIDTH / img.width;
                const targetHeight = Math.round(img.height * scale);

                // 3. Create canvas for resizing
                const canvas = document.createElement('canvas');
                canvas.width = TARGET_WIDTH;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');

                // 4. Draw and compress
                ctx.drawImage(img, 0, 0, TARGET_WIDTH, targetHeight);
                const processedDataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);

                // 5. Store metadata for display scaling
                const imageData = {
                    dataUrl: processedDataUrl,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    displayWidth: TARGET_WIDTH,
                    displayHeight: targetHeight
                };

                setBackgroundImage(imageData);
                saveBackgroundImage(imageData);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Helper: Screen to World
    const toWorld = useCallback((cx, cy) => {
        const rect = containerRef.current.getBoundingClientRect();
        const v = viewportRef.current;
        return {
            x: (cx - rect.left - v.x) / v.zoom,
            y: (cy - rect.top - v.y) / v.zoom
        };
    }, []);

    const getWorldCenter = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, [toWorld]);

    const deleteZone = useCallback((zoneId) => {
        setZones(prevZones => {
            return prevZones.filter(z => z.id !== zoneId);
        });
        setSelectedZoneId(prevId => (prevId === zoneId ? null : prevId));
    }, []);

    const updateZoneTitle = useCallback((zoneId, title) => {
        setZones(prevZones =>
            prevZones.map(z => z.id === zoneId ? { ...z, title } : z)
        );
    }, []);

    const createAndExpandNoteAtWorldPosition = useCallback((p) => {
        setSelectedNoteId(null);

        const notePosition = { x: p.x - 100, y: p.y - 50 };
        const zoneId = pickZoneIdForNotePosition(zones, notePosition);

        const newNote = {
            id: uuidv4(),
            position: notePosition, // Center on click
            dimensions: { width: 200, height: 100 },
            zoneId,
            isExpanded: false,
            title: 'New Note',
            summary: '',
            messages: [],
            createdAt: Date.now()
        };

        setNotes(prevNotes => [...prevNotes, newNote]);

        setExpandedNoteId(newNote.id);
    }, [zones]);

    const handleDoubleClick = (e) => {
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

    const updateNote = (id, patch) => {
        setNotes(prevNotes => {
            return prevNotes.map(n => {
                if (n.id !== id) return n;
                const updated = { ...n, ...patch };
                if (patch && patch.position) {
                    const zoneId = pickZoneIdForNotePosition(zones, patch.position);
                    if (updated.zoneId !== zoneId) return { ...updated, zoneId };
                }
                return updated;
            });
        });
    };

    const deleteNote = (id) => {
        setNotes(prevNotes => prevNotes.filter(n => n.id !== id));
        // Close modal if the deleted note was expanded
        if (expandedNoteId === id) {
            setExpandedNoteId(null);
            setModalJustClosed(true);
        }
        // Deselect if the deleted note was selected
        if (selectedNoteId === id) {
            setSelectedNoteId(null);
        }
    };

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
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [createAndExpandNoteAtWorldPosition, deleteZone, expandedNoteId, getWorldCenter, modalJustClosed, selectedZoneId]);

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

    const handleForkNote = (sourceNoteId, message) => {
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
            isExpanded: false, // Start collapsed or expanded? Let's start collapsed but user can open.
            title: `Fork: ${sourceNote.title || 'Note'}`,
            messages: [message], // Start with the forked message
            createdAt: Date.now()
        };

        setNotes(prevNotes => [...prevNotes, newNote]);
    };

    const handleCanvasClick = (e) => {
        if (!e.target.closest('[data-zone-id]')) {
            setSelectedZoneId(null);
        }
    };

    function createZone() {
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
            parentZoneId: parentZone ? parentZone.id : null,
            title: '',
            bounds,
            manualBounds: bounds,
            createdAt: now
        };

        setZones(prevZones => [...prevZones, newZone]);
        setSelectedZoneId(id);
    }

    useGesture({
        onDrag: ({ offset: [x, y], movement: [mx, my], event, first, last, memo }) => {
            // On first event, check if we should skip this drag entirely
            if (first) {
                const isOnNote = event.target.closest('[data-note-id]');
                const isOnBackdrop = event.target.closest('[data-backdrop]');
                if (isOnNote || isOnBackdrop) {
                    return { mode: 'SKIP' };
                }
            }

            // Skip all further processing for skipped drags
            if (memo?.mode === 'SKIP') return memo;

            // Background Image Move/Resize Logic (when selected)
            if (bgSelected && backgroundImage) {
                const handleTarget = event.target.closest('[data-bg-handle]');
                if (first && handleTarget) {
                    const handle = handleTarget.getAttribute('data-bg-handle');
                    const baseW =
                        (typeof backgroundImage === 'object' && backgroundImage?.displayWidth) ||
                        (typeof backgroundImage === 'object' && backgroundImage?.originalWidth) ||
                        1600;
                    const baseH =
                        (typeof backgroundImage === 'object' && backgroundImage?.displayHeight) ||
                        (typeof backgroundImage === 'object' && backgroundImage?.originalHeight) ||
                        900;
                    const startScale = bgTransform.scale || 1;
                    const startW = baseW * startScale;
                    const startH = baseH * startScale;

                    return {
                        mode: 'BG_RESIZE',
                        handle,
                        baseW,
                        baseH,
                        startX: bgTransform.x,
                        startY: bgTransform.y,
                        startScale,
                        startW,
                        startH
                    };
                }

                if (memo?.mode === 'BG_RESIZE') {
                    const { handle, baseW, baseH, startX, startY, startScale, startW, startH } = memo;
                    const dx = mx / viewport.zoom;
                    const dy = my / viewport.zoom;

                    const anchorByHandle = () => {
                        switch (handle) {
                            case 'tl':
                                return { ax: startX + startW, ay: startY + startH, flipX: true, flipY: true };
                            case 'tr':
                                return { ax: startX, ay: startY + startH, flipX: false, flipY: true };
                            case 'bl':
                                return { ax: startX + startW, ay: startY, flipX: true, flipY: false };
                            case 'br':
                            default:
                                return { ax: startX, ay: startY, flipX: false, flipY: false };
                        }
                    };

                    const { ax, ay, flipX, flipY } = anchorByHandle();
                    const ddx = flipX ? -dx : dx;
                    const ddy = flipY ? -dy : dy;

                    const scaleX = (startW + ddx) / startW;
                    const scaleY = (startH + ddy) / startH;
                    const nextScale = Math.max(0.1, Math.min(5, startScale * Math.max(scaleX, scaleY)));

                    const nextW = baseW * nextScale;
                    const nextH = baseH * nextScale;

                    const nextX = flipX ? ax - nextW : ax;
                    const nextY = flipY ? ay - nextH : ay;

                    const nextTransform = { x: nextX, y: nextY, scale: nextScale };
                    setBgTransform(nextTransform);
                    if (last) saveBackgroundTransform(nextTransform);
                    return memo;
                }

                const newTransform = { ...bgTransform, x, y };
                setBgTransform(newTransform);
                if (last) saveBackgroundTransform(newTransform);
                return memo;
            }

            if (first) {
                const zoneHandleTarget = event.target.closest('[data-zone-handle]');
                if (zoneHandleTarget) {
                    const handle = zoneHandleTarget.getAttribute('data-zone-handle');
                    const id = zoneHandleTarget.getAttribute('data-zone-id');
                    const zone = zones.find(z => z.id === id);
                    if (!zone) return memo;
                    setSelectedZoneId(id);
                    return {
                        mode: 'ZONE_RESIZE',
                        id,
                        handle,
                        initialBounds: { ...zone.bounds }
                    };
                }

                const zoneTarget = event.target.closest('[data-zone-id]');
                if (zoneTarget) {
                    const id = zoneTarget.getAttribute('data-zone-id');
                    const zone = zones.find(z => z.id === id);
                    if (!zone) return memo;
                    setSelectedZoneId(id);

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

                    const zoneIds = getZoneSubtreeIds(id);
                    const zoneBoundsById = new Map(
                        zoneIds
                            .map(zoneId => zones.find(z => z.id === zoneId))
                            .filter(Boolean)
                            .map(z => [z.id, { ...z.bounds }])
                    );
                    const notePosById = new Map(
                        notes
                            .filter(n => zoneIds.includes(n.zoneId))
                            .map(n => [n.id, { ...n.position }])
                    );

                    return {
                        mode: 'ZONE_MOVE',
                        id,
                        initialBounds: { ...zone.bounds },
                        zoneIds,
                        zoneBoundsById,
                        notePosById
                    };
                }

                return {
                    mode: 'PAN',
                    initialViewport: { ...viewport }
                };
            }

            if (memo.mode === 'ZONE_MOVE') {
                const { zoneIds, zoneBoundsById, notePosById } = memo;
                const dx = mx / viewport.zoom;
                const dy = my / viewport.zoom;

                let newZones = null;
                let newNotes = null;

                setZones(prevZones => {
                    const nextZones = prevZones.map(z => {
                        if (!zoneIds?.includes?.(z.id)) return z;
                        const base = zoneBoundsById.get(z.id);
                        if (!base) return z;
                        const nextB = { ...base, x: base.x + dx, y: base.y + dy };
                        return { ...z, bounds: nextB, manualBounds: nextB };
                    });
                    newZones = nextZones;
                    return nextZones;
                });

                setNotes(prevNotes => {
                    const nextNotes = prevNotes.map(n => {
                        const base = notePosById.get(n.id);
                        if (!base) return n;
                        if (!zoneIds?.includes?.(n.zoneId)) return n;
                        return { ...n, position: { x: base.x + dx, y: base.y + dy } };
                    });
                    newNotes = nextNotes;
                    return nextNotes;
                });

                if (last) {
                    if (newZones) saveZones(newZones);
                    if (newNotes) saveNotes(newNotes);
                }
                return memo;
            }

            if (memo.mode === 'ZONE_RESIZE') {
                const { id, handle, initialBounds } = memo;
                const dx = mx / viewport.zoom;
                const dy = my / viewport.zoom;

                let x0 = initialBounds.x;
                let y0 = initialBounds.y;
                let w0 = initialBounds.width;
                let h0 = initialBounds.height;

                const hasL = handle.includes('l');
                const hasR = handle.includes('r');
                const hasT = handle.includes('t');
                const hasB = handle.includes('b');

                let newX = x0 + (hasL ? dx : 0);
                let newY = y0 + (hasT ? dy : 0);
                let newW = w0 + (hasR ? dx : hasL ? -dx : 0);
                let newH = h0 + (hasB ? dy : hasT ? -dy : 0);

                if (newW < MIN_ZONE_W) {
                    newW = MIN_ZONE_W;
                    if (hasL) newX = x0 + (w0 - MIN_ZONE_W);
                }
                if (newH < MIN_ZONE_H) {
                    newH = MIN_ZONE_H;
                    if (hasT) newY = y0 + (h0 - MIN_ZONE_H);
                }

                const newBounds = { x: newX, y: newY, width: newW, height: newH };
                const newZones = zones.map(z => (z.id === id ? { ...z, bounds: newBounds, manualBounds: newBounds } : z));
                setZones(newZones);

                const inner = {
                    x: newBounds.x + ZONE_PADDING,
                    y: newBounds.y + ZONE_PADDING,
                    w: newBounds.width - ZONE_PADDING * 2,
                    h: newBounds.height - ZONE_PADDING * 2
                };
                const minX = inner.x;
                const minY = inner.y;
                const maxX = inner.x + inner.w - CARD_W;
                const maxY = inner.y + inner.h - CARD_H;

                const clampedNotes = notes.map(n => {
                    if (n.zoneId !== id) return n;
                    const px = Math.max(minX, Math.min(n.position.x, maxX));
                    const py = Math.max(minY, Math.min(n.position.y, maxY));
                    if (px === n.position.x && py === n.position.y) return n;
                    return { ...n, position: { x: px, y: py } };
                });
                setNotes(clampedNotes);

                if (last) {
                    saveZones(newZones);
                    saveNotes(clampedNotes);
                }
                return memo;
            }

            if (memo.mode === 'PAN') {
                const newV = { ...memo.initialViewport, x: x, y: y };
                setViewport(newV);
                if (last) saveViewport(newV);
                return memo;
            }

            return memo;
        },
        // 背景图的缩放（使用同一个 pinch 手势，只在 bgSelected 时生效）
        onPinch: ({ offset: [d], event, last }) => {
            if (event.target.closest('[data-backdrop]')) return;
            if (bgSelected) {
                const newTransform = { ...bgTransform, scale: d };
                setBgTransform(newTransform);
                if (last) saveBackgroundTransform(newTransform);
                return;
            }
            const newV = { ...viewport, zoom: d };
            setViewport(newV);
            if (last) saveViewport(newV);
        },
        onWheel: ({ event, delta: [dx, dy], ctrlKey, last }) => {
            if (event.target.closest('[data-backdrop]')) return;
            if (ctrlKey) event.preventDefault();
            if (ctrlKey) {
                const newZoom = Math.max(0.1, Math.min(5, viewport.zoom - dy * 0.01));
                const newV = { ...viewport, zoom: newZoom };
                setViewport(newV);
                if (last) saveViewport(newV);
            } else {
                const newX = viewport.x - dx;
                const newY = viewport.y - dy;
                const newV = { ...viewport, x: newX, y: newY };
                setViewport(newV);
                if (last) saveViewport(newV);
            }
        }
    }, {
        target: containerRef,
        drag: {
            from: () => [viewport.x, viewport.y],
            // If pen mode, we don't want to accumulate drag offset for panning
            enabled: true,
        },
        enabled: !expandedNoteId, // Disable gestures when a note is expanded
        pinch: { scaleBounds: { min: 0.1, max: 5 }, modifierKey: null },
        eventOptions: { passive: false }
    });

    if (!currentWorkspace) return <div className="flex items-center justify-center h-full text-neutral-400">No Workspace Selected</div>;

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            onDoubleClick={handleDoubleClick}
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
                                            viewport={viewport}
                                            onFork={(msg) => handleForkNote(expandedNote.id, msg)}
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
                        <div className="w-px h-5 bg-neutral-200" />
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
                            setBackgroundImage(null);
                            saveBackgroundImage(null);
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

                {/* 直接在世界层渲染背景、网格等（无限画布） */}
                {/* Background Image – 交互在后面实现 */}
                {backgroundImage && (
                    <div
                        data-bg-image="true"
                        className="absolute opacity-80"
                        style={{
                            left: bgTransform.x,
                            top: bgTransform.y,
                            width:
                                ((typeof backgroundImage === 'object' && backgroundImage?.displayWidth) ||
                                    (typeof backgroundImage === 'object' && backgroundImage?.originalWidth) ||
                                    1600) * (bgTransform.scale || 1),
                            height:
                                ((typeof backgroundImage === 'object' && backgroundImage?.displayHeight) ||
                                    (typeof backgroundImage === 'object' && backgroundImage?.originalHeight) ||
                                    900) * (bgTransform.scale || 1),
                            pointerEvents: bgSelected ? 'auto' : 'none'
                        }}
                        onClick={(e) => {
                            if (!bgSelected) return;
                            e.stopPropagation();
                        }}
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
                                className={`absolute rounded-2xl transition-all duration-200 backdrop-blur-sm
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
                        onExpand={() => setExpandedNoteId(note.id)}
                        onCollapse={() => setExpandedNoteId(null)}
                        viewport={viewport}
                        onFork={(msg) => handleForkNote(note.id, msg)}
                        onDragMove={(noteId, position, { first, last }) => {
                            if (noteId !== note.id) return;
                            // Clear zone selection when note drag starts
                            if (first) {
                                setSelectedZoneId(null);
                            }

                            // 获取当前位置对应的目标 zone
                            const targetZoneId = pickHoverZoneId(zones, position);
                            // 获取 note 的原始归属 zone
                            const originalZoneId = note.zoneId;


                            // 只有目标 zone 与原始 zone 不同时，才显示视觉反馈
                            if (targetZoneId !== originalZoneId) {
                                // 正在进入一个新 zone（从外部或从其他 zone 拖入）
                                if (targetZoneId) {
                                    setHoverZoneId(targetZoneId);
                                } else {
                                    setHoverZoneId(null);
                                }
                                // 正在离开原有 zone（拖出到外部或其他 zone）
                                if (originalZoneId) {
                                    setLeavingZoneId(originalZoneId);
                                } else {
                                    setLeavingZoneId(null);
                                }
                            } else {
                                // 在同一个 zone 内拖动（或都在 null），不显示任何反馈
                                setHoverZoneId(null);
                                setLeavingZoneId(null);
                            }

                            if (last) {
                                setHoverZoneId(null);
                                setLeavingZoneId(null);
                            }
                        }}
                        // Hide original note when expanded
                        style={{ opacity: expandedNoteId === note.id ? 0 : 1 }}
                    />
                ))}

            </div>
        </div>
    );
}
