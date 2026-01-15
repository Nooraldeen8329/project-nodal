import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Settings, Link as LinkIcon, Trash2, Image as ImageIcon, Maximize2, X, ExternalLink, Download } from "lucide-react";

/**
 * Canvas + Sticky Chatbot — React MVP Prototype (V1)
 * --------------------------------------------------
 * Design goals (from spec):
 *  - Infinite canvas with changeable background image
 *  - Double-click empty space to add a sticky note
 *  - Sticky note = conversation container (collapsed = small card with cover/title)
 *  - Click note to expand a floating chat window anchored near the note
 *  - Notes can be freely dragged around the canvas
 *  - Manual links between notes (no AI semantics)
 *  - Local persistence (privacy-first): everything saved to localStorage
 *  - Lightweight UX, no cross-note AI context and no auto semantics
 *
 *  This single-file React component is production-ready enough for a demo/MVP.
 *  It uses Tailwind utility classes for styling.
 */

// ---------- Types & constants
const NOTE_W = 220; // collapsed width
const NOTE_H = 100; // collapsed height
const GRID_SIZE = 24; // grid size for optional snapping

/** @typedef {{ id: string, x: number, y: number, title: string, cover: string, messages: ChatMsg[], color: string }} Note */
/** @typedef {{ id: string, fromId: string, toId: string, label?: string }} NoteLink */
/** @typedef {{ id: string, role: 'user' | 'ai', content: string, ts: number }} ChatMsg */
/** @typedef {{ id: string, name: string, background?: string | null, notes: Note[], links: NoteLink[] }} CanvasModel */

// ---------- Helpers
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();
const LS_KEY = "canvas_sticky_chatbot_v1";

function loadState() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveState(state) { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }

// Random soft note color
const NOTE_COLORS = [
  "bg-yellow-100 border-yellow-300",
  "bg-emerald-100 border-emerald-300",
  "bg-sky-100 border-sky-300",
  "bg-rose-100 border-rose-300",
  "bg-purple-100 border-purple-300",
  "bg-orange-100 border-orange-300",
];
const pickColor = () => NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

