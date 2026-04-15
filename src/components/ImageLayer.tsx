import { useRef } from 'react';
import { useSession, type Screenshot } from '../store/session';
import { useDraggable } from '../hooks/useDraggable';
import { SelectionFrame } from './SelectionFrame';

type Props = { screenshot: Screenshot; scale: number };

export function ImageLayer({ screenshot, scale }: Props) {
  const { image } = screenshot;
  const updateImage = useSession((s) => s.updateImage);
  const setSelection = useSession((s) => s.setSelection);
  const selection = useSession((s) => s.selection);
  const selected = selection?.kind === 'image';
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const bind = useDraggable({
    scale,
    onStart: () => {
      if (!image) return;
      startRef.current = { x: image.x, y: image.y };
      setSelection({ kind: 'image' });
    },
    onChange: ({ dx, dy }) => {
      const start = startRef.current;
      if (!start) return;
      updateImage({ x: Math.round(start.x + dx), y: Math.round(start.y + dy) });
    },
  });

  if (!image) return null;

  const onResize = (patch: { x?: number; y?: number; width?: number; height?: number }) => {
    updateImage(patch);
  };

  const onRotate = (rotation: number) => {
    updateImage({ rotation });
  };

  return (
    <>
      <img
        {...bind()}
        src={image.src}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: image.x,
          top: image.y,
          width: image.width,
          height: image.height,
          transform: `rotate(${image.rotation}deg)`,
          transformOrigin: 'center',
          userSelect: 'none',
          cursor: 'move',
          touchAction: 'none',
          pointerEvents: 'auto',
        }}
      />

      {selected && (
        <SelectionFrame
          x={image.x}
          y={image.y}
          width={image.width}
          height={image.height}
          rotation={image.rotation}
          scale={scale}
          allowRotation
          aspectLock
          onResize={onResize}
          onRotate={onRotate}
        />
      )}
    </>
  );
}
