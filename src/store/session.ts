import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState } from 'zundo';
import { useStore } from 'zustand';
import { PLATFORMS, type Platform } from '../lib/platforms';
import { createDefaultScreenshot, createTextLayer, createImageLayer } from '../lib/defaults';
import { uid } from '../lib/id';
import { normalizeBackground, type Background } from '../lib/backgrounds';

export type { Background } from '../lib/backgrounds';

export type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;

export type TextLayer = {
  id: string;
  kind: 'text';
  x: number;
  y: number;
  width: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  align: 'left' | 'center' | 'right';
};

export type ImageLayer = {
  id: string;
  kind: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  src: string;
  aspectLocked?: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
  /** Corner radius in canvas-space pixels. Undefined means 0. */
  cornerRadius?: number;
};

export type Layer = TextLayer | ImageLayer;

export type Orientation = 'portrait' | 'landscape';

export type Screenshot = {
  id: string;
  name: string;
  platform: Platform;
  orientation: Orientation;
  layers: Layer[];
  background: Background;
};

export type Selection =
  | { kind: 'layer'; id: string }
  | { kind: 'background' }
  | null;

export type DragState = {
  active: boolean;
  layerId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  snapX: boolean; // dragged element snapped to canvas vertical center line
  snapY: boolean; // dragged element snapped to canvas horizontal center line
};

const EMPTY_DRAG: DragState = {
  active: false,
  layerId: null,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  snapX: false,
  snapY: false,
};

export function getCanvasSize(s: Pick<Screenshot, 'platform' | 'orientation'>): { width: number; height: number } {
  const spec = PLATFORMS[s.platform];
  const wantLandscape = s.orientation === 'landscape';
  const isNativeLandscape = spec.orientation === 'landscape';
  if (wantLandscape !== isNativeLandscape) {
    return { width: spec.height, height: spec.width };
  }
  return { width: spec.width, height: spec.height };
}

type SessionState = {
  screenshots: Screenshot[];
  activeId: string | null;
  selection: Selection;
  drag: DragState;

  addScreenshot: (p: Platform) => void;
  duplicateScreenshot: (id: string) => void;
  removeScreenshot: (id: string) => void;
  renameScreenshot: (id: string, name: string) => void;
  setActive: (id: string) => void;
  setOrientation: (o: Orientation) => void;

  addTextLayer: () => void;
  addImageLayer: (src: string, naturalW: number, naturalH: number) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  reorderLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;

  setBackground: (bg: Background) => void;

  setSelection: (s: Selection) => void;
  setDrag: (d: Partial<DragState>) => void;
  endDrag: () => void;

  importJSON: (screenshots: Screenshot[]) => void;
};

