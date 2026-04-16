import { useEffect, useRef, useState } from 'react';
import { useSession, type TextLayer as TextLayerT } from '../store/session';
import { useDraggable } from '../hooks/useDraggable';
import { SelectionFrame } from './SelectionFrame';
import { applySnap } from '../lib/snap';

type Props = {
  layer: TextLayerT;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
};

export function TextLayer({ layer, scale, canvasWidth, canvasHeight, selected }: Props) {
  const updateLayer = useSession((s) => s.updateLayer);
  const setSelection = useSession((s) => s.setSelection);
  const setDrag = useSession((s) => s.setDrag);
  const endDrag = useSession((s) => s.endDrag);

  const startRef = useRef<{ x: number; y: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(layer.fontSize * 1.2);
  const [editing, setEditing] = useState(false);

  // Re-bind the observer after each remount (the key={editing ? 'edit' : 'view'}
  // toggle below detaches the old node, so the observer must re-observe the new one).
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    setHeight(el.offsetHeight);
    const obs = new ResizeObserver(() => {
      if (elRef.current) setHeight(elRef.current.offsetHeight);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [editing]);

  // When entering edit mode, seed the DOM with current text and select all.
  useEffect(() => {
    if (!editing || !elRef.current) return;
    const el = elRef.current;
    el.innerText = layer.text;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // Only seed on entering edit mode; ignore layer.text changes mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const bind = useDraggable({
    scale,
    onStart: () => {
      startRef.current = { x: layer.x, y: layer.y };
      setSelection({ kind: 'layer', id: layer.id });
    },
    onChange: ({ dx, dy, shift }) => {
      const start = startRef.current;
      if (!start) return;
      const raw = { x: Math.round(start.x + dx), y: Math.round(start.y + dy) };
      const snapped = applySnap(raw, layer.width, height, canvasWidth, canvasHeight, shift);
      updateLayer(layer.id, { x: snapped.x, y: snapped.y });
      setDrag({
        active: true,
        layerId: layer.id,
        x: snapped.x,
        y: snapped.y,
        width: layer.width,
        height,
        snapX: snapped.snapX,
        snapY: snapped.snapY,
      });
    },
    onEnd: () => endDrag(),
  });

  const onResize = (patch: { x?: number; y?: number; width?: number; height?: number }) => {
    const { height: _h, ...rest } = patch;
    void _h;
    updateLayer(layer.id, rest);
  };

  const onRotate = (rotation: number) => {
    updateLayer(layer.id, { rotation });
  };

  const commitEdit = () => {
    const text = elRef.current?.innerText ?? '';
    // innerText adds a trailing newline for <br>; trim only trailing newlines
    const cleaned = text.replace(/\n+$/, '');
    if (cleaned !== layer.text) updateLayer(layer.id, { text: cleaned });
    setEditing(false);
  };

  // Drag handlers only bind when not editing so text cursor works normally.
  const dragBindings = editing ? {} : bind();

  return (
    <>
      <div
        {...dragBindings}
        ref={elRef}
        key={editing ? 'edit' : 'view'}
        contentEditable={editing}
        suppressContentEditableWarning
        onDoubleClick={(e) => {
          e.stopPropagation();
          setSelection({ kind: 'layer', id: layer.id });
          setEditing(true);
        }}
        onBlur={() => {
          if (editing) commitEdit();
        }}
        onKeyDown={(e) => {
          if (!editing) return;
          if (e.key === 'Escape') {
            e.preventDefault();
            // Revert: restore original text, then exit
            if (elRef.current) elRef.current.innerText = layer.text;
            setEditing(false);
          }
          // Stop keyboard shortcuts (e.g. Delete) from bubbling to global handler
          e.stopPropagation();
        }}
        style={{
          position: 'absolute',
          left: layer.x,
          top: layer.y,
          width: layer.width,
          fontSize: layer.fontSize,
          fontWeight: layer.fontWeight,
          color: layer.color,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          textAlign: layer.align,
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: 'center',
          userSelect: editing ? 'text' : 'none',
          cursor: editing ? 'text' : 'move',
          touchAction: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          outline: editing ? '2px solid #4c9ffe' : 'none',
          outlineOffset: 4,
          caretColor: editing ? '#4c9ffe' : undefined,
        }}
      >
        {editing ? null : layer.text || '\u00A0'}
      </div>

      {selected && !editing && (
        <SelectionFrame
          x={layer.x}
          y={layer.y}
          width={layer.width}
          height={height}
          rotation={layer.rotation}
          scale={scale}
          allowRotation
          aspectLock={false}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          onResize={onResize}
          onRotate={onRotate}
        />
      )}
    </>
  );
}
