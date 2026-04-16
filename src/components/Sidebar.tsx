import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Download, Copy, Pencil, ChevronDown, FileUp } from 'lucide-react';
import { useSession, getCanvasSize } from '../store/session';
import { PLATFORM_LIST, PLATFORMS, type Platform } from '../lib/platforms';
import { importJSON } from '../lib/export';

type Props = {
  onExport: (id: string) => void;
};

type Mode = 'closed' | 'menu' | 'platforms';

export function Sidebar({ onExport }: Props) {
  const screenshots = useSession((s) => s.screenshots);
  const activeId = useSession((s) => s.activeId);
  const add = useSession((s) => s.addScreenshot);
  const dup = useSession((s) => s.duplicateScreenshot);
  const remove = useSession((s) => s.removeScreenshot);
  const setActive = useSession((s) => s.setActive);
  const rename = useSession((s) => s.renameScreenshot);
  const importScreens = useSession((s) => s.importJSON);
  const [mode, setMode] = useState<Mode>('closed');
  const menuRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode !== 'menu') return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMode('closed');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [mode]);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const items = await importJSON(f);
      importScreens(items);
      setMode('closed');
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  return (
    <aside className="w-64 shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="text-sm font-medium">Screenshots</div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() =>
              setMode((m) => (m === 'closed' ? 'menu' : 'closed'))
            }
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1 text-xs"
          >
            <Plus size={12} /> New <ChevronDown size={12} />
          </button>
          {mode === 'menu' && (
            <div className="absolute right-0 mt-1 w-40 bg-neutral-900 border border-neutral-800 rounded shadow-lg z-10 py-1">
              <button
                onClick={() => setMode('platforms')}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-800 flex items-center gap-2"
              >
                <Plus size={12} /> New screenshot
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-800 flex items-center gap-2"
              >
                <FileUp size={12} /> Import JSON
              </button>
            </div>
          )}
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onImport}
        />
      </div>

      {mode === 'platforms' && (
        <div className="p-2 border-b border-neutral-800 grid grid-cols-1 gap-1">
          {PLATFORM_LIST.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                add(p.id as Platform);
                setMode('closed');
              }}
              className="text-left bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2 py-1.5 text-xs flex items-center justify-between"
            >
              <span>{p.label}</span>
              <span className="text-neutral-500 font-mono">
                {p.width}×{p.height}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {screenshots.length === 0 ? (
          <div className="p-4 text-xs text-neutral-500">
            No screenshots yet. Click <span className="text-neutral-300">+ New</span> to start.
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {screenshots.map((s) => {
              const spec = PLATFORMS[s.platform];
              const size = getCanvasSize(s);
              const isActive = s.id === activeId;
              return (
                <li
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`group rounded border cursor-pointer ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900'
                  }`}
                >
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-2">
                      <EditableName
                        value={s.name}
                        onCommit={(next) => rename(s.id, next)}
                      />
                      <span className="text-[10px] text-neutral-500 uppercase">{spec.label}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {size.width}×{size.height}
                    </div>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExport(s.id);
                        }}
                        title="Export PNG"
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
                      >
                        <Download size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dup(s.id);
                        }}
                        title="Duplicate"
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${s.name}"?`)) remove(s.id);
                        }}
                        title="Delete"
                        className="p-1 rounded hover:bg-neutral-800 text-red-400 ml-auto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="p-2 text-[10px] text-neutral-600 border-t border-neutral-800">
        {screenshots.length} screenshot{screenshots.length === 1 ? '' : 's'}
      </div>
    </aside>
  );
}

function EditableName({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, value]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onCommit(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:border-blue-500"
      />
    );
  }

  return (
    <div className="flex-1 flex items-center gap-1 min-w-0">
      <span className="text-sm truncate">{value}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="Rename"
        className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}
