import { useState } from 'react';
import { Plus, Trash2, Download, Copy } from 'lucide-react';
import { useSession } from '../store/session';
import { PLATFORM_LIST, PLATFORMS, type Platform } from '../lib/platforms';

type Props = {
  onExport: (id: string) => void;
};

export function Sidebar({ onExport }: Props) {
  const screenshots = useSession((s) => s.screenshots);
  const activeId = useSession((s) => s.activeId);
  const add = useSession((s) => s.addScreenshot);
  const dup = useSession((s) => s.duplicateScreenshot);
  const remove = useSession((s) => s.removeScreenshot);
  const setActive = useSession((s) => s.setActive);
  const rename = useSession((s) => s.renameScreenshot);
  const [adding, setAdding] = useState(false);

  return (
    <aside className="w-64 shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="text-sm font-medium">Screenshots</div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1 text-xs"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {adding && (
        <div className="p-2 border-b border-neutral-800 grid grid-cols-1 gap-1">
          {PLATFORM_LIST.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                add(p.id as Platform);
                setAdding(false);
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
            {screenshots.map((s, i) => {
              const spec = PLATFORMS[s.platform];
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
                      <input
                        value={s.name}
                        onChange={(e) => rename(s.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-sm focus:outline-none"
                      />
                      <span className="text-[10px] text-neutral-500 uppercase">{spec.label}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {spec.width}×{spec.height}
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
