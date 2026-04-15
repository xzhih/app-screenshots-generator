import { HexColorPicker } from 'react-colorful';
import { useSession } from '../store/session';
import { Field, NumberInput, Section, SectionTitle, TextArea } from './ui';

const WEIGHTS = [400, 500, 600, 700, 800, 900] as const;

export function TextProperties() {
  const title = useSession((s) => s.screenshots.find((x) => x.id === s.activeId)?.title);
  const updateTitle = useSession((s) => s.updateTitle);
  if (!title) return null;

  return (
    <div className="space-y-4">
      <SectionTitle>Text</SectionTitle>

      <Field label="Headline">
        <TextArea
          value={title.text}
          onChange={(v) => updateTitle({ text: v })}
          rows={3}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Font size">
          <NumberInput value={title.fontSize} onChange={(v) => updateTitle({ fontSize: v })} min={8} max={1000} />
        </Field>
        <Field label="Weight">
          <select
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm"
            value={title.fontWeight}
            onChange={(e) => updateTitle({ fontWeight: Number(e.target.value) as 700 })}
          >
            {WEIGHTS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </Field>
      </div>

      <Section label="Color">
        <HexColorPicker color={title.color} onChange={(c) => updateTitle({ color: c })} style={{ width: '100%' }} />
        <div className="mt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-neutral-700" style={{ background: title.color }} />
          <input
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
            value={title.color}
            onChange={(e) => updateTitle({ color: e.target.value })}
          />
        </div>
      </Section>

      <div className="grid grid-cols-3 gap-2">
        <Field label="X">
          <NumberInput value={title.x} onChange={(v) => updateTitle({ x: v })} />
        </Field>
        <Field label="Y">
          <NumberInput value={title.y} onChange={(v) => updateTitle({ y: v })} />
        </Field>
        <Field label="W">
          <NumberInput value={title.width} onChange={(v) => updateTitle({ width: v })} min={10} />
        </Field>
      </div>
    </div>
  );
}
