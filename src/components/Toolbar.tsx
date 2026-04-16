import { Undo2, Redo2, Download, FileJson, Image as ImageIcon } from 'lucide-react';
import { useSession } from '../store/session';
import { exportJSON, exportScreenshotPng } from '../lib/export';

export function Toolbar() {
  const screenshots = useSession((s) => s.screenshots);
  const active = useSession((s) => s.screenshots.find((x) => x.id === s.activeId) ?? null);

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
          onClick={() => exportJSON(screenshots)}
          disabled={screenshots.length === 0}
          title="Export all configs as JSON"
        >
          <FileJson size={14} />
          <span>Export JSON</span>
        </Btn>
        <Btn
          onClick={() => active && exportScreenshotPng(active)}
          disabled={!active}
          title="Export current PNG"
          primary
        >
          <ImageIcon size={14} />
          <Download size={14} />
          <span>Export PNG</span>
        </Btn>
      </div>
    </div>
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
