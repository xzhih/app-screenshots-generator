import { useEffect, useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  FileJson,
  ChevronDown,
  Image as ImageIcon,
  FileArchive,
} from 'lucide-react';
import { useSession, findFrame } from '../store/session';
import { exportJSON, exportFramePng, exportWorkspaceZip } from '../lib/export';

export function Toolbar() {
  const workspaces = useSession((s) => s.workspaces);
  const activeWorkspaceId = useSession((s) => s.activeWorkspaceId);
  const activeFrameId = useSession((s) => s.activeFrameId);
  const active = findFrame(workspaces, activeFrameId);
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const workspaceFrameCount = activeWorkspace?.frames.length ?? 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const canExportFrame = !!active;
  const canExportWorkspace = !!activeWorkspace && workspaceFrameCount > 0;
  const anyExport = canExportFrame || canExportWorkspace;

  return (
    <div className="h-12 shrink-0 bg-neutral-950 border-b border-neutral-800 flex items-center px-3 gap-2">
      <div className="text-sm font-medium text-neutral-200">App Screenshots</div>
      <div className="w-px h-5 bg-neutral-800 mx-2" />

      <Btn
        onClick={() => useSession.temporal.getState().undo()}
        title="Undo (⌘Z)"
      >
        <Undo2 size={14} />
      </Btn>
      <Btn
        onClick={() => useSession.temporal.getState().redo()}
        title="Redo (⌘⇧Z)"
      >
        <Redo2 size={14} />
      </Btn>

      <div className="ml-auto flex items-center gap-2">
        <Btn
          onClick={() => exportJSON(workspaces)}
          disabled={workspaces.length === 0}
          title="Export all configs as JSON"
        >
          <FileJson size={14} />
          <span>Export JSON</span>
        </Btn>
        <div className="relative" ref={menuRef}>
          <Btn
            onClick={() => setMenuOpen((v) => !v)}
            disabled={!anyExport}
            title="Export…"
            primary
          >
            <Download size={14} />
            <span>Export</span>
            <ChevronDown size={14} />
          </Btn>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-neutral-900 border border-neutral-800 rounded shadow-lg z-10 overflow-hidden">
              <MenuItem
                disabled={!canExportFrame}
                onClick={() => {
                  if (active) void exportFramePng(active.workspace, active.frame);
                  setMenuOpen(false);
                }}
              >
                <ImageIcon size={14} />
                <div className="flex-1 text-left">
                  <div>Export current frame</div>
                  <div className="text-[10px] text-neutral-500">PNG</div>
                </div>
              </MenuItem>
              <MenuItem
                disabled={!canExportWorkspace}
                onClick={() => {
                  if (activeWorkspace) void exportWorkspaceZip(activeWorkspace);
                  setMenuOpen(false);
                }}
              >
                <FileArchive size={14} />
                <div className="flex-1 text-left">
                  <div>Export current workspace</div>
                  <div className="text-[10px] text-neutral-500">
                    {canExportWorkspace
                      ? `${workspaceFrameCount} frame${workspaceFrameCount === 1 ? '' : 's'} · ZIP`
                      : 'ZIP'}
                  </div>
                </div>
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  title,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  primary?: boolean;
}) {
  const base = 'h-8 px-2 rounded text-xs flex items-center gap-1.5 border';
  const styles = primary
    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${styles} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
