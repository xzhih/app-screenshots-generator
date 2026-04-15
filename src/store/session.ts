import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState } from 'zundo';
import { useStore } from 'zustand';
import { PLATFORMS, type Platform } from '../lib/platforms';
import { createDefaultScreenshot } from '../lib/defaults';
import { uid } from '../lib/id';

export type TextLayer = {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800 | 900;
  color: string;
};

export type ImageLayer = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type Background = { from: string; to: string; angle: number };

export type Screenshot = {
  id: string;
  name: string;
  platform: Platform;
  title: TextLayer;
  image: ImageLayer | null;
  background: Background;
};

export type Selection = { kind: 'title' } | { kind: 'image' } | { kind: 'background' } | null;

type SessionState = {
  screenshots: Screenshot[];
  activeId: string | null;
  selection: Selection;

  addScreenshot: (p: Platform) => void;
  duplicateScreenshot: (id: string) => void;
  removeScreenshot: (id: string) => void;
  renameScreenshot: (id: string, name: string) => void;
  setActive: (id: string) => void;

  updateTitle: (patch: Partial<TextLayer>) => void;
  setImage: (src: string, naturalW: number, naturalH: number) => void;
  updateImage: (patch: Partial<ImageLayer>) => void;
  clearImage: () => void;
  updateBackground: (patch: Partial<Background>) => void;

  setSelection: (s: Selection) => void;

  importJSON: (screenshots: Screenshot[]) => void;
};

export const useSession = create<SessionState>()(
  temporal(
    (set, get) => ({
      screenshots: [],
      activeId: null,
      selection: null,

      addScreenshot: (p) => {
        const idx = get().screenshots.filter((s) => s.platform === p).length;
        const next = createDefaultScreenshot(p, idx);
        set((s) => ({
          screenshots: [...s.screenshots, next],
          activeId: next.id,
          selection: { kind: 'title' },
        }));
      },

      duplicateScreenshot: (id) => {
        const src = get().screenshots.find((s) => s.id === id);
        if (!src) return;
        const copy: Screenshot = JSON.parse(JSON.stringify(src));
        copy.id = uid();
        copy.name = `${src.name} copy`;
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

      updateTitle: (patch) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) =>
            x.id === s.activeId ? { ...x, title: { ...x.title, ...patch } } : x,
          ),
        }));
      },

      setImage: (src, naturalW, naturalH) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) => {
            if (x.id !== s.activeId) return x;
            const spec = PLATFORMS[x.platform];
            const targetW = Math.round(spec.width * 0.8);
            const scale = targetW / naturalW;
            const targetH = Math.round(naturalH * scale);
            const px = Math.round((spec.width - targetW) / 2);
            const py = Math.round(spec.height * 0.3);
            return {
              ...x,
              image: {
                src,
                x: px,
                y: py,
                width: targetW,
                height: targetH,
                rotation: 0,
              },
            };
          }),
          selection: { kind: 'image' },
        }));
      },

      updateImage: (patch) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) => {
            if (x.id !== s.activeId || !x.image) return x;
            return { ...x, image: { ...x.image, ...patch } };
          }),
        }));
      },

      clearImage: () => {
        set((s) => ({
          screenshots: s.screenshots.map((x) => (x.id === s.activeId ? { ...x, image: null } : x)),
          selection: s.selection?.kind === 'image' ? null : s.selection,
        }));
      },

      updateBackground: (patch) => {
        set((s) => ({
          screenshots: s.screenshots.map((x) =>
            x.id === s.activeId ? { ...x, background: { ...x.background, ...patch } } : x,
          ),
        }));
      },

      setSelection: (sel) => set({ selection: sel }),

      importJSON: (screenshots) => {
        set({
          screenshots,
          activeId: screenshots[0]?.id ?? null,
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

export const useTemporal = <T,>(selector: (state: TemporalState<Pick<SessionState, 'screenshots'>>) => T) =>
  useStore(useSession.temporal, selector);

export function getActiveScreenshot(): Screenshot | null {
  const s = useSession.getState();
  return s.screenshots.find((x) => x.id === s.activeId) ?? null;
}
