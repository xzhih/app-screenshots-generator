import { HexColorPicker } from 'react-colorful';
import { useSession } from '../store/session';
import { Field, NumberInput, Section, SectionTitle } from './ui';

export function BackgroundProperties() {
  const bg = useSession((s) => s.screenshots.find((x) => x.id === s.activeId)?.background);
  const update = useSession((s) => s.updateBackground);
  if (!bg) return null;

  return (
    <div className="space-y-4">
      <SectionTitle>Background gradient</SectionTitle>

      <Section label="From color">
        <HexColorPicker color={bg.from} onChange={(c) => update({ from: c })} style={{ width: '100%' }} />
        <div className="mt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-neutral-700" style={{ background: bg.from }} />
          <input
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
            value={bg.from}
            onChange={(e) => update({ from: e.target.value })}
          />
        </div>
      </Section>

      <Section label="To color">
        <HexColorPicker color={bg.to} onChange={(c) => update({ to: c })} style={{ width: '100%' }} />
        <div className="mt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-neutral-700" style={{ background: bg.to }} />
          <input
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
            value={bg.to}
            onChange={(e) => update({ to: e.target.value })}
          />
        </div>
      </Section>

      <Field label="Angle (°)">
        <NumberInput
          value={bg.angle}
          onChange={(v) => update({ angle: v })}
          min={0}
          max={360}
        />
        <input
          type="range"
          min={0}
          max={360}
          value={bg.angle}
          onChange={(e) => update({ angle: Number(e.target.value) })}
          className="w-full mt-2"
        />
      </Field>

      <div className="grid grid-cols-4 gap-1">
        {[0, 90, 180, 270].map((a) => (
          <button
            key={a}
            onClick={() => update({ angle: a })}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2 py-1 text-xs"
          >
            {a}°
          </button>
        ))}
      </div>
    </div>
  );
}
