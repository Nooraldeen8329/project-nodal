import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { X, Save } from 'lucide-react';
import { AI_PROVIDERS } from '../services/ai_provider';

export default function SettingsModal({ onClose }) {
    const { settings, updateSettings } = useStore();
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    const handleChange = (key, value) => {
        updateSettings({ [key]: value });
    };

    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement;
        closeButtonRef.current?.focus?.();

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== 'Tab') return;
            const root = dialogRef.current;
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

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocusedRef.current?.focus?.();
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
                className="ui-panel-solid w-[520px] max-w-[92vw] overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 id="settings-title" className="font-semibold text-lg text-neutral-900">Settings</h2>
                        <p className="text-xs text-neutral-500 mt-0.5">AI provider and local preferences.</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="ui-icon-btn"
                        aria-label="Close settings"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-800">AI Provider</label>
                        <div className="flex gap-2 ui-panel-solid p-1">
                            {Object.values(AI_PROVIDERS).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handleChange('provider', p)}
                                    className={`ui-btn flex-1 justify-center py-2 ${settings.provider === p
                                            ? 'ui-btn-primary'
                                            : 'ui-btn-ghost'
                                        }`}
                                    aria-pressed={settings.provider === p}
                                >
                                    {p === 'ollama' ? 'Ollama' : 'OpenAI'}
                                    <span className={`ml-1 text-xs font-normal ${settings.provider === p ? 'text-white/80' : 'text-neutral-500'}`}>
                                        {p === 'ollama' ? 'Local' : 'Cloud'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Configuration Fields */}
                    {settings.provider === AI_PROVIDERS.OLLAMA && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                                <label htmlFor="settings-base-url" className="text-sm font-medium text-neutral-800">Base URL</label>
                                <input
                                    id="settings-base-url"
                                    type="text"
                                    value={settings.baseUrl}
                                    onChange={(e) => handleChange('baseUrl', e.target.value)}
                                    className="ui-input"
                                    placeholder="http://localhost:11434"
                                />
                                <p className="text-xs text-neutral-500">Default: <span className="font-mono">http://localhost:11434</span></p>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="settings-ollama-model" className="text-sm font-medium text-neutral-800">Model Name</label>
                                <input
                                    id="settings-ollama-model"
                                    type="text"
                                    value={settings.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    className="ui-input"
                                    placeholder="llama3"
                                />
                                <p className="text-xs text-neutral-500">e.g., llama3, mistral, phi3</p>
                            </div>
                        </div>
                    )}

                    {settings.provider === AI_PROVIDERS.OPENAI && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-1">
                                <label htmlFor="settings-openai-api-key" className="text-sm font-medium text-neutral-800">API Key</label>
                                <input
                                    id="settings-openai-api-key"
                                    type="password"
                                    value={settings.apiKey}
                                    onChange={(e) => handleChange('apiKey', e.target.value)}
                                    className="ui-input"
                                    placeholder="sk-..."
                                />
                                <p className="text-xs text-neutral-500">Stored locally in your browser.</p>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="settings-openai-model" className="text-sm font-medium text-neutral-800">Model Name</label>
                                <input
                                    id="settings-openai-model"
                                    type="text"
                                    value={settings.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    className="ui-input"
                                    placeholder="gpt-4o"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                    <div className="text-xs text-neutral-500">
                        Press <span className="ui-kbd">Esc</span> to close
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ui-btn ui-btn-primary"
                    >
                        <Save size={16} /> Close
                    </button>
                </div>
            </div>
        </div>
    );
}
