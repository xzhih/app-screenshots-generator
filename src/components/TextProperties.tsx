import { HexColorPicker } from 'react-colorful';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useSession, type TextLayer, type FontWeight } from '../store/session';
import { Field, NumberInput, Section, SectionTitle, TextArea } from './ui';

const WEIGHTS: FontWeight[] = [400, 500, 600, 700, 800, 900];

export function TextProperties({ layer }: { layer: TextLayer }) {
  const updateLayer = useSession((s) => s.updateLayer);
  const update = (patch: Partial<TextLayer>) => updateLayer(layer.id, patch);

  return (
    <div className="space-y-4">
      <SectionTitle>Text</SectionTitle>

      <Field label="Content">
        <TextArea value={layer.text} onChange={(v) => update({ text: v })} rows={3} />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Font size">
          <NumberInput value={layer.fontSize} onChange={(v) => update({ fontSize: v })} min={8} max={1000} />
        </Field>
        <Field label="Weight">
          <select
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm"
            value={layer.fontWeight}
            onChange={(e) => update({ fontWeight: Number(e.target.value) as FontWeight })}
          >
            {WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Align">
        <div className="grid grid-cols-3 gap-1">
          {(['left', 'center', 'right'] as const).map((a) => {
            const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
            const active = layer.align === a;
            return (
              <button
                key={a}
                onClick={() => update({ align: a })}
                className={`flex items-center justify-center py-1.5 rounded border text-xs ${
                  active
                    ? 'bg-blue-500/10 border-blue-500'
                    : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                <Icon size={13} />
              </button>
            );
          })}
        </div>
      </Field>

      <Section label="Color">
        <HexColorPicker color={layer.color} onChange={(c) => update({ color: c })} style={{ width: '100%' }} />
        <div className="mt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-neutral-700" style={{ background: layer.color }} />
          <input
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
            value={layer.color}
            onChange={(e) => update({ color: e.target.value })}
          />
        </div>
      </Section>

      <div className="grid grid-cols-3 gap-2">
        <Field label="X">
          <NumberInput value={layer.x} onChange={(v) => update({ x: v })} />
        </Field>
        <Field label="Y">
          <NumberInput value={layer.y} onChange={(v) => update({ y: v })} />
        </Field>
        <Field label="W">
          <NumberInput value={layer.width} onChange={(v) => update({ width: v })} min={10} />
        </Field>
      </div>

      <Field label="Rotation (°)">
        <NumberInput
          value={layer.rotation}
          onChange={(v) => update({ rotation: v })}
          min={-360}
          max={360}
        />
      </Field>
    </div>
  );
}
