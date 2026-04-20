import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Lock, Trash2, Unlock, Shapes } from 'lucide-react';
import { useSession, type IconGradient, type IconLayer } from '../store/session';
import { Field, NumberInput, Section, SectionTitle } from './ui';
import { LinkControl } from './LinkControl';
import { IconPicker } from './IconPicker';
import { IconGlyph } from './IconGlyph';

function defaultGradient(base: string): IconGradient {
  return { kind: 'linear', from: base, to: '#7c3aed', angle: 180 };
}

function GradientSwatch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <HexColorPicker color={value} onChange={onChange} style={{ width: '100%' }} />
      <div className="mt-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded border border-neutral-700" style={{ background: value }} />
        <input
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </>
  );
}

function GradientEditor({
  gradient,
  onChange,
}: {
  gradient: IconGradient;
  onChange: (g: IconGradient) => void;
}) {
  const preview = `linear-gradient(${gradient.angle}deg, ${gradient.from}, ${gradient.to})`;
  return (
    <div className="space-y-3">
      <div
        className="h-8 rounded border border-neutral-800"
        style={{ background: preview }}
      />
      <Field label="From">
        <GradientSwatch
          value={gradient.from}
          onChange={(from) => onChange({ ...gradient, from })}
        />
      </Field>
      <Field label="To">
        <GradientSwatch
          value={gradient.to}
          onChange={(to) => onChange({ ...gradient, to })}
        />
      </Field>
      <Field label="Angle (°)">
        <NumberInput
          value={gradient.angle}
          onChange={(angle) => onChange({ ...gradient, angle })}
          min={0}
          max={360}
        />
        <input
          type="range"
          min={0}
          max={360}
          value={gradient.angle}
          onChange={(e) =>
            onChange({ ...gradient, angle: Number(e.target.value) })
          }
          className="w-full mt-2 accent-blue-500"
        />
      </Field>
      <div className="grid grid-cols-4 gap-1">
        {[0, 90, 180, 270].map((a) => (
          <button
            key={a}
            onClick={() => onChange({ ...gradient, angle: a })}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2 py-1 text-xs"
          >
            {a}°
          </button>
        ))}
      </div>
    </div>
  );
}

export function IconProperties({ layer }: { layer: IconLayer }) {
  const updateLayer = useSession((s) => s.updateLayer);
  const removeLayer = useSession((s) => s.removeLayer);
  const update = (patch: Partial<IconLayer>) => updateLayer(layer.id, patch);
  const [pickerOpen, setPickerOpen] = useState(false);
  const aspectLocked = layer.aspectLocked ?? true;

  function setWidth(w: number) {
    const next = Math.max(10, w);
    if (aspectLocked) update({ width: next, height: next });
    else update({ width: next });
  }

  function setHeight(h: number) {
    const next = Math.max(10, h);
    if (aspectLocked) update({ width: next, height: next });
    else update({ height: next });
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Icon layer</SectionTitle>

      <LinkControl layer={layer} />

      <button
        onClick={() => setPickerOpen(true)}
        className="w-full flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2 py-2 text-sm"
      >
        <div className="w-8 h-8 rounded border border-neutral-700 flex items-center justify-center shrink-0">
          <IconGlyph
            name={layer.name}
            width={18}
            height={18}
            color={layer.color}
            gradient={layer.gradient}
            strokeWidth={layer.strokeWidth ?? 2}
          />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="truncate">{layer.name}</div>
          <div className="text-[10px] text-neutral-500">Change icon</div>
        </div>
        <Shapes size={14} className="text-neutral-500" />
      </button>

      {pickerOpen && (
        <IconPicker
          initial={layer.name}
          onSelect={(name) => {
            update({ name });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

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

      <Field label="Stroke width">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={40}
            step={1}
            value={layer.strokeWidth ?? 16}
            onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
            className="flex-1 accent-blue-500"
          />
          <div className="w-16">
            <NumberInput
              value={layer.strokeWidth ?? 16}
              onChange={(v) => update({ strokeWidth: Math.max(0.25, v) })}
              min={0.25}
              max={80}
            />
          </div>
        </div>
      </Field>

      <Section label="Color">
        <div className="grid grid-cols-2 gap-1 mb-3">
          <button
            onClick={() => update({ gradient: undefined })}
            className={`px-2 py-1.5 text-xs rounded border ${
              !layer.gradient
                ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            Solid
          </button>
          <button
            onClick={() =>
              update({ gradient: layer.gradient ?? defaultGradient(layer.color) })
            }
            className={`px-2 py-1.5 text-xs rounded border ${
              layer.gradient
                ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            Gradient
          </button>
        </div>

        {!layer.gradient ? (
          <>
            <HexColorPicker color={layer.color} onChange={(c) => update({ color: c })} style={{ width: '100%' }} />
            <div className="mt-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded border border-neutral-700" style={{ background: layer.color }} />
              <input
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
                value={layer.color}
                onChange={(e) => update({ color: e.target.value })}
              />
            </div>
          </>
        ) : (
          <GradientEditor
            gradient={layer.gradient}
            onChange={(gradient) => update({ gradient })}
          />
        )}
      </Section>

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
