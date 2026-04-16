import { useEffect, useRef } from 'react';
import { useSession, type ImageLayer as ImageLayerT } from '../store/session';
import { useDraggable } from '../hooks/useDraggable';
import { applySnap } from '../lib/snap';
import { loadImageDimensions } from '../lib/file';

type Props = {
  layer: ImageLayerT;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
};

export function ImageLayer({ layer, scale, canvasWidth, canvasHeight }: Props) {
  const updateLayer = useSession((s) => s.updateLayer);
  const setSelection = useSession((s) => s.setSelection);
  const setDrag = useSession((s) => s.setDrag);
  const endDrag = useSession((s) => s.endDrag);
  const startRef = useRef<{ x: number; y: number } | null>(null);

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
      const snapped = applySnap(raw, layer.width, layer.height, canvasWidth, canvasHeight, shift);
      updateLayer(layer.id, { x: snapped.x, y: snapped.y });
      setDrag({
        active: true,
        layerId: layer.id,
        x: snapped.x,
        y: snapped.y,
        width: layer.width,
        height: layer.height,
        snapX: snapped.snapX,
        snapY: snapped.snapY,
      });
    },
    onEnd: () => endDrag(),
  });

  // Backfill natural dimensions for legacy layers so aspect lock has an
  // authoritative ratio to work with.
  useEffect(() => {
    if (layer.naturalWidth && layer.naturalHeight) return;
    let cancelled = false;
    loadImageDimensions(layer.src)
      .then(({ width, height }) => {
        if (cancelled) return;
        updateLayer(layer.id, { naturalWidth: width, naturalHeight: height });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [layer.id, layer.src, layer.naturalWidth, layer.naturalHeight, updateLayer]);

  return (
    <img
      {...bind()}
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
        // Override Tailwind preflight (img { max-width: 100%; height: auto })
        // so the rendered size always equals layer.width × layer.height.
        maxWidth: 'none',
        maxHeight: 'none',
        objectFit: 'fill',
        borderRadius: layer.cornerRadius ?? 0,
        transform: `rotate(${layer.rotation}deg)`,
        transformOrigin: 'center',
        userSelect: 'none',
        cursor: 'move',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    />
  );
}