// ---------- Root App
export default function App() {
  const initial = useMemo(() => {
    const saved = loadState();
    if (saved) return saved;
    const canvasId = uid();
    const defaultCanvas = /** @type {CanvasModel} */({ id: canvasId, name: "Untitled Canvas", background: null, notes: [], links: [] });
    return { canvases: [defaultCanvas], currentCanvasId: canvasId };
  }, []);

  const [model, setModel] = useState(initial);
  const currentCanvas = useMemo(
    () => model.canvases.find((c) => c.id === model.currentCanvasId),
    [model]
  );

  // viewport (pan & zoom)
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 0, y: 0 }); // pan offset
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const originStartRef = useRef({ x: 0, y: 0 });

  // layout helpers
  const [snap, setSnap] = useState(false);

  // linking mode
  const [linkMode, setLinkMode] = useState(false);
  const [linkStartId, setLinkStartId] = useState(null);

  // chat window state
  const [openChatFor, setOpenChatFor] = useState(null); // note id

  // search
  const [query, setQuery] = useState("");

  // background file input
  const fileInputRef = useRef(null);

  useEffect(() => saveState(model), [model]);

  // ---------- Canvas actions
  const canvasRef = useRef(null);
  const toCanvas = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = (clientX - (rect?.left ?? 0) - origin.x) / scale;
    const y = (clientY - (rect?.top ?? 0) - origin.y) / scale;
    return { x, y };
  };

  const snapXY = (x, y) => {
    if (!snap) return { x, y };
    const sx = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const sy = Math.round(y / GRID_SIZE) * GRID_SIZE;
    return { x: sx, y: sy };
  };

  const addNoteAt = (x, y) => {
    const p = snapXY(x, y);
    const n = /** @type {Note} */({
      id: uid(),
      x: p.x - NOTE_W / 2,
      y: p.y - NOTE_H / 2,
      title: "未命名便签",
      cover: "（点击编辑封面或从对话引用一段）",
      color: pickColor(),
      messages: [
        { id: uid(), role: "ai", content: "这里将显示与 LLM 的对话（暂为占位）。", ts: now() },
      ],
    });
    updateCanvas({ notes: [...currentCanvas.notes, n] });
  };

  const updateCanvas = (patch) => {
    setModel((m) => ({
      ...m,
      canvases: m.canvases.map((c) => (c.id === m.currentCanvasId ? { ...c, ...patch } : c)),
    }));
  };

  const removeNote = (id) => {
    updateCanvas({
      notes: currentCanvas.notes.filter((n) => n.id !== id),
      links: currentCanvas.links.filter((l) => l.fromId !== id && l.toId !== id),
    });
    if (openChatFor === id) setOpenChatFor(null);
  };

  const startOrFinishLink = (id) => {
    if (!linkMode) return;
    if (!linkStartId) {
      setLinkStartId(id);
    } else if (linkStartId && linkStartId !== id) {
      const newLink = /** @type {NoteLink} */({ id: uid(), fromId: linkStartId, toId: id });
      updateCanvas({ links: [...currentCanvas.links, newLink] });
      setLinkStartId(null);
      setLinkMode(false);
    }
  };

  // ---------- Canvas & toolbar handlers
  const onWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.05 : 0.95;
    const mouse = toCanvas(e.clientX, e.clientY);

    const newScale = Math.min(2.5, Math.max(0.3, scale * factor));
    const pre = { x: mouse.x * scale + origin.x, y: mouse.y * scale + origin.y };
    const post = { x: mouse.x * newScale, y: mouse.y * newScale };

    setOrigin({ x: pre.x - post.x, y: pre.y - post.y });
    setScale(newScale);
  };

  const onMouseDown = (e) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      originStartRef.current = { ...origin };
    }
  };
  const onMouseMove = (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setOrigin({ x: originStartRef.current.x + dx, y: originStartRef.current.y + dy });
  };
  const onMouseUp = () => setIsPanning(false);

  const onDblClick = (e) => {
    // Allow double-click anywhere on the canvas stage except on notes or chat windows
    const el = /** @type {HTMLElement} */(e.target);
    if (el.closest('[data-node]') || el.closest('[data-chat-window]')) return;
    const p = toCanvas(e.clientX, e.clientY);
    addNoteAt(p.x, p.y);
  };

  // ---------- Canvas management
  const createCanvas = () => {
    const id = uid();
    const name = `Canvas ${model.canvases.length + 1}`;
    const c = /** @type {CanvasModel} */({ id, name, background: null, notes: [], links: [] });
    setModel((m) => ({ ...m, canvases: [...m.canvases, c], currentCanvasId: id }));
    setScale(1);
    setOrigin({ x: 0, y: 0 });
  };
  const renameCanvas = () => {
    const name = prompt("重命名画布：", currentCanvas?.name || "");
    if (!name) return;
    updateCanvas({ name });
  };
  const deleteCanvas = () => {
    if (!confirm("删除当前画布？此操作不可撤销")) return;
    setModel((m) => {
      const rest = m.canvases.filter((c) => c.id !== m.currentCanvasId);
      const fallback = rest[0] ?? { id: uid(), name: "Canvas 1", background: null, notes: [], links: [] };
      return { canvases: rest.length ? rest : [fallback], currentCanvasId: rest.length ? rest[0].id : fallback.id };
    });
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-sticky-chat-${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.canvases && data?.currentCanvasId) setModel(data);
        else alert("无效的导入文件。");
      } catch { alert("解析失败。"); }
    };
    reader.readAsText(file);
  };

  const onPickBackground = (file) => {
    const reader = new FileReader();
    reader.onload = () => updateCanvas({ background: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const filteredNotes = useMemo(() => {
    if (!query) return currentCanvas?.notes ?? [];
    const q = query.toLowerCase();
    return (currentCanvas?.notes ?? []).filter(
      (n) => n.title.toLowerCase().includes(q) || n.cover.toLowerCase().includes(q)
    );
  }, [currentCanvas, query]);

  if (!currentCanvas) return <div className="p-6">初始化中…</div>;

  return (
    <div className="w-full h-full fixed inset-0 bg-neutral-50 text-neutral-900 select-none">
      {/* Toolbar */}
      <div className="h-12 px-3 flex items-center gap-2 border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <button onClick={createCanvas} className="px-2.5 py-1.5 rounded-xl bg-neutral-900 text-white flex items-center gap-1 shadow">
          <Plus size={16}/> 新建画布
        </button>

        <div className="flex items-center gap-2 ml-2">
          <label className="text-sm text-neutral-500">当前：</label>
          <select
            className="px-2 py-1 rounded-lg border"
            value={model.currentCanvasId}
            onChange={(e) => setModel((m) => ({ ...m, currentCanvasId: e.target.value }))}
          >
            {model.canvases.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={renameCanvas} className="px-2 py-1 text-sm border rounded-lg">重命名</button>
          <button onClick={deleteCanvas} className="px-2 py-1 text-sm border rounded-lg text-rose-600">删除</button>
        </div>

        <div className="flex items-center gap-2 ml-6 flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5" size={16}/>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索便签（标题或封面）"
              className="w-full pl-8 pr-3 py-2 border rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLinkMode((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 ${linkMode ? 'bg-neutral-900 text-white' : ''}`}
            title="连线模式：点击一个便签作为起点，再点击另一个作为终点"
          >
            <LinkIcon size={16}/> 连线
          </button>

          <button
            onClick={() => setSnap((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1 ${snap ? 'bg-neutral-900 text-white' : ''}`}
            title="网格对齐开关（拖动或新建时吸附）"
          >
            {snap ? '对齐·开' : '对齐·关'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-xl border flex items-center gap-1"
            title="设置/更换背景图片"
          >
            <ImageIcon size={16}/> 背景
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPickBackground(e.target.files[0])}
          />

          <button onClick={exportJSON} className="px-2.5 py-1.5 rounded-xl border flex items-center gap-1" title="导出数据 JSON">
            <Download size={16}/> 导出
          </button>

          <label className="px-2.5 py-1.5 rounded-xl border cursor-pointer">
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])}/>
            导入
          </label>

          <button className="px-2.5 py-1.5 rounded-xl border flex items-center gap-1" title="设置（预留）">
            <Settings size={16}/> 设置
          </button>
        </div>
      </div>

      {/* Canvas Stage */}
      <div
        ref={canvasRef}
        className="absolute inset-0 overflow-hidden"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={onDblClick}
      >
        {/* Background layer */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: currentCanvas.background ? `url(${currentCanvas.background})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: currentCanvas.background ? "saturate(105%)" : undefined,
          }}
        />

        {/* World / transform layer */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0"
          style={{ transform: `translate(${origin.x}px, ${origin.y}px) scale(${scale})`, transformOrigin: "0 0" }}
        >
          {snap && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.06) 1px, transparent 1px)`,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              }}
            />
          )}
          {/* Links SVG */}
          <svg className="absolute top-0 left-0 w-[50000px] h-[50000px] pointer-events-none">
            {currentCanvas.links.map((l) => {
              const a = currentCanvas.notes.find((n) => n.id === l.fromId);
              const b = currentCanvas.notes.find((n) => n.id === l.toId);
              if (!a || !b) return null;
              const ax = a.x + NOTE_W / 2;
              const ay = a.y + NOTE_H / 2;
              const bx = b.x + NOTE_W / 2;
              const by = b.y + NOTE_H / 2;
              const path = `M ${ax} ${ay} L ${bx} ${by}`;
              return (
                <g key={l.id}>
                  <path d={path} stroke="#222" strokeOpacity={0.35} strokeWidth={2} fill="none" />
                </g>
              );
            })}
          </svg>

          {/* Notes */}
          {filteredNotes.map((n) => (
            <StickyNote
              key={n.id}
              note={n}
              lastAI={(n.messages.filter(m=>m.role==='ai').slice(-1)[0]?.content) || ''}
              highlighted={query && (n.title.includes(query) || n.cover.includes(query))}
              onDrag={(x, y) => {
                const p = snapXY(x, y);
                const patched = currentCanvas.notes.map((m) => (m.id === n.id ? { ...m, x: p.x, y: p.y } : m));
                updateCanvas({ notes: patched });
              }}
              onOpenChat={() => setOpenChatFor(n.id)}
              onRemove={() => removeNote(n.id)}
              onRename={(title) => {
                const patched = currentCanvas.notes.map((m) => (m.id === n.id ? { ...m, title } : m));
                updateCanvas({ notes: patched });
              }}
              onEditCover={(cover) => {
                const patched = currentCanvas.notes.map((m) => (m.id === n.id ? { ...m, cover } : m));
                updateCanvas({ notes: patched });
              }}
              onLink={() => startOrFinishLink(n.id)}
              linkMode={linkMode}
            />
          ))}
        </div>
      </div>

      {/* Chat Window */}
      {openChatFor && (
        <ChatWindow
          key={openChatFor}
          note={currentCanvas.notes.find((n) => n.id === openChatFor)}
          onClose={() => setOpenChatFor(null)}
          onUpdateNote={(patched) => {
            const notes = currentCanvas.notes.map((n) => (n.id === patched.id ? patched : n));
            updateCanvas({ notes });
          }}
        />)
      }
    </div>
  );
}

// ---------- Sticky Note (collapsed)
function StickyNote({ note, lastAI, highlighted, onDrag, onOpenChat, onRemove, onRename, onEditCover, onLink, linkMode }) {
  const [dragging, setDragging] = useState(false);
  const grabRef = useRef({ x: 0, y: 0 });
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0 });

  const onMouseDown = (e) => {
    e.stopPropagation();
    setDragging(true);
    grabRef.current = { x: e.clientX - note.x, y: e.clientY - note.y };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const nx = e.clientX - grabRef.current.x;
    const ny = e.clientY - grabRef.current.y;
    onDrag(nx, ny);
  };
  const onUp = () => {
    setDragging(false);
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  const editTitle = () => {
    const t = prompt("便签标题：", note.title);
    if (t != null) onRename(t.trim());
  };
  const editCover = () => {
    const c = prompt("编辑封面摘要：", note.cover);
    if (c != null) onEditCover(c.trim());
  };

  return (
    <>
      <div
        data-node="1"
        className={`absolute shadow-sm border ${note.color} rounded-2xl hover:shadow-md transition-shadow ${highlighted ? 'ring-2 ring-amber-400' : ''}`}
        style={{ left: note.x, top: note.y, width: NOTE_W, height: NOTE_H }}
        onDoubleClick={(e) => { e.stopPropagation(); onOpenChat(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setMenu({ open: true, x: e.clientX, y: e.clientY }); }}
      >
        <div className="h-8 px-3 rounded-t-2xl flex items-center justify-between cursor-move" onMouseDown={onMouseDown}>
          <div className="font-medium text-sm truncate" title={note.title}>{note.title || "未命名便签"}</div>
          <div className="flex items-center gap-1 opacity-70">
            <button className="p-1 hover:opacity-100" title="连线" onClick={(e) => { e.stopPropagation(); onLink(); }}>{linkMode ? <Maximize2 size={14}/> : <LinkIcon size={14}/>}</button>
            <button className="p-1 hover:opacity-100" title="编辑标题" onClick={(e) => { e.stopPropagation(); editTitle(); }}><ExternalLink size={14}/></button>
            <button className="p-1 hover:opacity-100" title="删除" onClick={(e) => { e.stopPropagation(); onRemove(); }}><Trash2 size={14}/></button>
          </div>
        </div>
        <div className="px-3 py-2 text-[13px] leading-snug line-clamp-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpenChat(); }} title="点击打开对话">
          {note.cover || "（点击编辑封面）"}
        </div>
        <div className="absolute bottom-2 right-3 text-xs opacity-60 flex gap-2">
          <button className="underline" onClick={(e) => { e.stopPropagation(); editCover(); }}>编辑封面</button>
          <button className="underline" onClick={(e) => { e.stopPropagation(); onOpenChat(); }}>打开</button>
        </div>
      </div>

      {menu.open && (
        <div className="fixed z-[200] bg-white border shadow-xl rounded-xl text-sm"
             style={{ left: menu.x, top: menu.y }}
             onMouseDown={(e)=> e.stopPropagation()}
             onContextMenu={(e)=> e.preventDefault()}>
          <div className="px-3 py-2 hover:bg-neutral-100 cursor-pointer" onClick={()=>{ setMenu({open:false,x:0,y:0}); onOpenChat(); }}>打开对话</div>
          <div className="px-3 py-2 hover:bg-neutral-100 cursor-pointer" onClick={()=>{ setMenu({open:false,x:0,y:0}); onRename(prompt('便签标题：', note.title) ?? note.title); }}>重命名</div>
          <div className="px-3 py-2 hover:bg-neutral-100 cursor-pointer" onClick={()=>{ setMenu({open:false,x:0,y:0}); onEditCover(prompt('编辑封面摘要：', note.cover) ?? note.cover); }}>编辑封面</div>
          <div className="px-3 py-2 hover:bg-neutral-100 cursor-pointer" onClick={()=>{ setMenu({open:false,x:0,y:0}); if(lastAI) onEditCover(lastAI.slice(0,140)); }}>用最新AI回复设为封面</div>
          <div className="px-3 py-2 hover:bg-neutral-100 cursor-pointer" onClick={()=>{ setMenu({open:false,x:0,y:0}); onLink(); }}>开始/完成连线</div>
          <div className="px-3 py-2 text-rose-600 hover:bg-neutral-100 cursor-pointer" onClick={()=>{ setMenu({open:false,x:0,y:0}); onRemove(); }}>删除</div>
        </div>
      )}
    </>
  );
}

// ---------- Chat Window (floating, simple)
function ChatWindow({ note, onClose, onUpdateNote }) {
  const [input, setInput] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
  }, [note.messages.length]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { id: uid(), role: "user", content: text, ts: now() };
    const aiMsg = { id: uid(), role: "ai", content: mockAI(text), ts: now() }; // placeholder
    const patched = { ...note, messages: [...note.messages, userMsg, aiMsg] };
    onUpdateNote(patched);
    setInput("");
  };

  const setAsCover = (content) => {
    onUpdateNote({ ...note, cover: content.slice(0, 140) });
  };

  return (
    <div data-chat-window className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(900px,96vw)] h-[60vh] bg-white rounded-2xl shadow-2xl border flex flex-col z-[100]">
      <div className="h-12 px-4 flex items-center justify-between border-b">
        <div className="font-semibold truncate">🗒️ {note.title}</div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-sm border rounded-lg" onClick={() => setAsCover(smartSumm(note))}>从对话智能摘取封面</button>
          <button className="p-2 hover:bg-neutral-100 rounded-xl" onClick={onClose} title="关闭"><X size={18}/></button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-3 bg-neutral-50">
        {note.messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border ${m.role === 'user' ? 'ml-auto bg-amber-50 border-amber-200' : 'mr-auto bg-white border-neutral-200'}`}>
            <div className="text-[12px] opacity-60 mb-0.5">{m.role === 'user' ? '你' : 'AI'}</div>
            <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.content}</div>
            <div className="text-[12px] opacity-60 mt-1 flex items-center gap-3">
              <button className="underline" onClick={() => setAsCover(m.content)}>设为封面</button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4 flex gap-2">
        <textarea
          className="flex-1 border rounded-xl px-3 py-2 resize-none text-[14px]"
          rows={2}
          placeholder="输入消息...（按 Enter 发送，Shift+Enter 换行）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={send} className="px-5 py-2 rounded-xl bg-neutral-900 text-white shadow">发送</button>
      </div>
    </div>
  );
}

// ---------- Mock AI (placeholder logic)
function mockAI(userInput) {
  // TODO: Replace with actual API integration.
  return `（占位回复）你说了：“${userInput}”`;
}

// ---------- Smart summary for setting cover
function smartSumm(note) {
  const aiReplies = note.messages.filter(m => m.role === "ai").map(m => m.content);
  const joined = aiReplies.join(" ").slice(0, 140);
  return joined || "暂无可用摘要";
}

/* ------------------
   Dev Sanity Tests
   ------------------ */
if (typeof window !== 'undefined') {
  try {
    (function runSanityTests() {
      const makeNote = (msgs) => ({ messages: msgs });

      // smartSumm: empty
      console.assert(smartSumm(makeNote([])) === "暂无可用摘要", 'smartSumm should return fallback when no AI replies');

      // smartSumm: basic
      const n2 = makeNote([{ id: '1', role: 'ai', content: 'Hello World', ts: Date.now() }]);
      console.assert(smartSumm(n2).startsWith('Hello'), 'smartSumm should include AI reply');

      // smartSumm: truncation to 140
      const long = 'a'.repeat(200);
      const n3 = makeNote([{ id: '2', role: 'ai', content: long, ts: Date.now() }]);
      console.assert(smartSumm(n3).length === 140, 'smartSumm should truncate to 140 chars');

      // add more tests here if needed
    })();
  } catch (e) {
    console.warn('Sanity tests failed:', e);
  }
}
