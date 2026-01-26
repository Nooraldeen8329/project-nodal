import React from 'react';
import { X, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import manifestoContent from '../../README.md?raw';

export default function ManifestoModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div
                className="bg-white dark:bg-neutral-900 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-black/10 dark:border-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20">
                    <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-100 font-semibold text-lg">
                        <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
                        <span>Manifesto</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-neutral-900">
                    <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-p:leading-relaxed prose-li:marker:text-blue-500">
                        <ReactMarkdown>
                            {manifestoContent}
                        </ReactMarkdown>
                    </article>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-black/5 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-center text-sm text-neutral-500">
                    Project Nodal — The Spatial Thinking OS
                </div>
            </div>
        </div>
    );
}
