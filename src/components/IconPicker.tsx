import { useEffect, useMemo, useRef, useState } from 'react';
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';
import { Search, X } from 'lucide-react';

type Props = {
  initial?: string;
  onSelect: (name: string) => void;
  onClose: () => void;
};

export function IconPicker({ initial, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = iconNames as readonly string[];
    if (!q) return all;
    return all.filter((n) => n.includes(q));
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[640px] max-w-[92vw] h-[520px] max-h-[85vh] bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-3 border-b border-neutral-800">
          <Search size={14} className="text-neutral-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${iconNames.length} icons…`}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-neutral-600"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500">
              No icons match "{query}".
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1">
              {filtered.map((name) => {
                const active = name === initial;
                return (
                  <button
                    key={name}
                    onClick={() => onSelect(name)}
                    title={name}
                    className={`group flex flex-col items-center justify-center gap-1 p-2 rounded border text-[10px] ${
                      active
                        ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                        : 'border-transparent hover:border-neutral-700 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100'
                    }`}
                  >
                    <DynamicIcon name={name as IconName} size={22} />
                    <span className="truncate w-full text-center">{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-neutral-800 text-[10px] text-neutral-500 text-right">
          Showing {filtered.length} of {iconNames.length}
        </div>
      </div>
    </div>
  );
}
