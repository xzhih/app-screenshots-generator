import { useEffect, useRef, useState } from 'react';
import { useSession } from '../store/session';
import { PLATFORMS } from '../lib/platforms';
import { TextLayer } from './TextLayer';
import { ImageLayer } from './ImageLayer';
import { fileToDataURL, loadImageDimensions } from '../lib/file';

export function Canvas() {
  const active = useSession((s) => s.screenshots.find((x) => x.id === s.activeId) ?? null);
  const setSelection = useSession((s) => s.setSelection);
  const setImage = useSession((s) => s.setImage);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (!active) return;
    const spec = PLATFORMS[active.platform];
    const recalc = () => {
      const el = containerRef.current;
      if (!el) return;
      const pad = 80;
      const w = el.clientWidth - pad;
      const h = el.clientHeight - pad;
      const s = Math.min(w / spec.width, h / spec.height);
      setScale(Math.max(0.05, s));
    };
    recalc();
    const obs = new ResizeObserver(recalc);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [active?.platform]);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0 || !active) return;
    const f = arr[0];
    const dataUrl = await fileToDataURL(f);
    const { width, height } = await loadImageDimensions(dataUrl);
    setImage(dataUrl, width, height);
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

  if (!active) {
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

  const spec = PLATFORMS[active.platform];
  const displayW = spec.width * scale;
  const displayH = spec.height * scale;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelection(null);
      }}
      {...dropHandlers}
    >
      <div
        className="absolute"
        style={{
          left: `calc(50% - ${displayW / 2}px)`,
          top: `calc(50% - ${displayH / 2}px)`,
          width: displayW,
          height: displayH,
        }}
      >
        <div
          className="relative shadow-2xl"
          style={{
            width: spec.width,
            height: spec.height,
            background: `linear-gradient(${active.background.angle}deg, ${active.background.from}, ${active.background.to})`,
            overflow: 'hidden',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelection({ kind: 'background' });
          }}
        >
          <ImageLayer screenshot={active} scale={scale} />
          <TextLayer screenshot={active} scale={scale} />
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-xs text-neutral-500 bg-neutral-900/70 px-2 py-1 rounded pointer-events-none">
        {spec.width} × {spec.height} · {(scale * 100).toFixed(0)}%
      </div>

      {dragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-4 border-2 border-dashed border-blue-400 rounded-lg bg-blue-500/10" />
          <div className="relative bg-blue-600 text-white rounded-lg px-4 py-2 text-sm shadow-lg">
            Drop image to {active.image ? 'replace' : 'set'} screenshot
          </div>
        </div>
      )}
    </div>
  );
}
