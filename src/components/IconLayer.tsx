import { useRef } from 'react';
import { useSession, type IconLayer as IconLayerT } from '../store/session';
import { useDraggable } from '../hooks/useDraggable';
import { applySnap } from '../lib/snap';
import { IconGlyph } from './IconGlyph';

type Props = {
  layer: IconLayerT;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
};

export function IconLayer({ layer, scale, canvasWidth, canvasHeight }: Props) {
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

  return (
    <div
      {...bind()}
      style={{
        position: 'absolute',
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        transform: `rotate(${layer.rotation}deg)`,
        transformOrigin: 'center',
        userSelect: 'none',
        cursor: 'move',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    >
      <IconGlyph
        name={layer.name}
        width={layer.width}
        height={layer.height}
        color={layer.color}
        gradient={layer.gradient}
        strokeWidth={layer.strokeWidth ?? 2}
      />
    </div>
  );
}
