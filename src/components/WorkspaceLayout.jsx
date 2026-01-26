import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import SettingsModal from './SettingsModal';
import ManifestoModal from './ManifestoModal';
import { Plus, Layout, Trash2, Edit2, Check, X, Settings, BookOpen } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function WorkspaceLayout({ children }) {
    const { workspaces, currentWorkspaceId, addWorkspace, switchWorkspace, deleteWorkspace, updateWorkspaceName } = useStore();
    const [isEditing, setIsEditing] = useState(null);
    const [editName, setEditName] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showManifesto, setShowManifesto] = useState(false);

    const handleCreate = () => {
        const name = prompt('Enter workspace name:');
        if (name) addWorkspace(name);
    };

    const startEdit = (w) => {
        setIsEditing(w.id);
        setEditName(w.name);
    };

    const saveEdit = (id) => {
        if (editName.trim()) {
            updateWorkspaceName(id, editName.trim());
        }
        setIsEditing(null);
    };

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-72 ui-sidebar flex flex-col">
                <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between font-semibold">
                    <div className="flex items-center gap-2 select-none cursor-pointer" onClick={() => setShowManifesto(true)}>
                        <Layout size={20} />
                        <span>Project Nodal</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={() => setShowManifesto(true)}
                            className="ui-icon-btn"
                            aria-label="Read Manifesto"
                            title="Manifesto"
                        >
                            <BookOpen size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowSettings(true)}
                            className="ui-icon-btn"
                            aria-label="Open settings"
                            title="Settings"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
                    {workspaces.map(w => (
                        <div
                            key={w.id}
                            className={`group flex items-center justify-between gap-2 px-3 py-2 mx-3 rounded-xl transition-colors ${w.id === currentWorkspaceId ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            {isEditing === w.id ? (
                                <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                    <input
                                        className="ui-input"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveEdit(w.id);
                                            if (e.key === 'Escape') setIsEditing(null);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => saveEdit(w.id)}
                                        className="ui-icon-btn"
                                        aria-label="Save workspace name"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(null)}
                                        className="ui-icon-btn"
                                        aria-label="Cancel rename"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => switchWorkspace(w.id)}
                                        className="ui-nav-btn truncate text-sm flex-1 text-left rounded-lg px-2 py-1 -ml-2"
                                        aria-current={w.id === currentWorkspaceId ? 'page' : undefined}
                                    >
                                        {w.name}
                                    </button>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); startEdit(w); }}
                                            className="ui-icon-btn"
                                            aria-label={`Rename ${w.name}`}
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Delete "${w.name}"?`)) deleteWorkspace(w.id);
                                            }}
                                            className="ui-icon-btn ui-icon-btn-danger"
                                            aria-label={`Delete ${w.name}`}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-black/5 dark:border-white/10">
                    <button
                        type="button"
                        onClick={handleCreate}
                        className="w-full ui-btn ui-btn-secondary"
                    >
                        <Plus size={16} /> New Workspace
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative bg-[rgb(var(--ui-bg))]">
                {children}
            </div>

            {/* Modals */}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
            {showManifesto && <ManifestoModal onClose={() => setShowManifesto(false)} />}
        </div>
    );
}
