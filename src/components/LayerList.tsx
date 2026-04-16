import { ChevronUp, ChevronDown, Trash2, Copy, Type, Image as ImageIcon, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useSession, type Screenshot } from '../store/session';
import { fileToDataURL, loadImageDimensions } from '../lib/file';
import { backgroundCSS } from '../lib/backgrounds';

export function LayerList({ screenshot }: { screenshot: Screenshot }) {
  const selection = useSession((s) => s.selection);
  const setSelection = useSession((s) => s.setSelection);
  const addTextLayer = useSession((s) => s.addTextLayer);
  const addImageLayer = useSession((s) => s.addImageLayer);
  const removeLayer = useSession((s) => s.removeLayer);
  const duplicateLayer = useSession((s) => s.duplicateLayer);
  const reorderLayer = useSession((s) => s.reorderLayer);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const f of files) {
      const dataUrl = await fileToDataURL(f);
      const { width, height } = await loadImageDimensions(dataUrl);
      addImageLayer(dataUrl, width, height);
    }
  }

  // Render top-most first (reverse of z-order which is array order)
  const ordered = [...screenshot.layers].reverse();

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-neutral-500">Layers</div>
        <div className="flex gap-1">
          <button
            onClick={addTextLayer}
            title="Add text"
            className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-1.5 py-1 text-[11px]"
          >
            <Type size={11} />
            Text
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            title="Add image"
            className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-1.5 py-1 text-[11px]"
          >
            <Upload size={11} />
            Image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFile}
          />
        </div>
      </div>

      <button
        onClick={() => setSelection({ kind: 'background' })}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs border mb-1 ${
          selection?.kind === 'background'
            ? 'bg-blue-500/10 border-blue-500'
            : 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900'
        }`}
      >
        <div
          className="w-4 h-4 rounded border border-neutral-700"
          style={{
            background: backgroundCSS(screenshot.background),
          }}
        />
        <span className="flex-1 text-left">Background</span>
      </button>

      {ordered.length === 0 ? (
        <div className="text-[11px] text-neutral-600 py-2">No layers yet.</div>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {ordered.map((l) => {
            const active = selection?.kind === 'layer' && selection.id === l.id;
            return (
              <li key={l.id}>
                <div
                  onClick={() => setSelection({ kind: 'layer', id: l.id })}
                  className={`group flex items-center gap-1.5 px-2 py-1.5 rounded text-xs border cursor-pointer ${
                    active
                      ? 'bg-blue-500/10 border-blue-500'
                      : 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900'
                  }`}
                >
                  {l.kind === 'text' ? <Type size={11} /> : <ImageIcon size={11} />}
                  <span className="flex-1 truncate">
                    {l.kind === 'text' ? l.text || '(empty)' : 'Image'}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderLayer(l.id, 'up');
                      }}
                      title="Bring forward"
                      className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reorderLayer(l.id, 'down');
                      }}
                      title="Send backward"
                      className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400"
                    >
                      <ChevronDown size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateLayer(l.id);
                      }}
                      title="Duplicate"
                      className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(l.id);
                      }}
                      title="Delete"
                      className="p-0.5 rounded hover:bg-neutral-800 text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
