import { useRef } from 'react';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  allowRotation: boolean;
  aspectLock: boolean;
  onResize: (patch: { x?: number; y?: number; width?: number; height?: number }) => void;
  onRotate?: (rotation: number) => void;
};

const HANDLE_SIZE = 14;

const CURSORS: Record<Handle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
};

const FACTORS: Record<Handle, { fx: -1 | 0 | 1; fy: -1 | 0 | 1 }> = {
  nw: { fx: -1, fy: -1 },
  n: { fx: 0, fy: -1 },
  ne: { fx: 1, fy: -1 },
  e: { fx: 1, fy: 0 },
  se: { fx: 1, fy: 1 },
  s: { fx: 0, fy: 1 },
  sw: { fx: -1, fy: 1 },
  w: { fx: -1, fy: 0 },
};

export function SelectionFrame({
  x,
  y,
  width,
  height,
  rotation,
  scale,
  allowRotation,
  aspectLock,
  onResize,
  onRotate,
}: Props) {
  const latestProps = useRef({ x, y, width, height, rotation, scale, aspectLock, onResize, onRotate });
  latestProps.current = { x, y, width, height, rotation, scale, aspectLock, onResize, onRotate };

  const handleResizeStart = (handle: Handle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const snap = { ...latestProps.current };
    const start = { x: snap.x, y: snap.y, w: snap.width, h: snap.height };
    const { fx, fy } = FACTORS[handle];

    const move = (ev: PointerEvent) => {
      const { scale: s, aspectLock: lock } = latestProps.current;
      const dx = (ev.clientX - startX) / s;
      const dy = (ev.clientY - startY) / s;

      let newW = start.w + fx * dx;
      let newH = start.h + fy * dy;
      let newX = start.x;
      let newY = start.y;
      if (fx < 0) newX = start.x + dx;
      if (fy < 0) newY = start.y + dy;

      const lockAspect = (lock || ev.shiftKey) && fx !== 0 && fy !== 0;
      if (lockAspect) {
        const ratio = start.w / start.h;
        if (Math.abs(dx) > Math.abs(dy)) {
          newH = newW / ratio;
          if (fy < 0) newY = start.y + (start.h - newH);
        } else {
          newW = newH * ratio;
          if (fx < 0) newX = start.x + (start.w - newW);
        }
      }

      const MIN = 20;
      if (newW < MIN) {
        if (fx < 0) newX = start.x + (start.w - MIN);
        newW = MIN;
      }
      if (newH < MIN) {
        if (fy < 0) newY = start.y + (start.h - MIN);
        newH = MIN;
      }

      if (fx === 0) {
        newW = start.w;
        newX = start.x;
      }
      if (fy === 0) {
        newH = start.h;
        newY = start.y;
      }

      latestProps.current.onResize({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const frameRef = useRef<HTMLDivElement>(null);

  const handleRotateStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
    const startRotation = latestProps.current.rotation;

    const move = (ev: PointerEvent) => {
      const angle = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
      let next = startRotation + (angle - startAngle);
      if (ev.shiftKey) next = Math.round(next / 15) * 15;
      latestProps.current.onRotate?.(Math.round(next));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const handleVisual = HANDLE_SIZE / scale;
  const positions: Record<Handle, { hx: number; hy: number }> = {
    nw: { hx: 0, hy: 0 },
    n: { hx: width / 2, hy: 0 },
    ne: { hx: width, hy: 0 },
    e: { hx: width, hy: height / 2 },
    se: { hx: width, hy: height },
    s: { hx: width / 2, hy: height },
    sw: { hx: 0, hy: height },
    w: { hx: 0, hy: height / 2 },
  };

  return (
    <div
      ref={frameRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        pointerEvents: 'none',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          outline: `${2 / scale}px solid #4c9ffe`,
        }}
      />

      {(Object.keys(positions) as Handle[]).map((h) => {
        const p = positions[h];
        return (
          <div
            key={h}
            onPointerDown={handleResizeStart(h)}
            style={{
              position: 'absolute',
              left: p.hx - handleVisual / 2,
              top: p.hy - handleVisual / 2,
              width: handleVisual,
              height: handleVisual,
              background: '#ffffff',
              border: `${2 / scale}px solid #4c9ffe`,
              borderRadius: handleVisual * 0.15,
              cursor: CURSORS[h],
              pointerEvents: 'auto',
              touchAction: 'none',
            }}
          />
        );
      })}

      {allowRotation && (
        <>
          <div
            style={{
              position: 'absolute',
              left: width / 2 - 1 / scale,
              top: -handleVisual * 2.5,
              width: 2 / scale,
              height: handleVisual * 2,
              background: '#4c9ffe',
              pointerEvents: 'none',
            }}
          />
          <div
            onPointerDown={handleRotateStart}
            style={{
              position: 'absolute',
              left: width / 2 - handleVisual / 2,
              top: -handleVisual * 3,
              width: handleVisual,
              height: handleVisual,
              background: '#ffffff',
              border: `${2 / scale}px solid #4c9ffe`,
              borderRadius: '50%',
              cursor: 'grab',
              pointerEvents: 'auto',
              touchAction: 'none',
            }}
          />
        </>
      )}
    </div>
  );
}
