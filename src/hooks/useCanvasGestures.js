import React, { useCallback, useMemo } from 'react';
import { useGesture } from '@use-gesture/react';
import {
    MIN_ZONE_W,
    MIN_ZONE_H
} from '../utils/zoneUtils';

/**
 * Canvas gesture handler hook - handles all canvas-level gestures
 * 
 * Refactored Phase 2:
 * - Direct Store Actions
 * - No local geometry state management
 */
export function useCanvasGestures({
    containerRef,
    viewport,
    zones,
    backgroundImage,
    backgroundTransform,
    bgSelected,
    expandedNoteId,
    setSelectedZoneId,
    currentWorkspaceId,
    moveZone,
    resizeZone,
    updateViewport,
    updateBackgroundTransform,
    onDoubleTap // New prop for custom double detection
}) {
    // Double tap state
    const doubleTapRef = React.useRef({ time: 0 });

    // Mode detection
    const detectMode = useCallback((event, first) => {
        if (!first) return null;

        // Skip if on note or backdrop
        if (event.target.closest('[data-note-id]') || event.target.closest('[data-backdrop]')) {
            return { mode: 'SKIP' };
        }

        // Background resize handle
        if (bgSelected && backgroundImage) {
            const handleTarget = event.target.closest('[data-bg-handle]');
            if (handleTarget) {
                const handle = handleTarget.getAttribute('data-bg-handle');
                const baseW = backgroundImage?.displayWidth || backgroundImage?.originalWidth || 1600;
                const baseH = backgroundImage?.displayHeight || backgroundImage?.originalHeight || 900;
                const startScale = backgroundTransform.scale || 1;
                return {
                    mode: 'BG_RESIZE',
                    handle,
                    baseW, baseH,
                    startX: backgroundTransform.x,
                    startY: backgroundTransform.y,
                    startScale,
                    startW: baseW * startScale,
                    startH: baseH * startScale
                };
            }
        }

        // Zone resize handle
        const zoneHandleTarget = event.target.closest('[data-zone-handle]');
        if (zoneHandleTarget) {
            const handle = zoneHandleTarget.getAttribute('data-zone-handle');
            const id = zoneHandleTarget.getAttribute('data-zone-id');
            const zone = zones.find(z => z.id === id);
            if (zone) {
                setSelectedZoneId(id);
                return {
                    mode: 'ZONE_RESIZE',
                    id,
                    handle,
                    initialBounds: { ...zone.bounds }
                };
            }
        }

        // Zone move
        const zoneTarget = event.target.closest('[data-zone-id]');
        if (zoneTarget) {
            const id = zoneTarget.getAttribute('data-zone-id');
            // We only need ID for move, as we use deltas
            setSelectedZoneId(id);
            return {
                mode: 'ZONE_MOVE',
                id
            };
        }

        // Default: pan
        return { mode: 'PAN' };
    }, [zones, backgroundImage, backgroundTransform, bgSelected, setSelectedZoneId]);

    // Handle background move/resize
    const handleBgDrag = useCallback((offset, movement, memo) => {
        const [mx, my] = movement;

        if (memo.mode === 'BG_RESIZE') {
            const { handle, baseW, baseH, startX, startY, startScale, startW, startH } = memo;
            const dx = mx / viewport.zoom;
            const dy = my / viewport.zoom;

            const anchors = {
                tl: { ax: startX + startW, ay: startY + startH, flipX: true, flipY: true },
                tr: { ax: startX, ay: startY + startH, flipX: false, flipY: true },
                bl: { ax: startX + startW, ay: startY, flipX: true, flipY: false },
                br: { ax: startX, ay: startY, flipX: false, flipY: false }
            };
            const { ax, ay, flipX, flipY } = anchors[handle] || anchors.br;

            const ddx = flipX ? -dx : dx;
            const ddy = flipY ? -dy : dy;
            const scaleX = (startW + ddx) / startW;
            const scaleY = (startH + ddy) / startH;
            const nextScale = Math.max(0.1, Math.min(5, startScale * Math.max(scaleX, scaleY)));

            const nextW = baseW * nextScale;
            const nextH = baseH * nextScale;

            updateBackgroundTransform(currentWorkspaceId, {
                x: flipX ? ax - nextW : ax,
                y: flipY ? ay - nextH : ay,
                scale: nextScale
            });
        } else {
            // BG move: use raw offset? 
            // Previous code: patchCanvas({ backgroundTransform: { ...backgroundTransform, x, y } });
            // offset is [x, y] cumulative.
            // If we use updateBackgroundTransform(patch), we can pass x,y directly.
            const [x, y] = offset;
            updateBackgroundTransform(currentWorkspaceId, { x, y });
        }
    }, [viewport.zoom, currentWorkspaceId, updateBackgroundTransform]);

    // Gesture config
    const gestureConfig = useMemo(() => ({
        target: containerRef,
        // For PAN and BG_MOVE we use offset, which needs initial values
        drag: {
            from: ({ target }) => {
                // Return different initial values based on target/mode?
                // useGesture doesn't know mode yet.
                // But we can check target here loosely.
                if (target.closest('[data-bg-image]')) return [backgroundTransform.x, backgroundTransform.y];
                return [viewport.x, viewport.y];
            },
            enabled: true
        },
        enabled: !expandedNoteId,
        pinch: { scaleBounds: { min: 0.1, max: 5 }, modifierKey: null },
        eventOptions: { passive: false }
    }), [containerRef, viewport.x, viewport.y, backgroundTransform.x, backgroundTransform.y, expandedNoteId]);

    useGesture({
        onDrag: ({ offset, movement, delta, event, first, memo }) => {
            if (first) {
                const detected = detectMode(event, first);
                if (detected) return detected;
            }

            if (memo?.mode === 'SKIP') return memo;

            if (bgSelected && backgroundImage && (memo.mode === 'BG_RESIZE' || !memo.mode?.startsWith?.('ZONE'))) {
                handleBgDrag(offset, movement, memo);
            } else if (memo.mode === 'ZONE_MOVE') {
                // Use delta for movement
                const [dx, dy] = delta;
                if (dx !== 0 || dy !== 0) {
                    moveZone(currentWorkspaceId, memo.id, { dx: dx / viewport.zoom, dy: dy / viewport.zoom });
                }
            } else if (memo.mode === 'ZONE_RESIZE') {
                // Use movement for resize (cumulative)
                const [mx, my] = movement;
                const { id, handle, initialBounds } = memo;
                const dx = mx / viewport.zoom;
                const dy = my / viewport.zoom;

                let { x: x0, y: y0, width: w0, height: h0 } = initialBounds;
                const hasL = handle.includes('l');
                const hasR = handle.includes('r');
                const hasT = handle.includes('t');
                const hasB = handle.includes('b');

                let newX = x0 + (hasL ? dx : 0);
                let newY = y0 + (hasT ? dy : 0);
                let newW = w0 + (hasR ? dx : hasL ? -dx : 0);
                let newH = h0 + (hasB ? dy : hasT ? -dy : 0);

                if (newW < MIN_ZONE_W) { newW = MIN_ZONE_W; if (hasL) newX = x0 + w0 - MIN_ZONE_W; }
                if (newH < MIN_ZONE_H) { newH = MIN_ZONE_H; if (hasT) newY = y0 + h0 - MIN_ZONE_H; }

                resizeZone(currentWorkspaceId, id, { x: newX, y: newY, width: newW, height: newH });
            } else if (memo.mode === 'PAN') {
                // Use delta for pan?
                // Previous code used offset: patchCanvas({ viewport: { ...initial, x, y } })
                // If we use delta:
                const [dx, dy] = delta;
                if (dx !== 0 || dy !== 0) {
                    // CAUTION: React state updates might be async. 
                    // Using delta on potentially stale viewport.x can cause jitter if frequent updates.
                    // But updateViewport merges into *store* state (get()...).
                    // So we should pass a function or force store to use its current state.
                    // Our updateViewport action does: { ...ws.canvas.viewport, ...patch }
                    // If we pass absolute values? No, we don't have absolute if we use delta.
                    // If we use offset [x, y], it IS absolute (tracked by useGesture).
                    // But offset initialized with [viewport.x, viewport.y].

                    // Let's stick to OLD behavior for Pan (Offset-based) for smoothness.
                    const [x, y] = offset;
                    updateViewport(currentWorkspaceId, { x, y });
                }
            }

            return memo;
        },
        onPinch: ({ offset: [d], origin: [ox, oy], event }) => {
            if (event.target.closest('[data-backdrop]')) return;

            if (bgSelected) {
                updateBackgroundTransform(currentWorkspaceId, { scale: d });
            } else {
                // Zoom around pinch center
                const oldZoom = viewport.zoom;
                const oldX = viewport.x;
                const oldY = viewport.y;
                const newZoom = d;

                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const pointerX = ox - rect.left;
                const pointerY = oy - rect.top;

                const newX = pointerX - ((pointerX - oldX) / oldZoom) * newZoom;
                const newY = pointerY - ((pointerY - oldY) / oldZoom) * newZoom;

                updateViewport(currentWorkspaceId, { x: newX, y: newY, zoom: newZoom });
            }
        },
        onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
            if (event.target.closest('[data-backdrop]')) return;
            if (ctrlKey) {
                event.preventDefault();
                const oldZoom = viewport.zoom;
                const newZoom = Math.max(0.1, Math.min(5, oldZoom - dy * 0.01));

                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const pointerX = event.clientX - rect.left;
                const pointerY = event.clientY - rect.top;

                const oldX = viewport.x;
                const oldY = viewport.y;

                const newX = pointerX - ((pointerX - oldX) / oldZoom) * newZoom;
                const newY = pointerY - ((pointerY - oldY) / oldZoom) * newZoom;

                updateViewport(currentWorkspaceId, { x: newX, y: newY, zoom: newZoom });
            } else {
                updateViewport(currentWorkspaceId, { x: viewport.x - dx, y: viewport.y - dy });
            }
        },
        onClick: ({ event }) => {
            // Custom Double Tap Logic
            // Native onDoubleClick is sometimes hard to trigger or conflicts with drag
            const now = Date.now();
            const last = doubleTapRef.current.time;
            const dt = now - last;

            if (dt > 0 && dt < 300) {
                // Double Tap!
                onDoubleTap && onDoubleTap(event);
                // Reset to avoid triple-click triggering again immediately
                doubleTapRef.current.time = 0;
            } else {
                doubleTapRef.current.time = now;
            }
        }
    }, gestureConfig);
}
