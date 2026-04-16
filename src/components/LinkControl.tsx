import { useMemo, useState } from 'react';
import { Link as LinkIcon, Link2Off } from 'lucide-react';
import { useSession, type Layer } from '../store/session';

const NEW_LINK = '__new__';

/**
 * Link group editor for the selected layer. Style edits propagate to all
 * same-kind siblings in the workspace that share this `linkId`; content
 * (text, image src) stays local.
 */
export function LinkControl({ layer }: { layer: Layer }) {
  const ws = useSession((s) =>
    s.workspaces.find((w) => w.id === s.activeWorkspaceId),
  );
  const updateLayer = useSession((s) => s.updateLayer);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  // Single walk: collect all same-kind linkIds in the workspace and count
  // siblings that share the current layer's linkId.
  const { existingLinks, siblingCount } = useMemo(() => {
    const names = new Set<string>();
    let siblings = 0;
    if (ws) {
      for (const f of ws.frames) {
        for (const l of f.layers) {
          if (l.kind !== layer.kind || !l.linkId) continue;
          names.add(l.linkId);
          if (layer.linkId && l.id !== layer.id && l.linkId === layer.linkId) {
            siblings += 1;
          }
        }
      }
    }
    return {
      existingLinks: Array.from(names).sort(),
      siblingCount: siblings,
    };
  }, [ws, layer.kind, layer.linkId, layer.id]);

  const handleSelect = (value: string) => {
    if (value === NEW_LINK) {
      setDraft('');
      setCreating(true);
      return;
    }
    updateLayer(layer.id, { linkId: value === '' ? undefined : value });
  };

  const commitNew = () => {
    const next = draft.trim();
    setCreating(false);
    setDraft('');
    if (!next) return;
    updateLayer(layer.id, { linkId: next });
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">Link</div>
      {creating ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            placeholder="Link name…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitNew();
              if (e.key === 'Escape') {
                setCreating(false);
                setDraft('');
              }
            }}
            onBlur={commitNew}
            className="flex-1 bg-neutral-900 border border-blue-500 rounded px-2 py-1 text-xs focus:outline-none"
          />
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {layer.linkId ? (
            <LinkIcon size={13} className="text-blue-400 shrink-0" />
          ) : (
            <Link2Off size={13} className="text-neutral-600 shrink-0" />
          )}
          <select
            value={layer.linkId ?? ''}
            onChange={(e) => handleSelect(e.target.value)}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="">Unlinked</option>
            {existingLinks.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={NEW_LINK}>+ New link…</option>
          </select>
        </div>
      )}
      {layer.linkId && !creating && (
        <div className="text-[10px] text-neutral-500">
          Syncs style with {siblingCount} other {layer.kind} layer
          {siblingCount === 1 ? '' : 's'} in this workspace.
        </div>
      )}
    </div>
  );
}
