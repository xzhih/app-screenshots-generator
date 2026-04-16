// Palette is a "memory" of colors carried across type switches. When the
// current background kind (e.g. solid) doesn't expose enough colors to
// round-trip, we restore from here instead of collapsing everything.
type Meta = { presetId?: string; palette?: string[] };

export type LinearBackground = Meta & {
  kind: 'linear';
  from: string;
  to: string;
  angle: number;
};

export type RadialBackground = Meta & {
  kind: 'radial';
  from: string;
  to: string;
};

export type SolidBackground = Meta & {
  kind: 'solid';
  color: string;
};

export type MeshBlob = { color: string; x: number; y: number };

export type MeshBackground = Meta & {
  kind: 'mesh';
  base: string;
  blobs: MeshBlob[];
};

export type Background =
  | LinearBackground
  | RadialBackground
  | SolidBackground
  | MeshBackground;

export function backgroundCSS(bg: Background): string {
  switch (bg.kind) {
    case 'linear':
      return `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`;
    case 'radial':
      return `radial-gradient(circle at center, ${bg.from}, ${bg.to})`;
    case 'solid':
      return bg.color;
    case 'mesh': {
      const layers = bg.blobs
        .map((b) => `radial-gradient(at ${b.x}% ${b.y}%, ${b.color}, transparent 55%)`)
        .join(', ');
      return `${layers}, ${bg.base}`;
    }
  }
}

export type BackgroundPreset = {
  id: string;
  label: string;
  background: Background;
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'ocean',
    label: 'Ocean',
    background: { kind: 'linear', from: '#E8F1F8', to: '#7AA3C4', angle: 180, presetId: 'ocean' },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    background: { kind: 'linear', from: '#FFB88C', to: '#DE6262', angle: 200, presetId: 'sunset' },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    background: {
      kind: 'mesh',
      base: '#1B1036',
      blobs: [
        { color: '#7C3AED', x: 15, y: 20 },
        { color: '#EC4899', x: 85, y: 25 },
        { color: '#06B6D4', x: 30, y: 85 },
        { color: '#22D3EE', x: 80, y: 80 },
      ],
      presetId: 'aurora',
    },
  },
  {
    id: 'spotlight',
    label: 'Spotlight',
    background: { kind: 'radial', from: '#FDE68A', to: '#7C2D12', presetId: 'spotlight' },
  },
  {
    id: 'glassmorphism',
    label: 'Glass',
    background: {
      kind: 'mesh',
      base: '#F5F3FF',
      blobs: [
        { color: '#C7D2FE', x: 18, y: 22 },
        { color: '#FBCFE8', x: 82, y: 24 },
        { color: '#A7F3D0', x: 25, y: 78 },
        { color: '#BAE6FD', x: 80, y: 76 },
      ],
      presetId: 'glassmorphism',
    },
  },
];

export const DEFAULT_BACKGROUND: Background = BACKGROUND_PRESETS[0].background;

// Migrate legacy `{from, to, angle}` shape from old files.
export function normalizeBackground(bg: unknown): Background {
  if (!bg || typeof bg !== 'object') return DEFAULT_BACKGROUND;
  const b = bg as Record<string, unknown>;
  if (typeof b.kind === 'string') return bg as Background;
  if (
    typeof b.from === 'string' &&
    typeof b.to === 'string' &&
    typeof b.angle === 'number'
  ) {
    return { kind: 'linear', from: b.from, to: b.to, angle: b.angle };
  }
  return DEFAULT_BACKGROUND;
}
