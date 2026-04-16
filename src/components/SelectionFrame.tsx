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
  /** Aspect ratio (w/h) to enforce when locked; defaults to current width/height. */
  aspectRatio?: number;
  canvasWidth?: number;
  canvasHeight?: number;
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
  aspectRatio,
  onResize,
  onRotate,
}: Props) {
  // canvasWidth/canvasHeight reserved for future edge snapping; not yet used.
  const latestProps = useRef({ x, y, width, height, rotation, scale, aspectLock, aspectRatio, onResize, onRotate });
  latestProps.current = { x, y, width, height, rotation, scale, aspectLock, aspectRatio, onResize, onRotate };

  const handleResizeStart = (handle: Handle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const snap = { ...latestProps.current };
    const { fx, fy } = FACTORS[handle];
    const MIN = 20;

    // Determine the locked aspect ratio (may toggle with shift mid-drag).
    // The "canonical" ratio when locked is the explicit aspectRatio (image's
    // natural ratio), falling back to the current dims' ratio.
    const canonicalRatio =
      snap.aspectRatio && snap.aspectRatio > 0
        ? snap.aspectRatio
        : snap.height > 0
          ? snap.width / snap.height
          : 1;

    // Conform start dimensions to canonical ratio when locked, so subsequent
    // math is just uniform scaling. Without this, clicking a handle on a
    // drifted box would cause a visible jump on the first pointermove.
    let sx = snap.x;
    let sy = snap.y;
    let sw = snap.width;
    let sh = snap.height;
    if (snap.aspectLock) {
      const conformedW = Math.max(MIN, Math.round(sh * canonicalRatio));
      const conformedH = Math.max(MIN, Math.round(conformedW / canonicalRatio));
      // Anchor conform around the FAR corner from this handle so the dragged
      // corner stays under the cursor on the first move.
      const dw = conformedW - sw;
      const dh = conformedH - sh;
      if (fx < 0) sx -= dw;
      else if (fx === 0) sx -= dw / 2;
      if (fy < 0) sy -= dh;
      else if (fy === 0) sy -= dh / 2;
      sw = conformedW;
      sh = conformedH;
    }
    const start = { x: sx, y: sy, w: sw, h: sh };

    const move = (ev: PointerEvent) => {
      const { scale: viewScale, aspectLock: lock } = latestProps.current;
      const dx = (ev.clientX - startX) / viewScale;
      const dy = (ev.clientY - startY) / viewScale;
      const lockAspect = lock || ev.shiftKey;
      const ratio = canonicalRatio;

      let newW: number;
      let newH: number;

      if (lockAspect) {
        // Uniform scale `k` of start dims (which already conform to ratio).
        let k: number;
        if (fx !== 0 && fy !== 0) {
          // Corner: project cursor delta onto locked-ratio diagonal.
          const denom = start.w * start.w + start.h * start.h;
          k = 1 + (start.w * (fx * dx) + start.h * (fy * dy)) / denom;
        } else if (fx !== 0) {
          // East/West edge.
          k = (start.w + fx * dx) / start.w;
        } else {
          // North/South edge.
          k = (start.h + fy * dy) / start.h;
        }
        const minK = Math.max(MIN / start.w, MIN / start.h);
        if (k < minK) k = minK;
        newW = Math.max(MIN, Math.round(start.w * k));
        newH = Math.max(MIN, Math.round(newW / ratio));
      } else {
        // Free transform.
        newW = fx === 0 ? start.w : Math.max(MIN, Math.round(start.w + fx * dx));
        newH = fy === 0 ? start.h : Math.max(MIN, Math.round(start.h + fy * dy));
      }

      // Anchor at the far corner/edge from the dragged handle.
      let newX = start.x;
      let newY = start.y;
      if (fx < 0) newX = start.x + (start.w - newW);
      else if (fx === 0 && lockAspect) newX = start.x + (start.w - newW) / 2;
      if (fy < 0) newY = start.y + (start.h - newH);
      else if (fy === 0 && lockAspect) newY = start.y + (start.h - newH) / 2;

      latestProps.current.onResize({
        x: Math.round(newX),
        y: Math.round(newY),
        width: newW,
        height: newH,
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