export const useSession = create<SessionState>()(
  temporal(
    (set, get) => ({
      screenshots: [],
      activeId: null,
      selection: null,
      drag: EMPTY_DRAG,

      addScreenshot: (p) => {
        const idx = get().screenshots.filter((s) => s.platform === p).length;
        const next = createDefaultScreenshot(p, idx);
        set((s) => ({
          screenshots: [...s.screenshots, next],
          activeId: next.id,
          selection: next.layers[0] ? { kind: 'layer', id: next.layers[0].id } : null,
        }));
      },

      duplicateScreenshot: (id) => {
        const src = get().screenshots.find((s) => s.id === id);
        if (!src) return;
        const copy: Screenshot = JSON.parse(JSON.stringify(src));
        copy.id = uid();
        copy.name = `${src.name} copy`;
        copy.layers = copy.layers.map((l) => ({ ...l, id: uid() }));
        set((s) => ({ screenshots: [...s.screenshots, copy], activeId: copy.id }));
      },

      removeScreenshot: (id) => {
        set((s) => {
          const next = s.screenshots.filter((x) => x.id !== id);
          const wasActive = s.activeId === id;
          return {
            screenshots: next,
            activeId: wasActive ? next[0]?.id ?? null : s.activeId,
            selection: wasActive ? null : s.selection,
          };
        });
      },

      renameScreenshot: (id, name) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) => (x.id === id ? { ...x, name } : x)),
        }));
      },

      setActive: (id) => set({ activeId: id, selection: null }),

      setOrientation: (o) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) =>
            x.id === s.activeId ? { ...x, orientation: o } : x,
          ),
        }));
      },

      addTextLayer: () => {
        const active = get().screenshots.find((x) => x.id === get().activeId);
        if (!active) return;
        const layer = createTextLayer(active);
        set((s) => ({
          screenshots: s.screenshots.map((x) =>
            x.id === s.activeId ? { ...x, layers: [...x.layers, layer] } : x,
          ),
          selection: { kind: 'layer', id: layer.id },
        }));
      },

      addImageLayer: (src, naturalW, naturalH) => {
        const active = get().screenshots.find((x) => x.id === get().activeId);
        if (!active) return;
        const layer = createImageLayer(active, src, naturalW, naturalH);
        set((s) => ({
          screenshots: s.screenshots.map((x) =>
            x.id === s.activeId ? { ...x, layers: [...x.layers, layer] } : x,
          ),
          selection: { kind: 'layer', id: layer.id },
        }));
      },

      removeLayer: (id) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) =>
            x.id === s.activeId ? { ...x, layers: x.layers.filter((l) => l.id !== id) } : x,
          ),
          selection:
            s.selection?.kind === 'layer' && s.selection.id === id ? null : s.selection,
        }));
      },

      duplicateLayer: (id) => {
        set((s) => {
          const screenshots = s.screenshots.map((x) => {
            if (x.id !== s.activeId) return x;
            const i = x.layers.findIndex((l) => l.id === id);
            if (i < 0) return x;
            const src = x.layers[i];
            const copy: Layer = { ...(src as Layer), id: uid(), x: src.x + 40, y: src.y + 40 } as Layer;
            const layers = [...x.layers];
            layers.splice(i + 1, 0, copy);
            return { ...x, layers };
          });
          return { screenshots };
        });
      },

      updateLayer: (id, patch) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) => {
            if (x.id !== s.activeId) return x;
            return {
              ...x,
              layers: x.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)),
            };
          }),
        }));
      },

      reorderLayer: (id, direction) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) => {
            if (x.id !== s.activeId) return x;
            const i = x.layers.findIndex((l) => l.id === id);
            if (i < 0) return x;
            const layers = [...x.layers];
            const [item] = layers.splice(i, 1);
            let j = i;
            if (direction === 'up') j = Math.min(layers.length, i + 1);
            else if (direction === 'down') j = Math.max(0, i - 1);
            else if (direction === 'top') j = layers.length;
            else if (direction === 'bottom') j = 0;
            layers.splice(j, 0, item);
            return { ...x, layers };
          }),
        }));
      },

      setBackground: (bg) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) =>
            x.id === s.activeId ? { ...x, background: bg } : x,
          ),
        }));
      },

      setSelection: (sel) => set({ selection: sel }),

      setDrag: (d) => set((s) => ({ drag: { ...s.drag, ...d } })),
      endDrag: () => set({ drag: EMPTY_DRAG }),

      importJSON: (screenshots) => {
        // Migrate legacy schema (title + image singletons) to layers[]
        const migrated = screenshots.map(migrate);
        set({
          screenshots: migrated,
          activeId: migrated[0]?.id ?? null,
          selection: null,
        });
        useSession.temporal.getState().clear();
      },
    }),
    {
      partialize: (s) => ({ screenshots: s.screenshots }),
      limit: 100,
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    },
  ),
);

type LegacyScreenshot = Partial<Screenshot> & {
  title?: Omit<TextLayer, 'id' | 'kind' | 'rotation' | 'align'> & { rotation?: number; align?: TextLayer['align'] };
  image?: Omit<ImageLayer, 'id' | 'kind'> | null;
};

function migrate(s: LegacyScreenshot): Screenshot {
  if (Array.isArray(s.layers)) {
    return {
      id: s.id ?? uid(),
      name: s.name ?? 'untitled',
      platform: s.platform ?? 'iphone',
      orientation: s.orientation ?? PLATFORMS[s.platform ?? 'iphone'].orientation,
      layers: s.layers,
      background: normalizeBackground(s.background),
    };
  }
  const layers: Layer[] = [];
  if (s.image) {
    layers.push({ id: uid(), kind: 'image', ...s.image });
  }
  if (s.title) {
    layers.push({
      id: uid(),
      kind: 'text',
      x: s.title.x,
      y: s.title.y,
      width: s.title.width,
      rotation: s.title.rotation ?? 0,
      text: s.title.text,
      fontSize: s.title.fontSize,
      fontWeight: s.title.fontWeight,
      color: s.title.color,
      align: s.title.align ?? 'left',
    });
  }
  return {
    id: s.id ?? uid(),
    name: s.name ?? 'untitled',
    platform: s.platform ?? 'iphone',
    orientation: s.orientation ?? PLATFORMS[s.platform ?? 'iphone'].orientation,
    layers,
    background: normalizeBackground(s.background),
  };
}
export const useTemporal = <T,>(selector: (state: TemporalState<Pick<SessionState, 'screenshots'>>) => T) =>
  useStore(useSession.temporal, selector);
