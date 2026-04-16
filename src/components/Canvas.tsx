import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { useSession, getCanvasSize } from '../store/session';
import { TextLayer } from './TextLayer';
import { ImageLayer } from './ImageLayer';
import { SelectionFrame } from './SelectionFrame';
import { fileToDataURL, loadImageDimensions } from '../lib/file';
import { backgroundCSS } from '../lib/backgrounds';

const MIN_SCALE = 0.02;
const MAX_SCALE = 4;
const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

export function Canvas() {
  const active = useSession((s) => s.screenshots.find((x) => x.id === s.activeId) ?? null);
  const selection = useSession((s) => s.selection);
  const setSelection = useSession((s) => s.setSelection);
  const addImageLayer = useSession((s) => s.addImageLayer);
  const updateLayer = useSession((s) => s.updateLayer);
  const drag = useSession((s) => s.drag);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(0.25);
  const [userScale, setUserScale] = useState<number | null>(null); // null = auto fit
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const pendingAnchor = useRef<{
    canvasX: number;
    canvasY: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const size = active ? getCanvasSize(active) : null;
  const scale = userScale ?? fitScale;

  // Recompute fit scale when canvas size or container size changes.
  useEffect(() => {
    if (!size) return;
    const recalc = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 80;
      const w = el.clientWidth - pad;
      const h = el.clientHeight - pad;
      const s = Math.min(w / size.width, h / size.height);
      setFitScale(Math.max(MIN_SCALE, s));
    };
    recalc();
    const obs = new ResizeObserver(recalc);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [size?.width, size?.height]);

  // Reset user zoom when switching canvas.
  useEffect(() => {
    setUserScale(null);
  }, [active?.id]);

  // Apply a zoom, anchoring the given viewport point (or the viewport center).
  const zoomTo = (nextRaw: number, viewportPoint?: { x: number; y: number }) => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !size) return;
    const current = userScale ?? fitScale;
    const next = clamp(nextRaw);
    if (next === current) return;
    const rect = scrollEl.getBoundingClientRect();
    const px = viewportPoint?.x ?? rect.width / 2;
    const py = viewportPoint?.y ?? rect.height / 2;

    // Wrapper is at least viewport-sized. Canvas is centered within wrapper.
    const displayWCur = size.width * current;
    const displayHCur = size.height * current;
    const wrapperWCur = Math.max(rect.width, displayWCur + 160);
    const wrapperHCur = Math.max(rect.height, displayHCur + 160);
    const canvasOffsetXCur = (wrapperWCur - displayWCur) / 2;
    const canvasOffsetYCur = (wrapperHCur - displayHCur) / 2;
    const canvasX = (scrollEl.scrollLeft + px - canvasOffsetXCur) / current;
    const canvasY = (scrollEl.scrollTop + py - canvasOffsetYCur) / current;

    pendingAnchor.current = { canvasX, canvasY, mouseX: px, mouseY: py };
    setUserScale(next);
  };

  // Cmd/Ctrl + wheel (trackpad pinch) — anchor on cursor.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !size) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = scrollEl.getBoundingClientRect();
      const current = userScale ?? fitScale;
      const factor = -e.deltaY > 0 ? 1.1 : 1 / 1.1;
      zoomTo(current * factor, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    scrollEl.addEventListener('wheel', onWheel, { passive: false });
    return () => scrollEl.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitScale, userScale, size?.width, size?.height]);

  // After zoom, adjust scroll so the anchor point stays under the same viewport pixel.
  useLayoutEffect(() => {
    const anchor = pendingAnchor.current;
    if (!anchor || !size) return;
    pendingAnchor.current = null;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const newScale = userScale ?? fitScale;
    const rect = scrollEl.getBoundingClientRect();
    const displayWNew = size.width * newScale;
    const displayHNew = size.height * newScale;
    const wrapperWNew = Math.max(rect.width, displayWNew + 160);
    const wrapperHNew = Math.max(rect.height, displayHNew + 160);
    const canvasOffsetXNew = (wrapperWNew - displayWNew) / 2;
    const canvasOffsetYNew = (wrapperHNew - displayHNew) / 2;
    scrollEl.scrollLeft = canvasOffsetXNew + anchor.canvasX * newScale - anchor.mouseX;
    scrollEl.scrollTop = canvasOffsetYNew + anchor.canvasY * newScale - anchor.mouseY;
  }, [userScale, fitScale, size?.width, size?.height]);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0 || !active) return;
    for (const f of arr) {
      const dataUrl = await fileToDataURL(f);
      const { width, height } = await loadImageDimensions(dataUrl);
      addImageLayer(dataUrl, width, height);
    }
  }

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!active) return;
      if (!Array.from(e.dataTransfer.types).includes('Files')) return;
      e.preventDefault();
      dragCounter.current += 1;
      setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setDragOver(false);
      }
    },
    onDragOver: (e: React.DragEvent) => {
      if (!active) return;
      if (!Array.from(e.dataTransfer.types).includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDragOver(false);
      if (!active) return;
      void handleFiles(e.dataTransfer.files);
    },
  };

  if (!active || !size) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center text-neutral-500 select-none"
      >
        <div className="text-center">
          <div className="text-lg mb-2">No screenshot selected</div>
          <div className="text-sm text-neutral-600">Click "+ New" in the sidebar to begin.</div>
        </div>
      </div>
    );
  }

  const displayW = size.width * scale;
  const displayH = size.height * scale;
  const selectedLayerId = selection?.kind === 'layer' ? selection.id : null;
  const selectedLayer =
    selectedLayerId !== null
      ? active.layers.find((l) => l.id === selectedLayerId) ?? null
      : null;
  const selectedImageRatio =
    selectedLayer?.kind === 'image' &&
    selectedLayer.naturalWidth &&
    selectedLayer.naturalHeight
      ? selectedLayer.naturalWidth / selectedLayer.naturalHeight
      : undefined;
  const fitted = userScale === null;

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden" {...dropHandlers}>
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-auto"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelection(null);
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            minWidth: '100%',
            minHeight: '100%',
            width: displayW + 160,
            height: displayH + 160,
          }}
        >
        <div
          className="relative shrink-0"
          style={{ width: displayW, height: displayH }}
        >
        <div
          className="absolute top-0 left-0 shadow-2xl"
          style={{
            width: size.width,
            height: size.height,
            background: backgroundCSS(active.background),
            overflow: 'hidden',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelection({ kind: 'background' });
          }}
        >
          {active.layers.map((layer) =>
            layer.kind === 'text' ? (
              <TextLayer
                key={layer.id}
                layer={layer}
                scale={scale}
                canvasWidth={size.width}
                canvasHeight={size.height}
                selected={selectedLayerId === layer.id}
              />
            ) : (
              <ImageLayer
                key={layer.id}
                layer={layer}
                scale={scale}
                canvasWidth={size.width}
                canvasHeight={size.height}
              />
            ),
          )}

          {selectedLayer?.kind === 'image' && (
            <SelectionFrame
              x={selectedLayer.x}
              y={selectedLayer.y}
              width={selectedLayer.width}
              height={selectedLayer.height}
              rotation={selectedLayer.rotation}
              scale={scale}
              allowRotation
              aspectLock={selectedLayer.aspectLocked ?? true}
              aspectRatio={selectedImageRatio}
              canvasWidth={size.width}
              canvasHeight={size.height}
              onResize={(patch) => updateLayer(selectedLayer.id, patch)}
              onRotate={(rotation) => updateLayer(selectedLayer.id, { rotation })}
            />
          )}

          {drag.active && drag.snapX && (
            <div
              style={{
                position: 'absolute',
                left: size.width / 2 - 1 / scale,
                top: 0,
                width: 2 / scale,
                height: size.height,
                background: '#f43f5e',
                pointerEvents: 'none',
              }}
            />
          )}
          {drag.active && drag.snapY && (
            <div
              style={{
                position: 'absolute',
                top: size.height / 2 - 1 / scale,
                left: 0,
                height: 2 / scale,
                width: size.width,
                background: '#f43f5e',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
        </div>
      </div>
      </div>

      {/* Zoom control */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-neutral-900/90 border border-neutral-700 rounded px-1 py-1 text-xs shadow-lg">
        <button
          onClick={() => zoomTo(zoomOut(scale))}
          title="Zoom out"
          className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
        >
          <Minus size={12} />
        </button>
        <ZoomInput
          scale={scale}
          onCommit={(s) => zoomTo(s)}
        />
        <button
          onClick={() => zoomTo(zoomIn(scale))}
          title="Zoom in"
          className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
        >
          <Plus size={12} />
        </button>
        <div className="w-px h-4 bg-neutral-700 mx-0.5" />
        <button
          onClick={() => setUserScale(null)}
          title="Fit to window"
          className={`p-1 rounded hover:bg-neutral-800 ${
            fitted ? 'text-blue-400' : 'text-neutral-300'
          }`}
        >
          <Maximize2 size={12} />
        </button>
        <div className="text-[10px] text-neutral-500 font-mono pl-1 pr-1">
          {size.width}×{size.height}
        </div>
      </div>

      {drag.active && (
        <div className="absolute top-3 left-3 bg-neutral-900/90 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-neutral-200 pointer-events-none shadow-lg">
          x: {drag.x} · y: {drag.y} · {drag.width}×{drag.height}
        </div>
      )}

      {dragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-4 border-2 border-dashed border-blue-400 rounded-lg bg-blue-500/10" />
          <div className="relative bg-blue-600 text-white rounded-lg px-4 py-2 text-sm shadow-lg">
            Drop image to add as a new layer
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(s: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

function zoomIn(current: number): number {
  const next = ZOOM_STEPS.find((v) => v > current + 0.001);
  return next ?? current * 1.25;
}

function zoomOut(current: number): number {
  const next = [...ZOOM_STEPS].reverse().find((v) => v < current - 0.001);
  return next ?? current / 1.25;
}

function ZoomInput({ scale, onCommit }: { scale: number; onCommit: (s: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = parseFloat(draft);
          if (Number.isFinite(v) && v > 0) onCommit(v / 100);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-12 bg-neutral-800 border border-neutral-700 rounded px-1 text-xs text-center font-mono text-neutral-100 focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft((scale * 100).toFixed(0));
        setEditing(true);
      }}
      className="w-12 text-center font-mono text-neutral-100 hover:bg-neutral-800 rounded px-1"
      title="Set zoom"
    >
      {(scale * 100).toFixed(0)}%
    </button>
  );
}
