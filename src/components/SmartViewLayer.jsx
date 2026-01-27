import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { createAIProvider } from '../services/ai_provider';
import { generateSmartView } from '../utils/clustering';
import { Loader2, X, Sparkles, MessageSquare } from 'lucide-react';
import { useGesture } from '@use-gesture/react';

// Dedicated Smart View Card Component
// Decoupled from StickyNote to ensure strict adherence to Clustering Layout
const SmartCard = ({ note, layout, onClick }) => {
    if (!layout) return null;

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onClick && onClick(note);
            }}
            className="absolute flex flex-col rounded-xl shadow-sm border border-neutral-200 bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer group overflow-hidden"
            style={{
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                backgroundColor: note.color || '#fef3c7'
            }}
        >
            {/* Title */}
            {note.title && (
                <div className="px-5 pt-4 pb-1 border-b border-black/5">
                    <div className="font-bold text-neutral-900 text-sm line-clamp-1">
                        {note.title}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 px-5 py-3 overflow-hidden">
                <p className={`text-xs leading-relaxed line-clamp-4 ${note.title ? 'text-neutral-600' : 'text-neutral-800 font-medium'}`}>
                    {note.summary || note.messages?.find(m => m.role === 'user')?.content || '(Empty)'}
                </p>
            </div>

            {/* Footer */}
            <div className="px-5 pb-3 pt-2 mt-auto border-t border-black/5 flex items-center justify-between opacity-50 text-[10px]">
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                    <MessageSquare size={10} />
                    <span>{Math.ceil((note.messages?.length || 0) / 2)}</span>
                </div>
            </div>

            {/* Hover Hint */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold shadow-sm text-neutral-600">
                    Expand Note
                </span>
            </div>
        </div>
    );
};

export default function SmartViewLayer({ onClose }) {
    const { workspaces, currentWorkspaceId, settings, setExpandedNoteId, updateNote } = useStore();
    const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
    const notes = currentWorkspace?.canvas?.notes || [];
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Panning State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Gestures
    const bind = useGesture({
        onDrag: ({ offset: [mx, my] }) => {
            setPan({ x: mx, y: my });
        },
        onWheel: ({ offset: [mx, my] }) => {
            // Optional: Allow wheel panning too (inverted for natural feel?)
            // For now, let's map wheel to pan directly to match trackpad feeling
            setPan({ x: -mx, y: -my });
        }
    }, {
        drag: { from: () => [pan.x, pan.y] },
        // Wheel offset is usually cumulative, but we need to inverse it often or match drag.
        // Let's stick to Drag first as requested. Wheel config can be tricky with native scrolling.
        // Actually, preventing default wheel behavior is key here.
        wheel: {
            from: () => [-pan.x, -pan.y], // Inverse logic for standard wheel
            eventOptions: { passive: false }
        }
    });

    const handleExpandNote = (note) => {
        // Open Note in Modal (Global Action) - Read Only Mode
        setExpandedNoteId({ id: note.id, readOnly: true });
    };

    useEffect(() => {
        let mounted = true;

        const run = async () => {
            try {
                // Minimum check
                if (notes.length < 2) {
                    throw new Error("Need at least 2 notes to cluster.");
                }

                const provider = createAIProvider(settings);
                // Wrap in closure to capture current provider settings
                const getEmbeddings = (text) => provider.getEmbeddings(text);

                // Add artificial delay for UX if it's too fast (so user sees "Thinking...")
                const start = Date.now();
                const result = await generateSmartView(
                    notes,
                    getEmbeddings,
                    currentWorkspace?.canvas?.zones || [],
                    currentWorkspace?.canvas?.connections || []
                );

                // Persist new embeddings
                if (result.newEmbeddings) {
                    Object.entries(result.newEmbeddings).forEach(([id, embedding]) => {
                        updateNote(currentWorkspaceId, id, { embedding });
                    });
                }

                if (Date.now() - start < 800) {
                    await new Promise(r => setTimeout(r, 800));
                }

                if (mounted) setData(result);
            } catch (err) {
                console.error("Smart View Error:", err);
                if (mounted) setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        run();

        return () => { mounted = false; };
    }, [notes]);

    // Handle Escape Key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Render loading state
    if (loading) {
        return (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                    <Loader2 className="animate-spin mb-6 text-blue-600 relative z-10" size={64} />
                </div>
                <h2 className="text-2xl font-bold text-neutral-800 mb-2">Analyzing {notes.length} Notes</h2>
                <p className="text-neutral-500 max-w-md text-center">
                    Calculating vector embeddings and identifying semantic clusters...
                </p>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center">
                <div className="bg-red-50 p-6 rounded-2xl max-w-md text-center border border-red-100">
                    <h3 className="text-red-600 font-bold text-lg mb-2">Analysis Failed</h3>
                    <p className="text-neutral-600 mb-6">{error}</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium"
                    >
                        Close View
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="absolute inset-0 z-40 bg-neutral-100/95 overflow-hidden custom-scrollbar animate-in slide-in-from-bottom-10 fade-in duration-300">
            {/* Header / Remote Controller */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur shadow-lg border border-black/5 px-6 py-3 rounded-full flex items-center gap-4 z-50">
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <Sparkles size={18} />
                    <span>Smart View</span>
                </div>
                <div className="w-px h-4 bg-black/10"></div>
                <div className="text-sm text-neutral-500">
                    Generated {data.zones.length} clusters from {notes.length} notes
                </div>
                <div className="w-px h-4 bg-black/10"></div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-black/5 text-neutral-500 transition-colors"
                    title="Exit Smart View"
                    aria-label="Exit Smart View"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                {...bind()}
                className="min-w-full min-h-full p-20 relative cursor-grab active:cursor-grabbing"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
            >
                {/* Zones */}
                {data.zones.map(zone => (
                    <div
                        key={zone.id}
                        className="absolute rounded-3xl border-2 border-dashed border-neutral-300/60 bg-white/40"
                        style={{
                            left: zone.x,
                            top: zone.y,
                            width: zone.width,
                            height: zone.height
                        }}
                    >
                        <div className="absolute -top-10 left-0 text-xl font-bold text-black dark:text-white uppercase tracking-wide px-2 flex items-center">
                            <div className="w-8 h-1 bg-blue-500 rounded-full mr-3"></div>
                            {zone.title}
                        </div>
                    </div>
                ))}

                {/* Notes (Read-One Proxies) */}
                {notes.map(note => (
                    <SmartCard
                        key={note.id}
                        note={note}
                        layout={data.layout[note.id]}
                        onClick={handleExpandNote}
                    />
                ))}
            </div>
        </div>
    );
}

