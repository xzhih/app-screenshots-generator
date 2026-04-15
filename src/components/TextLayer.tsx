import { useRef } from 'react';
import { useSession, type Screenshot } from '../store/session';
import { useDraggable } from '../hooks/useDraggable';
import { SelectionFrame } from './SelectionFrame';

type Props = { screenshot: Screenshot; scale: number };

export function TextLayer({ screenshot, scale }: Props) {
  const { title } = screenshot;
  const updateTitle = useSession((s) => s.updateTitle);
  const setSelection = useSession((s) => s.setSelection);
  const selection = useSession((s) => s.selection);
  const selected = selection?.kind === 'title';
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const bind = useDraggable({
    scale,
    onStart: () => {
      startRef.current = { x: title.x, y: title.y };
      setSelection({ kind: 'title' });
    },
    onChange: ({ dx, dy }) => {
      const start = startRef.current;
      if (!start) return;
      updateTitle({ x: Math.round(start.x + dx), y: Math.round(start.y + dy) });
    },
  });

  const onResize = (patch: { x?: number; y?: number; width?: number; height?: number }) => {
    // Text resize only affects x, y, width (height auto from lineheight)
    const { height: _h, ...rest } = patch;
    void _h;
    updateTitle(rest);
  };

  return (
    <>
      <div
        {...bind()}
        onDoubleClick={() => {
          const next = prompt('Edit headline', title.text);
          if (next !== null) updateTitle({ text: next });
        }}
        style={{
          position: 'absolute',
          left: title.x,
          top: title.y,
          width: title.width,
          fontSize: title.fontSize,
          fontWeight: title.fontWeight,
          color: title.color,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          textAlign: 'left',
          userSelect: 'none',
          cursor: 'move',
          touchAction: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          outline: selected ? '2px dashed rgba(255,255,255,0.5)' : 'none',
          outlineOffset: 4,
        }}
      >
        {title.text || '\u00A0'}
      </div>

      {selected && (
        <SelectionFrame
          x={title.x}
          y={title.y}
          width={title.width}
          height={Math.max(title.fontSize * 1.2, title.fontSize)}
          rotation={0}
          scale={scale}
          allowRotation={false}
          aspectLock={false}
          onResize={onResize}
        />
      )}
    </>
  );
}
