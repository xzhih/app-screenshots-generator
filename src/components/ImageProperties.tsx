import { useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useSession } from '../store/session';
import { Field, NumberInput, SectionTitle } from './ui';
import { fileToDataURL, loadImageDimensions } from '../lib/file';

export function ImageProperties() {
  const image = useSession((s) => s.screenshots.find((x) => x.id === s.activeId)?.image ?? null);
  const updateImage = useSession((s) => s.updateImage);
  const setImage = useSession((s) => s.setImage);
  const clearImage = useSession((s) => s.clearImage);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataURL(f);
    const { width, height } = await loadImageDimensions(dataUrl);
    setImage(dataUrl, width, height);
    e.target.value = '';
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Screenshot</SectionTitle>

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded py-2 text-sm"
      >
        <Upload size={14} />
        {image ? 'Replace image' : 'Upload image'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {image && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <NumberInput value={image.x} onChange={(v) => updateImage({ x: v })} />
            </Field>
            <Field label="Y">
              <NumberInput value={image.y} onChange={(v) => updateImage({ y: v })} />
            </Field>
            <Field label="Width">
              <NumberInput value={image.width} onChange={(v) => updateImage({ width: v })} min={10} />
            </Field>
            <Field label="Height">
              <NumberInput value={image.height} onChange={(v) => updateImage({ height: v })} min={10} />
            </Field>
          </div>

          <Field label="Rotation (°)">
            <NumberInput
              value={image.rotation}
              onChange={(v) => updateImage({ rotation: v })}
              min={-360}
              max={360}
            />
          </Field>

          <button
            onClick={clearImage}
            className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-red-400 rounded py-2 text-sm"
          >
            <Trash2 size={14} />
            Remove image
          </button>
        </>
      )}
    </div>
  );
}
