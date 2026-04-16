import { useRef, useState } from 'react';
import { Lock, Trash2, Unlock, Upload } from 'lucide-react';
import { useSession, type ImageLayer } from '../store/session';
import { Field, NumberInput, SectionTitle } from './ui';
import { fileToDataURL, loadImageDimensions } from '../lib/file';
import { LinkControl } from './LinkControl';

export function ImageProperties({ layer }: { layer: ImageLayer }) {
  const updateLayer = useSession((s) => s.updateLayer);
  const removeLayer = useSession((s) => s.removeLayer);
  const update = (patch: Partial<ImageLayer>) => updateLayer(layer.id, patch);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const aspectLocked = layer.aspectLocked ?? true;
  const lockRatio =
    layer.naturalWidth && layer.naturalHeight
      ? layer.naturalWidth / layer.naturalHeight
      : layer.width > 0 && layer.height > 0
        ? layer.width / layer.height
        : 1;

  function setWidth(w: number) {
    const next = Math.max(10, w);
    if (aspectLocked) {
      update({ width: next, height: Math.max(10, Math.round(next / lockRatio)) });
    } else {
      update({ width: next });
    }
  }

  function setHeight(h: number) {
    const next = Math.max(10, h);
    if (aspectLocked) {
      update({ height: next, width: Math.max(10, Math.round(next * lockRatio)) });
    } else {
      update({ height: next });
    }
  }

  async function replaceWith(file: File) {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await fileToDataURL(file);
    const { width, height } = await loadImageDimensions(dataUrl);
    const ratio = width / height;
    update({
      src: dataUrl,
      height: Math.round(layer.width / ratio),
      naturalWidth: width,
      naturalHeight: height,
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await replaceWith(f);
    e.target.value = '';
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Image layer</SectionTitle>

      <LinkControl layer={layer} />

      <button
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          if (!Array.from(e.dataTransfer.types).includes('Files')) return;
          e.preventDefault();
          dragCounter.current += 1;
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounter.current -= 1;
          if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setDragOver(false);
          }
        }}
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes('Files')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragCounter.current = 0;
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void replaceWith(f);
        }}
        className={`w-full flex items-center justify-center gap-2 border rounded py-2 text-sm transition-colors ${
          dragOver
            ? 'bg-blue-500/10 border-blue-400 border-dashed text-blue-300'
            : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
        }`}
      >
        <Upload size={14} />
        {dragOver ? 'Drop to replace' : 'Replace image'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <NumberInput value={layer.x} onChange={(v) => update({ x: v })} />
        </Field>
        <Field label="Y">
          <NumberInput value={layer.y} onChange={(v) => update({ y: v })} />
        </Field>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Width">
            <NumberInput value={layer.width} onChange={setWidth} min={10} />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => update({ aspectLocked: !aspectLocked })}
          title={aspectLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
          aria-label={aspectLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          className={`mb-0.5 h-8 w-8 flex items-center justify-center rounded border transition-colors ${
            aspectLocked
              ? 'bg-blue-500/15 border-blue-400/60 text-blue-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
          }`}
        >
          {aspectLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        <div className="flex-1">
          <Field label="Height">
            <NumberInput value={layer.height} onChange={setHeight} min={10} />
          </Field>
        </div>
      </div>

      <Field label="Rotation (°)">
        <NumberInput
          value={layer.rotation}
          onChange={(v) => update({ rotation: v })}
          min={-360}
          max={360}
        />
      </Field>

      <Field label="Corner radius (px)">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={Math.round(Math.min(layer.width, layer.height) / 2)}
            value={layer.cornerRadius ?? 0}
            onChange={(e) => update({ cornerRadius: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <div className="w-16">
            <NumberInput
              value={layer.cornerRadius ?? 0}
              onChange={(v) =>
                update({
                  cornerRadius: Math.max(
                    0,
                    Math.min(Math.round(Math.min(layer.width, layer.height) / 2), Math.round(v)),
                  ),
                })
              }
              min={0}
            />
          </div>
        </div>
      </Field>

      <button
        onClick={() => removeLayer(layer.id)}
        className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-red-400 rounded py-2 text-sm"
      >
        <Trash2 size={14} />
        Delete layer
      </button>
    </div>
  );
}
