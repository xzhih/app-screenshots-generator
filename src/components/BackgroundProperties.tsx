import { HexColorPicker } from 'react-colorful';
import { useSession } from '../store/session';
import {
  BACKGROUND_PRESETS,
  backgroundCSS,
  type Background,
  type LinearBackground,
  type RadialBackground,
  type SolidBackground,
  type MeshBackground,
} from '../lib/backgrounds';
import { Field, NumberInput, Section, SectionTitle } from './ui';

export function BackgroundProperties() {
  const bg = useSession((s) =>
    s.workspaces.find((w) => w.id === s.activeWorkspaceId)?.background,
  );
  const setBackground = useSession((s) => s.setBackground);
  if (!bg) return null;

  return (
    <div className="space-y-4">
      <SectionTitle>Templates</SectionTitle>
      <div className="grid grid-cols-5 gap-2">
        {BACKGROUND_PRESETS.map((preset) => {
          const active = bg.presetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setBackground(preset.background)}
              title={preset.label}
              className={`aspect-square rounded border transition ${
                active
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-neutral-700 hover:border-neutral-500'
              }`}
              style={{ background: backgroundCSS(preset.background) }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-5 gap-2 -mt-2">
        {BACKGROUND_PRESETS.map((preset) => (
          <div
            key={preset.id}
            className="text-[10px] text-center text-neutral-500 truncate"
          >
            {preset.label}
          </div>
        ))}
      </div>

      <div className="h-px bg-neutral-800" />

      <SectionTitle>Type</SectionTitle>
      <div className="grid grid-cols-4 gap-1">
        {(['linear', 'radial', 'solid', 'mesh'] as const).map((kind) => (
          <button
            key={kind}
            onClick={() => setBackground(convertKind(bg, kind))}
            className={`px-2 py-1.5 text-xs rounded border ${
              bg.kind === kind
                ? 'bg-blue-500/10 border-blue-500 text-blue-300'
                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            {kind}
          </button>
        ))}
      </div>

      {bg.kind === 'linear' && (
        <LinearEditor bg={bg} onChange={setBackground} />
      )}
      {bg.kind === 'radial' && (
        <RadialEditor bg={bg} onChange={setBackground} />
      )}
      {bg.kind === 'solid' && (
        <SolidEditor bg={bg} onChange={setBackground} />
      )}
      {bg.kind === 'mesh' && (
        <MeshEditor bg={bg} onChange={setBackground} />
      )}
    </div>
  );
}

// Derive a "memorized palette" of colors from the current bg. Kinds that
// directly expose multiple colors take those; kinds that don't (solid) fall
// back to a previously stored palette so repeated type switches preserve
// distinct colors instead of collapsing to one.
function derivePalette(bg: Background): string[] {
  switch (bg.kind) {
    case 'linear':
    case 'radial': {
      const rest = bg.palette?.slice(2) ?? [];
      return [bg.from, bg.to, ...rest];
    }
    case 'mesh':
      return [...bg.blobs.map((b) => b.color), bg.base];
    case 'solid': {
      if (bg.palette && bg.palette.length >= 2) {
        return [bg.color, ...bg.palette.slice(1)];
      }
      return [bg.color, bg.color];
    }
  }
}

function convertKind(bg: Background, kind: Background['kind']): Background {
  if (bg.kind === kind) return bg;
  const palette = derivePalette(bg);
  const c0 = palette[0];
  const c1 = palette[1] ?? c0;
  const c2 = palette[2] ?? c0;
  const c3 = palette[3] ?? c1;
  const base = palette[4] ?? c1;
  const presetId = bg.presetId;
  switch (kind) {
    case 'linear':
      return { kind: 'linear', from: c0, to: c1, angle: 180, presetId, palette };
    case 'radial':
      return { kind: 'radial', from: c0, to: c1, presetId, palette };
    case 'solid':
      return { kind: 'solid', color: c0, presetId, palette };
    case 'mesh':
      return {
        kind: 'mesh',
        base,
        blobs: [
          { color: c0, x: 20, y: 25 },
          { color: c1, x: 80, y: 20 },
          { color: c2, x: 30, y: 80 },
          { color: c3, x: 80, y: 80 },
        ],
        presetId,
        palette,
      };
  }
}

// Build a new background from a patch, dropping `presetId` so the template
// highlight clears whenever the user hand-edits a field. `palette` is kept
// so repeated type-switches can still recover hidden colors.
function edit<T extends Background>(bg: T, patch: Partial<Omit<T, 'kind' | 'presetId'>>): T {
  const { presetId: _p, ...rest } = bg;
  return { ...rest, ...patch } as T;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Section label={label}>
      <HexColorPicker color={value} onChange={onChange} style={{ width: '100%' }} />
      <div className="mt-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded border border-neutral-700" style={{ background: value }} />
        <input
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Section>
  );
}

function LinearEditor({ bg, onChange }: { bg: LinearBackground; onChange: (b: Background) => void }) {
  return (
    <>
      <ColorField label="From color" value={bg.from} onChange={(from) => onChange(edit(bg, { from }))} />
      <ColorField label="To color" value={bg.to} onChange={(to) => onChange(edit(bg, { to }))} />
      <Field label="Angle (°)">
        <NumberInput
          value={bg.angle}
          onChange={(angle) => onChange(edit(bg, { angle }))}
          min={0}
          max={360}
        />
        <input
          type="range"
          min={0}
          max={360}
          value={bg.angle}
          onChange={(e) => onChange(edit(bg, { angle: Number(e.target.value) }))}
          className="w-full mt-2"
        />
      </Field>
      <div className="grid grid-cols-4 gap-1">
        {[0, 90, 180, 270].map((a) => (
          <button
            key={a}
            onClick={() => onChange(edit(bg, { angle: a }))}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2 py-1 text-xs"
          >
            {a}°
          </button>
        ))}
      </div>
    </>
  );
}

function RadialEditor({ bg, onChange }: { bg: RadialBackground; onChange: (b: Background) => void }) {
  return (
    <>
      <ColorField label="Center color" value={bg.from} onChange={(from) => onChange(edit(bg, { from }))} />
      <ColorField label="Edge color" value={bg.to} onChange={(to) => onChange(edit(bg, { to }))} />
    </>
  );
}

function SolidEditor({ bg, onChange }: { bg: SolidBackground; onChange: (b: Background) => void }) {
  return (
    <ColorField label="Color" value={bg.color} onChange={(color) => onChange(edit(bg, { color }))} />
  );
}

function MeshEditor({ bg, onChange }: { bg: MeshBackground; onChange: (b: Background) => void }) {
  const updateBlob = (i: number, patch: Partial<MeshBackground['blobs'][number]>) => {
    const blobs = bg.blobs.map((b, idx) => (idx === i ? { ...b, ...patch } : b));
    onChange(edit(bg, { blobs }));
  };
  return (
    <>
      <ColorField label="Base" value={bg.base} onChange={(base) => onChange(edit(bg, { base }))} />
      {bg.blobs.map((blob, i) => (
        <Section key={i} label={`Blob ${i + 1}`}>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="color"
              value={blob.color}
              onChange={(e) => updateBlob(i, { color: e.target.value })}
              className="w-8 h-8 rounded border border-neutral-700 bg-transparent"
            />
            <input
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm font-mono"
              value={blob.color}
              onChange={(e) => updateBlob(i, { color: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X %">
              <NumberInput
                value={blob.x}
                min={0}
                max={100}
                onChange={(x) => updateBlob(i, { x })}
              />
            </Field>
            <Field label="Y %">
              <NumberInput
                value={blob.y}
                min={0}
                max={100}
                onChange={(y) => updateBlob(i, { y })}
              />
            </Field>
          </div>
        </Section>
      ))}
    </>
  );
}
