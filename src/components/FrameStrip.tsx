import { memo } from 'react';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';
import {
  useSession,
  getCanvasSize,
  effectiveBackground,
  type Frame,
  type Layer,
  type Workspace,
} from '../store/session';
import { backgroundCSS } from '../lib/backgrounds';
import { useListReorder } from '../hooks/useListReorder';

const THUMB_HEIGHT = 96;

export function FrameStrip() {
  const workspaces = useSession((s) => s.workspaces);
  const activeWorkspaceId = useSession((s) => s.activeWorkspaceId);
  const activeFrameId = useSession((s) => s.activeFrameId);
  const setActiveFrame = useSession((s) => s.setActiveFrame);
  const addFrame = useSession((s) => s.addFrame);
  const moveFrame = useSession((s) => s.moveFrame);
  const duplicateFrame = useSession((s) => s.duplicateFrame);
  const removeFrame = useSession((s) => s.removeFrame);

  const workspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const reorder = useListReorder(workspace?.frames ?? [], (id, to) => {
    moveFrame(id, to);
  });

  if (!workspace) return null;

  const size = getCanvasSize(workspace);
  const thumbScale = THUMB_HEIGHT / size.height;
  const thumbWidth = Math.round(size.width * thumbScale);

  return (
    <div
      className="shrink-0 border-t border-neutral-800 bg-neutral-950 px-3 py-3 flex items-center gap-3 overflow-x-auto"
      onDragOver={(e) => {
        // Allow dropping at the very end when hovering the strip beyond the last thumb.
        if (reorder.isDragging) e.preventDefault();
      }}
      onDrop={reorder.commit}
      onDragEnd={reorder.cancel}
    >
      {workspace.frames.length === 0 && (
        <div className="text-xs text-neutral-500">No frames yet.</div>
      )}

      {workspace.frames.map((f, i) => (
        <DropGap
          key={`gap-${f.id}`}
          active={reorder.dropIndex === i && reorder.isDragging && reorder.dragId !== f.id}
          height={THUMB_HEIGHT}
          onHover={reorder.hoverGap(i)}
        >
          <Thumb
            workspace={workspace}
            frame={f}
            index={i}
            thumbWidth={thumbWidth}
            thumbScale={thumbScale}
            active={f.id === activeFrameId}
            dragging={reorder.dragId === f.id}
            onClick={() => setActiveFrame(f.id)}
            onDragStart={reorder.startDrag(f.id)}
            onDragEnd={reorder.cancel}
            onDragOverSelf={reorder.hoverGap(i)}
            onDuplicate={() => duplicateFrame(f.id)}
            onRemove={() => {
              if (confirm(`Delete frame "${f.name}"?`)) removeFrame(f.id);
            }}
          />
        </DropGap>
      ))}

      <DropGap
        active={reorder.dropIndex === workspace.frames.length && reorder.isDragging}
        height={THUMB_HEIGHT}
        onHover={reorder.hoverGap(workspace.frames.length)}
      >
        <button
          onClick={addFrame}
          title="Add frame"
          className="shrink-0 flex flex-col items-center justify-center border border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900 text-neutral-400 rounded"
          style={{ width: thumbWidth, height: THUMB_HEIGHT }}
        >
          <Plus size={18} />
        </button>
      </DropGap>
    </div>
  );
}

function DropGap({
  active,
  height,
  onHover,
  children,
}: {
  active: boolean;
  height: number;
  onHover: (e: React.DragEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center shrink-0" onDragOver={onHover}>
      <div
        aria-hidden
        className="absolute -left-1.5 top-0 bottom-0 w-[3px] rounded transition-colors"
        style={{
          background: active ? '#3b82f6' : 'transparent',
          height,
        }}
      />
      {children}
    </div>
  );
}

type ThumbProps = {
  workspace: Workspace;
  frame: Frame;
  index: number;
  thumbWidth: number;
  thumbScale: number;
  active: boolean;
  dragging: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverSelf: (e: React.DragEvent) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

const Thumb = memo(function Thumb({
  workspace,
  frame,
  index,
  thumbWidth,
  thumbScale,
  active,
  dragging,
  onClick,
  onDragStart,
  onDragEnd,
  onDragOverSelf,
  onDuplicate,
  onRemove,
}: ThumbProps) {
  const size = getCanvasSize(workspace);
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverSelf}
      title={frame.name}
      className={`group relative shrink-0 rounded overflow-hidden border cursor-pointer transition ${
        active
          ? 'border-blue-500 ring-2 ring-blue-500/50'
          : 'border-neutral-700 hover:border-neutral-500'
      } ${dragging ? 'opacity-40' : ''}`}
      style={{ width: thumbWidth, height: THUMB_HEIGHT }}
    >
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: size.width,
          height: size.height,
          background: backgroundCSS(effectiveBackground(workspace, frame)),
          transform: `scale(${thumbScale})`,
          transformOrigin: 'top left',
        }}
      >
        {frame.layers.map((l) => (
          <ThumbLayer key={l.id} layer={l} />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 text-[10px] leading-tight bg-neutral-950/80 text-neutral-200 px-1 py-0.5 flex items-center gap-1">
        <span className="font-mono text-neutral-500 shrink-0">{index + 1}</span>
        <span className="truncate flex-1">{frame.name}</span>
      </div>

      <div
        className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDuplicate}
          title="Duplicate"
          className="p-0.5 rounded bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300"
        >
          <Copy size={10} />
        </button>
        <button
          onClick={onRemove}
          title="Delete"
          className="p-0.5 rounded bg-neutral-900/80 hover:bg-neutral-800 text-red-400"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
});

/**
 * Read-only layer render for thumbnails. CSS must stay in sync with
 * `ImageLayer.tsx` / `TextLayer.tsx` / `lib/export.ts` (see CLAUDE.md).
 */
function ThumbLayer({ layer }: { layer: Layer }) {
  if (layer.kind === 'icon') {
    return (
      <div
        style={{
          position: 'absolute',
          left: layer.x,
          top: layer.y,
          width: layer.width,
          height: layer.height,
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: 'center',
          color: layer.color,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <DynamicIcon
          name={layer.name as IconName}
          size={Math.min(layer.width, layer.height)}
          absoluteStrokeWidth
          strokeWidth={layer.strokeWidth ?? 2}
          style={{ width: layer.width, height: layer.height, display: 'block' }}
        />
      </div>
    );
  }
  if (layer.kind === 'image') {
    return (
      <img
        src={layer.src}
        alt=""
        draggable={false}
        style={{
          display: 'block',
          position: 'absolute',
          left: layer.x,
          top: layer.y,
          width: layer.width,
          height: layer.height,
          maxWidth: 'none',
          maxHeight: 'none',
          objectFit: 'fill',
          borderRadius: layer.cornerRadius ?? 0,
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: layer.x,
        top: layer.y,
        width: layer.width,
        fontFamily:
          '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        color: layer.color,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        textAlign: layer.align,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        transform: `rotate(${layer.rotation}deg)`,
        transformOrigin: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {layer.text}
    </div>
  );
}
