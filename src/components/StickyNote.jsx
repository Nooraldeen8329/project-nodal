import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion } from 'framer-motion';
import { X, Maximize2, Minimize2, MessageSquare, GitBranch, Pencil } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useStore } from '../store/useStore';
import { createAIProvider } from '../services/ai_provider';
import { screenDeltaToWorld } from '../utils/coordinates';

const MotionDiv = motion.div;

function getSummaryFirstLine(note) {
    if (note.title) return note.title;
    const summary = typeof note?.summary === 'string' ? note.summary.trim() : '';
    if (!summary) return '';
    const firstLine = summary.split('\n').map(s => s.trim()).find(Boolean) || '';
    return firstLine;
}

function formatSummaryForCard(note) {
    if (note.title) return note.title;
    const summary = typeof note?.summary === 'string' ? note.summary.trim() : '';
    if (summary) return summary.replace(/\s+\n\s+/g, '\n').replace(/[ \t]{2,}/g, ' ');
    return '';
}

const StickyNote = React.memo(({
    note,
    onUpdate,
    onDelete,
    isSelected,
    onSelect,
    isExpanded,
    onExpand,
    onCollapse,
    zoom,
    bounds,
    onFork,
    onDragMove,
    variant = 'canvas',
    hidden = false,
    readOnly = false
}) => {
    const isModal = variant === 'modal';
    const [isDragging, setIsDragging] = useState(false);
    const [draggingPos, setDraggingPos] = useState(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const { settings } = useStore();
    const chatContainerRef = useRef(null);
    const titleInputRef = useRef(null);
    const chatInputRef = useRef(null);

    // Derived position for rendering
    const currentPos = (isDragging && draggingPos) ? draggingPos : (note.position || { x: 0, y: 0 });

    // Focus title input when editing starts (Canvas)
    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
        }
    }, [isEditingTitle]);

    // Initial focus on Chat Input when Modal opens
    useEffect(() => {
        if (isModal && chatInputRef.current) {
            // Small timeout to ensure render completion/animation
            setTimeout(() => {
                chatInputRef.current?.focus();
            }, 100);
        }
    }, [isModal]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [note.messages, isExpanded]);

    // Main Card Drag
    const bind = useDrag(({ movement: [mx, my], first, last, memo, event }) => {
        if (first && event) {
            const target = event.target;
            // Prevent drag when interacting with buttons, handles, or input/textarea
            if (target.closest('button') || target.closest('.connection-handle') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return { skip: true };
            }
            event.stopPropagation();
        }

        if (memo?.skip) return memo;

        if (first) {
            const startPos = note.position || { x: 0, y: 0 };
            memo = { x: startPos.x, y: startPos.y };
            setIsDragging(true);
            setDraggingPos(startPos);
        }

        if (!memo) memo = note.position || { x: 0, y: 0 };

        // Use unified coordinate transformation
        let newX = memo.x + screenDeltaToWorld(mx, zoom);
        let newY = memo.y + screenDeltaToWorld(my, zoom);

        if (bounds) {
            const currentWidth = isExpanded ? 400 : 280; // Updated to 280
            const currentHeight = isExpanded ? 500 : 200;
            newX = Math.max(0, Math.min(newX, bounds.width - currentWidth));
            newY = Math.max(0, Math.min(newY, bounds.height - currentHeight));
        }

        const nextPos = { x: newX, y: newY };
        setDraggingPos(nextPos);
        onDragMove?.(note.id, nextPos, { first, last });

        if (last) {
            setIsDragging(false);
            setDraggingPos(null);
            onUpdate(note.id, { position: nextPos });
        }

        return memo;
    }, {
        pointer: { keys: undefined }, // Allow keys but we don't use them for connection anymore
        filterTaps: true,
        enabled: !isModal
    });

    // Connection Handle Drag
    const bindHandle = useDrag(({ event, first, last }) => {
        if (first) {
            event.stopPropagation();
            onDragMove?.(note.id, null, { type: 'connection-start', event });
        } else if (last) {
            onDragMove?.(note.id, null, { type: 'connection-end', event });
        } else {
            onDragMove?.(note.id, null, { type: 'connection-move', event });
        }
    }, {
        pointer: { keys: undefined }
    });

    const handleTitleChange = (e) => {
        onUpdate(note.id, { title: e.target.value });
    };

    const displayContent = formatSummaryForCard(note);
    // If title exists, we treat it as user handwriting -> Bold/Marker style
    // If no title, we treat it as AI summary -> Regular/Italic style
    const isUserTitle = !!note.title;

    return (
        <>
            {/* Actual Note */}
            <MotionDiv
                initial={isModal ? { opacity: 0, scale: 0.9 } : false}
                {...bind()}
                onClick={(e) => { e.stopPropagation(); !isModal && onSelect(note.id); }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isModal && !isEditingTitle) onExpand(note.id);
                }}
                onKeyDown={(e) => {
                    if (isModal) return;
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    // Allow typing in editing mode
                    if (isEditingTitle) return;

                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(note.id);
                    if (e.key === 'Enter') onExpand(note.id);
                }}
                exit={isModal ? { opacity: 0, scale: 0.9 } : null}
                animate={isModal ? { opacity: 1, scale: 1 } : {
                    x: currentPos.x,
                    y: currentPos.y,
                    width: 280, // Updated width
                    height: 200,
                    zIndex: isSelected ? 50 : 30,
                    opacity: hidden ? 0 : 1
                }}
                transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                className={`
                    ${isModal ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[82vh] z-50 shadow-[0_28px_120px_rgba(15,23,42,0.32)] rounded-2xl' : 'absolute left-0 top-0 rounded-2xl shadow-[0_16px_60px_rgba(15,23,42,0.16)]'}
                    ${!isModal ? 'group' : ''} 
                    flex flex-col
                    ${!isModal && isSelected ? 'ring-2 ring-blue-500 z-50' : 'border border-black/10'}
                    ${!isModal && isDragging ? 'ring-2 ring-blue-500/20' : ''}
                    ${!isModal ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white touch-none' : ''}
                `}
                style={{
                    backgroundColor: note.color || '#fef3c7',
                    '--note-bg': note.color || '#fef3c7',
                    opacity: hidden ? 0 : 1
                }}
                data-note-id={note.id}
                role={!isModal ? 'button' : undefined}
                tabIndex={!isModal ? 0 : -1}
                aria-label={!isModal ? `Open note: ${getSummaryFirstLine(note) || 'Note'}` : undefined}
            >
                {/* Connection Handles (Only in Canvas mode) */}
                {!isModal && (
                    <>
                        {/* Top */}
                        <div {...bindHandle()} className="connection-handle absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow border border-white" />
                        </div>
                        {/* Right */}
                        <div {...bindHandle()} className="connection-handle absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow border border-white" />
                        </div>
                        {/* Bottom */}
                        <div {...bindHandle()} className="connection-handle absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow border border-white" />
                        </div>
                        {/* Left */}
                        <div {...bindHandle()} className="connection-handle absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity z-50">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow border border-white" />
                        </div>
                    </>
                )}

                {/* Content Wrapper to clip internal content but allow handles to overflow */}
                <div className="w-full h-full flex flex-col overflow-hidden rounded-2xl relative">
                    {isModal ? (
                        <div
                            className="flex items-center justify-between px-3 py-2 bg-white/65 backdrop-blur border-b border-black/5 select-none"
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                onCollapse();
                            }}
                        >
                            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 truncate flex-1 mr-4">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-black/5 shrink-0">
                                    <MessageSquare size={14} />
                                </span>
                                {/* Editable Title in Modal */}
                                {isEditingTitle ? (
                                    <input
                                        ref={titleInputRef}
                                        type="text"
                                        value={note.title || ''}
                                        onChange={handleTitleChange}
                                        onBlur={() => setIsEditingTitle(false)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setIsEditingTitle(false);
                                            }
                                        }}
                                        placeholder="Click to add title..."
                                        className="bg-transparent border-b border-black/10 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full text-sm font-semibold text-neutral-800 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 group/title cursor-pointer w-full" onClick={() => !readOnly && setIsEditingTitle(true)}>
                                        <span className={`text-sm font-semibold truncate ${!note.title ? 'text-neutral-400 italic' : 'text-neutral-800'}`}>
                                            {note.title || 'Untitled Note'}
                                        </span>
                                        {!readOnly && (
                                            <button
                                                className="ui-icon-btn opacity-0 group-hover/title:opacity-100 transition-opacity"
                                                title="Edit Title"
                                                aria-label="Edit Title"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); onCollapse(); }}
                                    className="ui-icon-btn"
                                    title="收起"
                                    aria-label="Collapse note"
                                >
                                    <Minimize2 size={16} />
                                </button>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                                        className="ui-icon-btn ui-icon-btn-danger"
                                        aria-label="Delete note"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingTitle(true);
                                }}
                                className="ui-icon-btn"
                                aria-label="Edit title"
                                title="Edit Title"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onExpand(note.id); }}
                                className="ui-icon-btn"
                                aria-label="Expand note"
                                title="Expand"
                            >
                                <Maximize2 size={14} />
                            </button>
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                                className="ui-icon-btn ui-icon-btn-danger"
                                aria-label="Delete note"
                                title="Delete"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-4 flex flex-col overflow-hidden">
                        {!isModal ? (
                            <div className="flex-1 flex flex-col p-3 cursor-default group overflow-hidden">
                                {/* Summary Preview or Inline Editor */}
                                <div className="flex-1 overflow-hidden relative">
                                    {isEditingTitle ? (
                                        <textarea
                                            ref={titleInputRef}
                                            value={note.title || ''}
                                            onChange={handleTitleChange}
                                            onBlur={() => setIsEditingTitle(false)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault(); // Prevent newline in title
                                                    titleInputRef.current?.blur();
                                                }
                                                e.stopPropagation(); // Stop Canvas keyboard shortcuts
                                            }}
                                            placeholder="Type your title..."
                                            className="w-full h-full bg-transparent resize-none border-none outline-none text-neutral-900 font-bold leading-relaxed whitespace-pre-wrap placeholder-neutral-400"
                                            style={{ fontSize: '1rem' }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        displayContent ? (
                                            <p className={`line-clamp-6 select-none leading-relaxed text-sm whitespace-pre-line ${isUserTitle ? 'text-neutral-900 font-bold text-base' : 'text-neutral-700'}`}>
                                                {displayContent}
                                            </p>
                                        ) : (
                                            <p className="line-clamp-6 select-none leading-relaxed text-sm text-neutral-500 italic">
                                                {note.messages?.length ? 'Generating summary…' : 'Empty note. Double-click to chat.'}
                                            </p>
                                        )
                                    )}
                                    {/* Fade out effect at bottom - only if not editing */}
                                    {!isEditingTitle && (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--note-bg,white)] to-transparent" />
                                    )}
                                </div>

                                {/* Footer: Rounds Count */}
                                <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-neutral-500/80">
                                    <span className="tabular-nums">{new Date(note.createdAt).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-1 font-medium text-neutral-600/90">
                                        <MessageSquare size={10} />
                                        <span>{Math.ceil((note.messages?.length || 0) / 2)} rounds</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Chat History */}
                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 mb-2 pr-1 custom-scrollbar">
                                    {note.messages?.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm relative group ${msg.role === 'user'
                                                ? 'bg-neutral-900 text-white'
                                                : 'bg-white/80 border border-neutral-200 text-neutral-800'
                                                }`}>
                                                {/* Fork Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onFork && onFork(note.id, msg);
                                                    }}
                                                    disabled={readOnly}
                                                    className={`absolute -top-2 ${msg.role === 'user' ? '-left-2' : '-right-2'} p-1.5 rounded-full shadow-sm 
                                            opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity 
                                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 
                                            ${readOnly ? 'hidden' : ''}
                                            ${msg.role === 'user' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-800'}
                                        `}
                                                    title="Fork to new note"
                                                    aria-label="Fork this message to a new note"
                                                >
                                                    <GitBranch size={12} />
                                                </button>
                                                {msg.role === 'user' ? (
                                                    msg.content
                                                ) : (
                                                    <div
                                                        className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-neutral-100 prose-pre:p-2 prose-pre:rounded"
                                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(msg.content)) }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Input - Hide if Read Only */}
                                {!readOnly && (
                                    <div className="mt-auto pt-2 border-t border-black/5">
                                        <input
                                            ref={chatInputRef}
                                            autoFocus
                                            className="ui-input bg-white/60 border-transparent focus-visible:ring-yellow-500/50 focus-visible:ring-offset-0"
                                            placeholder="Type a message..."
                                            aria-label="Type a message"
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                    const text = e.target.value;
                                                    e.target.value = '';

                                                    // Add User Message
                                                    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
                                                    const newMessages = [...(note.messages || []), userMsg];
                                                    onUpdate(note.id, { messages: newMessages });

                                                    // Add AI Placeholder
                                                    const aiMsgId = Date.now() + 1;
                                                    const aiMsg = { role: 'assistant', content: '...', timestamp: aiMsgId };
                                                    const messagesWithAi = [...newMessages, aiMsg];
                                                    onUpdate(note.id, { messages: messagesWithAi });

                                                    try {
                                                        const provider = createAIProvider(settings);
                                                        let fullContent = '';

                                                        await provider.generateStream(newMessages, (chunk) => {
                                                            fullContent += chunk;
                                                            const updatedAiMsg = { ...aiMsg, content: fullContent };
                                                            const updatedMessages = [...newMessages, updatedAiMsg];
                                                            onUpdate(note.id, { messages: updatedMessages });
                                                        });

                                                        // Auto-summary (Run AFTER chat is done to avoid resource contention)
                                                        // Only run if NO manual title is set
                                                        if (!note.title && (!note.summary || !note.summary.trim()) && newMessages.length === 1) {
                                                            try {
                                                                // Use a fresh provider instance just in case
                                                                const summaryProvider = createAIProvider(settings);
                                                                const summaryPrompt = [
                                                                    {
                                                                        role: 'system',
                                                                        content:
                                                                            'Write a concise summary in 2-3 short lines. No markdown, no bullets, no quotes. Return ONLY the summary.'
                                                                    },
                                                                    { role: 'user', content: `User: ${text}\n\nAssistant: ${fullContent}` }
                                                                ];

                                                                let generatedSummary = '';
                                                                await summaryProvider.generateStream(summaryPrompt, (chunk) => {
                                                                    generatedSummary += chunk;
                                                                });

                                                                if (generatedSummary.trim()) {
                                                                    onUpdate(note.id, { summary: generatedSummary.trim() });
                                                                }
                                                            } catch (err) {
                                                                console.warn('Auto-summary failed:', err);
                                                            }
                                                        }
                                                    } catch (err) {
                                                        const errorMsg = { ...aiMsg, content: `Error: ${err.message}` };
                                                        onUpdate(note.id, { messages: [...newMessages, errorMsg] });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </MotionDiv >
        </>
    );
});

export default StickyNote;
