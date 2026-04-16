import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Copy,
  Pencil,
  ChevronDown,
  FileUp,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { useSession, getCanvasSize, type Workspace } from '../store/session';
import { PLATFORM_LIST, platformLabel, type FixedPlatform } from '../lib/platforms';
import { importJSON } from '../lib/export';
import { useListReorder } from '../hooks/useListReorder';

type Props = {
  onExport: (frameId: string) => void;
};

type Mode = 'closed' | 'menu' | 'platforms' | 'custom';

export function Sidebar({ onExport }: Props) {
  const workspaces = useSession((s) => s.workspaces);
  const activeWorkspaceId = useSession((s) => s.activeWorkspaceId);
  const activeFrameId = useSession((s) => s.activeFrameId);
  const addWorkspace = useSession((s) => s.addWorkspace);
  const addCustomWorkspace = useSession((s) => s.addCustomWorkspace);
  const dupWorkspace = useSession((s) => s.duplicateWorkspace);
  const removeWorkspace = useSession((s) => s.removeWorkspace);
  const renameWorkspace = useSession((s) => s.renameWorkspace);
  const setActiveWorkspace = useSession((s) => s.setActiveWorkspace);
  const moveWorkspace = useSession((s) => s.moveWorkspace);
  const addFrame = useSession((s) => s.addFrame);
  const dupFrame = useSession((s) => s.duplicateFrame);
  const removeFrame = useSession((s) => s.removeFrame);
  const renameFrame = useSession((s) => s.renameFrame);
  const setActiveFrame = useSession((s) => s.setActiveFrame);
  const moveFrame = useSession((s) => s.moveFrame);
  const importWorkspaces = useSession((s) => s.importJSON);
  const [mode, setMode] = useState<Mode>('closed');
  const menuRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const wsReorder = useListReorder(workspaces, (id, toIndex) => {
    moveWorkspace(id, toIndex);
  });

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
      importWorkspaces(items);
      setMode('closed');
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`);
    }
  }

  const totalFrames = workspaces.reduce((n, w) => n + w.frames.length, 0);

  return (
    <aside className="w-64 shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="text-sm font-medium">Workspaces</div>
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
            <div className="absolute right-0 mt-1 w-44 bg-neutral-900 border border-neutral-800 rounded shadow-lg z-10 py-1">
              <button
                onClick={() => setMode('platforms')}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-800 flex items-center gap-2"
              >
                <Plus size={12} /> New workspace
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
                addWorkspace(p.id as FixedPlatform);
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
          <button
            onClick={() => setMode('custom')}
            className="text-left bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 rounded px-2 py-1.5 text-xs flex items-center justify-between"
          >
            <span>Custom…</span>
            <span className="text-neutral-500 font-mono">w × h</span>
          </button>
        </div>
      )}

      {mode === 'custom' && (
        <CustomWorkspaceForm
          onCancel={() => setMode('platforms')}
          onCreate={(name, w, h) => {
            addCustomWorkspace(name, w, h);
            setMode('closed');
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {workspaces.length === 0 ? (
          <div className="p-4 text-xs text-neutral-500">
            No workspaces yet. Click <span className="text-neutral-300">+ New</span> to start.
          </div>
        ) : (
          <ul
            className="p-2 space-y-2"
            onDrop={wsReorder.commit}
            onDragEnd={wsReorder.cancel}
          >
            {workspaces.map((w, i) => (
              <li key={w.id} className="relative">
                <div
                  aria-hidden
                  className="absolute -top-1 left-0 right-0 h-0.5 rounded pointer-events-none"
                  style={{
                    background:
                      wsReorder.isDragging &&
                      wsReorder.dropIndex === i &&
                      wsReorder.dragId !== w.id
                        ? '#3b82f6'
                        : 'transparent',
                  }}
                />
                <div
                  onDragOver={wsReorder.hoverGap(i)}
                  onDrop={wsReorder.commit}
                  className={wsReorder.dragId === w.id ? 'opacity-40' : ''}
                >
                  <WorkspaceItem
                    workspace={w}
                    isActiveWorkspace={w.id === activeWorkspaceId}
                    activeFrameId={activeFrameId}
                    onDragHandleStart={wsReorder.startDrag(w.id)}
                    onDragHandleEnd={wsReorder.cancel}
                    onActivateWorkspace={() => setActiveWorkspace(w.id)}
                    onRenameWorkspace={(name) => renameWorkspace(w.id, name)}
                    onDuplicateWorkspace={() => dupWorkspace(w.id)}
                    onRemoveWorkspace={() => {
                      if (confirm(`Delete workspace "${w.name}" and all its frames?`))
                        removeWorkspace(w.id);
                    }}
                    onAddFrame={() => {
                      if (w.id !== activeWorkspaceId) setActiveWorkspace(w.id);
                      addFrame();
                    }}
                    onActivateFrame={(fid) => {
                      if (w.id !== activeWorkspaceId) setActiveWorkspace(w.id);
                      setActiveFrame(fid);
                    }}
                    onRenameFrame={(fid, name) => {
                      if (w.id !== activeWorkspaceId) setActiveWorkspace(w.id);
                      renameFrame(fid, name);
                    }}
                    onDuplicateFrame={(fid) => {
                      if (w.id !== activeWorkspaceId) setActiveWorkspace(w.id);
                      dupFrame(fid);
                    }}
                    onRemoveFrame={(fid) => {
                      if (w.id !== activeWorkspaceId) setActiveWorkspace(w.id);
                      removeFrame(fid);
                    }}
                    onMoveFrame={(fid, toIndex) => {
                      if (w.id !== activeWorkspaceId) setActiveWorkspace(w.id);
                      moveFrame(fid, toIndex);
                    }}
                    onExportFrame={(fid) => onExport(fid)}
                  />
                </div>
              </li>
            ))}
            {/* Trailing drop zone for moving past the last workspace. */}
            <li
              aria-hidden
              className="relative h-3"
              onDragOver={wsReorder.hoverGap(workspaces.length)}
              onDrop={wsReorder.commit}
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5 rounded pointer-events-none"
                style={{
                  background:
                    wsReorder.isDragging && wsReorder.dropIndex === workspaces.length
                      ? '#3b82f6'
                      : 'transparent',
                }}
              />
            </li>
          </ul>
        )}
      </div>

      <div className="p-2 text-[10px] text-neutral-600 border-t border-neutral-800">
        {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'} ·{' '}
        {totalFrames} frame{totalFrames === 1 ? '' : 's'}
      </div>
    </aside>
  );
}

function WorkspaceItem({
  workspace,
  isActiveWorkspace,
  activeFrameId,
  onDragHandleStart,
  onDragHandleEnd,
  onActivateWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onRemoveWorkspace,
  onAddFrame,
  onActivateFrame,
  onRenameFrame,
  onDuplicateFrame,
  onRemoveFrame,
  onMoveFrame,
  onExportFrame,
}: {
  workspace: Workspace;
  isActiveWorkspace: boolean;
  activeFrameId: string | null;
  onDragHandleStart: (e: React.DragEvent) => void;
  onDragHandleEnd: () => void;
  onActivateWorkspace: () => void;
  onRenameWorkspace: (name: string) => void;
  onDuplicateWorkspace: () => void;
  onRemoveWorkspace: () => void;
  onAddFrame: () => void;
  onActivateFrame: (frameId: string) => void;
  onRenameFrame: (frameId: string, name: string) => void;
  onDuplicateFrame: (frameId: string) => void;
  onRemoveFrame: (frameId: string) => void;
  onMoveFrame: (frameId: string, toIndex: number) => void;
  onExportFrame: (frameId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const label = platformLabel(workspace.platform);
  const size = getCanvasSize(workspace);

  const frameReorder = useListReorder(workspace.frames, (id, toIndex) => {
    onMoveFrame(id, toIndex);
  });

  return (
    <div
      className={`rounded border ${
        isActiveWorkspace
          ? 'border-blue-500/70 bg-blue-500/5'
          : 'border-neutral-800 bg-neutral-900/40'
      }`}
    >
      <div
        className="group flex items-center gap-1 px-2 py-1.5 cursor-pointer"
        onClick={() => {
          setExpanded((e) => !e);
          if (!isActiveWorkspace) onActivateWorkspace();
        }}
      >
        <div
          draggable
          onDragStart={onDragHandleStart}
          onDragEnd={onDragHandleEnd}
          onClick={(e) => e.stopPropagation()}
          className="text-neutral-600 hover:text-neutral-300 cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to reorder workspace"
        >
          <GripVertical size={12} />
        </div>
        <span className="text-[10px] text-neutral-500 uppercase shrink-0">
          {label}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="p-0.5 rounded hover:bg-neutral-800 text-neutral-500"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            size={12}
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 120ms',
            }}
          />
        </button>
        <EditableName value={workspace.name} onCommit={onRenameWorkspace} />
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateWorkspace();
            }}
            title="Duplicate workspace"
            className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400"
          >
            <Copy size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveWorkspace();
            }}
            title="Delete workspace"
            className="p-0.5 rounded hover:bg-neutral-800 text-red-400"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div className="px-2 pb-1 text-[10px] text-neutral-600 font-mono flex items-center justify-between">
        <span>
          {size.width}×{size.height}
        </span>
        <span className="text-neutral-600">
          {workspace.frames.length} frame{workspace.frames.length === 1 ? '' : 's'}
        </span>
      </div>

      {expanded && (
        <ul
          className="px-2 pb-2 space-y-1"
          onDrop={frameReorder.commit}
          onDragEnd={frameReorder.cancel}
        >
          {workspace.frames.map((f, i) => {
            const isActiveFrame = isActiveWorkspace && f.id === activeFrameId;
            const showDropAbove =
              frameReorder.isDragging &&
              frameReorder.dropIndex === i &&
              frameReorder.dragId !== f.id;
            return (
              <li key={f.id} className="relative">
                <div
                  aria-hidden
                  className="absolute -top-0.5 left-0 right-0 h-0.5 rounded pointer-events-none"
                  style={{ background: showDropAbove ? '#3b82f6' : 'transparent' }}
                />
                <div
                  onClick={() => onActivateFrame(f.id)}
                  onDragOver={frameReorder.hoverGap(i)}
                  onDrop={frameReorder.commit}
                  className={`group rounded border cursor-pointer text-xs ${
                    isActiveFrame
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900'
                  } ${frameReorder.dragId === f.id ? 'opacity-40' : ''}`}
                >
                  <div className="p-2 flex items-center gap-1">
                    <div
                      draggable
                      onDragStart={frameReorder.startDrag(f.id)}
                      onDragEnd={frameReorder.cancel}
                      onClick={(e) => e.stopPropagation()}
                      className="text-neutral-600 hover:text-neutral-300 cursor-grab active:cursor-grabbing shrink-0"
                      title="Drag to reorder frame"
                    >
                      <GripVertical size={11} />
                    </div>
                    <EditableName
                      value={f.name}
                      onCommit={(v) => onRenameFrame(f.id, v)}
                    />
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportFrame(f.id);
                        }}
                        title="Export PNG"
                        className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400"
                      >
                        <Download size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateFrame(f.id);
                        }}
                        title="Duplicate"
                        className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400"
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete frame "${f.name}"?`)) onRemoveFrame(f.id);
                        }}
                        title="Delete"
                        className="p-0.5 rounded hover:bg-neutral-800 text-red-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {/* Trailing drop gap so the last frame can be dragged past the end. */}
          <li
            aria-hidden
            className="relative h-2"
            onDragOver={frameReorder.hoverGap(workspace.frames.length)}
            onDrop={frameReorder.commit}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.5 rounded pointer-events-none"
              style={{
                background:
                  frameReorder.isDragging &&
                  frameReorder.dropIndex === workspace.frames.length
                    ? '#3b82f6'
                    : 'transparent',
              }}
            />
          </li>
          <li>
            <button
              onClick={onAddFrame}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-dashed border-neutral-800 text-[11px] text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
            >
              <Plus size={11} /> Add frame
            </button>
          </li>
        </ul>
      )}
    </div>
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
        className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:border-blue-500"
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

function CustomWorkspaceForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (name: string, width: number, height: number) => void;
}) {
  const [name, setName] = useState('Custom');
  const [width, setWidth] = useState('1080');
  const [height, setHeight] = useState('1920');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      nameRef.current?.focus();
      nameRef.current?.select();
    });
  }, []);

  const w = parseInt(width, 10);
  const h = parseInt(height, 10);
  const trimmedName = name.trim();
  const valid =
    trimmedName.length > 0 &&
    Number.isFinite(w) &&
    w > 0 &&
    Number.isFinite(h) &&
    h > 0;

  const submit = () => {
    if (!valid) return;
    onCreate(trimmedName, w, h);
  };

  return (
    <div className="p-2 border-b border-neutral-800 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">
        Custom size
      </div>
      <input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Name"
        className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
      />
      <div className="flex gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Width"
          className="w-1/2 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500"
        />
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Height"
          className="w-1/2 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex gap-1 justify-end">
        <button
          onClick={onCancel}
          className="text-xs px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400"
        >
          Cancel
        </button>
        <button
          disabled={!valid}
          onClick={submit}
          className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
        >
          Create
        </button>
      </div>
    </div>
  );
}
