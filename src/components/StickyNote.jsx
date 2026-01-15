import React, { useState, useRef, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion } from 'framer-motion';
import { X, Maximize2, Minimize2, MessageSquare, GitBranch } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useStore } from '../store/useStore';
import { createAIProvider } from '../services/ai_provider';

const MotionDiv = motion.div;

function getSummaryFirstLine(note) {
    const summary = typeof note?.summary === 'string' ? note.summary.trim() : '';
    if (!summary) return '';
    const firstLine = summary.split('\n').map(s => s.trim()).find(Boolean) || '';
    return firstLine;
}

function formatSummaryForCard(note) {
    const summary = typeof note?.summary === 'string' ? note.summary.trim() : '';
    if (summary) return summary.replace(/\s+\n\s+/g, '\n').replace(/[ \t]{2,}/g, ' ');
    return '';
}

export default function StickyNote({
    note,
    onUpdate,
    onDelete,
    isSelected,
    onSelect,
    isExpanded,
    onExpand,
    onCollapse,
    viewport,
    bounds,
    onFork,
    onDragMove,
    variant = 'canvas'
}) {
    const isModal = variant === 'modal';
    // const [isExpanded, setIsExpanded] = useState(note.isExpanded || false); // Removed local state
    const [isDragging, setIsDragging] = useState(false);
    const [ghostPosition, setGhostPosition] = useState(note.position);
    const { settings } = useStore();
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if (isDragging) return;
        setGhostPosition(note.position);
    }, [isDragging, note.position]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [note.messages, isExpanded]);

    const bind = useDrag(({ delta: [dx, dy], first, last, memo }) => {
        // Initialize memo with current note position on start
        if (first) {
            memo = { x: note.position.x, y: note.position.y };
            setIsDragging(true);
            setGhostPosition({ x: note.position.x, y: note.position.y });
        }

        // Calculate new position in world coordinates
        let newX = memo.x + (dx / viewport.zoom);
        let newY = memo.y + (dy / viewport.zoom);

        // Clamp to bounds if provided
        if (bounds) {
            // Use actual rendered dimensions for strict containment
            const currentWidth = isExpanded ? 400 : 200;
            const currentHeight = isExpanded ? 500 : 200;

            // Strict containment: Note must be fully inside the board
            newX = Math.max(0, Math.min(newX, bounds.width - currentWidth));
            newY = Math.max(0, Math.min(newY, bounds.height - currentHeight));
        }

        setGhostPosition({ x: newX, y: newY });
        onDragMove?.(note.id, { x: newX, y: newY }, { first, last });

        if (last) {
            setIsDragging(false);
            onUpdate(note.id, { position: { x: newX, y: newY } });
        }

        return { x: newX, y: newY };
    }, {
        pointer: { keys: false },
        filterTaps: true,
        enabled: !isModal // Disable drag in modal mode
    });

    // Removed local toggleExpand, using props directly

    return (
        <>
            {/* Actual Note */}
            <MotionDiv
                initial={isModal ? { opacity: 0, scale: 0.9 } : false}
                {...bind()}
                onClick={(e) => { e.stopPropagation(); !isModal && onSelect(note.id); }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isModal) onExpand();
                }}
                onKeyDown={(e) => {
                    if (isModal) return;
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(note.id);
                    if (e.key === 'Enter') onExpand();
                }}
                exit={isModal ? { opacity: 0, scale: 0.9 } : null}
                animate={isModal ? { opacity: 1, scale: 1 } : {
                    x: isDragging ? ghostPosition.x : note.position.x,
                    y: isDragging ? ghostPosition.y : note.position.y,
                    width: 200,
                    height: 200,
                    zIndex: isSelected ? 50 : 30,
                    opacity: 1
                }}
                transition={isDragging ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                className={`
                    ${isModal ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[82vh] z-50 shadow-[0_28px_120px_rgba(15,23,42,0.32)]' : 'absolute left-0 top-0 rounded-2xl shadow-[0_16px_60px_rgba(15,23,42,0.16)]'}
                    ${!isModal ? 'group relative' : ''}
                    flex flex-col overflow-hidden border
                    ${!isModal && isSelected ? 'border-blue-500/70' : 'border-black/10'}
                    ${!isModal && isDragging ? 'ring-2 ring-blue-500/20' : ''}
                    ${!isModal ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white' : ''}
                `}
                style={{
                    backgroundColor: note.color || '#fef3c7',
                    '--note-bg': note.color || '#fef3c7'
                }}
                data-note-id={note.id}
                role={!isModal ? 'button' : undefined}
                tabIndex={!isModal ? 0 : -1}
                aria-label={!isModal ? `Open note: ${getSummaryFirstLine(note) || 'Note'}` : undefined}
            >
                {isModal ? (
                    <div
                        className="flex items-center justify-between px-3 py-2 bg-white/65 backdrop-blur border-b border-black/5 select-none"
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onCollapse();
                        }}
                    >
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 truncate flex-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-black/5">
                                <MessageSquare size={14} />
                            </span>
                            <span className="truncate text-sm">{getSummaryFirstLine(note) || 'Note'}</span>
                        </div>
                        <div className="flex items-center gap-1">
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
                            <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                                className="ui-icon-btn ui-icon-btn-danger"
                                aria-label="Delete note"
                            >
                                <X size={12} />
                            </button>
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
                            onClick={(e) => { e.stopPropagation(); onExpand(); }}
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
                            {/* Summary Preview */}
                            <div className="flex-1 overflow-hidden relative">
                                {formatSummaryForCard(note) ? (
                                    <p className="line-clamp-3 select-none leading-relaxed text-sm text-neutral-900 whitespace-pre-line">
                                        {formatSummaryForCard(note)}
                                    </p>
                                ) : (
                                    <p className="line-clamp-3 select-none leading-relaxed text-sm text-neutral-600">
                                        {note.messages?.length ? 'Generating summary…' : 'Empty note. Double-click to chat.'}
                                    </p>
                                )}
                                {/* Fade out effect at bottom */}
                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--note-bg,white)] to-transparent" />
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
                                                    onFork && onFork(msg);
                                                }}
                                                className={`absolute -top-2 ${msg.role === 'user' ? '-left-2' : '-right-2'} p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${msg.role === 'user' ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-800'}`}
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

                            {/* Input */}
                            <div className="mt-auto pt-2 border-t border-black/5">
                                <input
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
                                                if ((!note.summary || !note.summary.trim()) && newMessages.length === 1) {
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
                        </>
                    )}
                </div>
            </MotionDiv>
        </>
    );
}
