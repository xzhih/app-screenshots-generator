import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import type { TemporalState } from 'zundo';
import { useStore } from 'zustand';
import { PLATFORMS, type FixedPlatform, type Platform } from '../lib/platforms';
import {
  createDefaultWorkspace,
  createCustomWorkspace,
  createDefaultFrame,
  createTextLayer,
  createImageLayer,
} from '../lib/defaults';
import { uid } from '../lib/id';
import { normalizeBackground, type Background } from '../lib/backgrounds';
import { pickStylePatch } from '../lib/linkedLayers';
import { idbStorage } from './persist';

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
  /** Optional link group: style fields propagate to same-kind siblings in the workspace. */
  linkId?: string;
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
  /** Optional link group: style fields propagate to same-kind siblings in the workspace. */
  linkId?: string;
};

export type Layer = TextLayer | ImageLayer;

export type Orientation = 'portrait' | 'landscape';

export type Frame = {
  id: string;
  name: string;
  layers: Layer[];
  /** Optional per-frame override of the workspace background. */
  background?: Background;
};

export type CustomSize = { width: number; height: number };

export type Workspace = {
  id: string;
  name: string;
  platform: Platform;
  orientation: Orientation;
  /**
   * Present only when platform === 'custom'. Stored as the "native" dimensions
   * (the ones entered at creation); getCanvasSize swaps them when orientation
   * differs from the native orientation, mirroring iPhone/iPad behavior.
   */
  custom?: CustomSize;
  /** Shared default background for frames that don't override. */
  background: Background;
  frames: Frame[];
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
  snapX: boolean;
  snapY: boolean;
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

export function getCanvasSize(
  w: Pick<Workspace, 'platform' | 'orientation' | 'custom'>,
): {
  width: number;
  height: number;
} {
  const base =
    w.platform === 'custom'
      ? w.custom ?? { width: 1080, height: 1920 }
      : PLATFORMS[w.platform];
  const nativeLandscape = base.width > base.height;
  const wantLandscape = w.orientation === 'landscape';
  if (wantLandscape !== nativeLandscape) {
    return { width: base.height, height: base.width };
  }
  return { width: base.width, height: base.height };
}

/** The effective background for a frame: its override or the workspace default. */
export function effectiveBackground(workspace: Workspace, frame: Frame): Background {
  return frame.background ?? workspace.background;
}

export function findFrame(
  workspaces: Workspace[],
  frameId: string | null,
): { workspace: Workspace; frame: Frame } | null {
  if (!frameId) return null;
  for (const w of workspaces) {
    const f = w.frames.find((x) => x.id === frameId);
    if (f) return { workspace: w, frame: f };
  }
  return null;
}

type SessionState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeFrameId: string | null;
  selection: Selection;
  drag: DragState;

  // Workspace
  addWorkspace: (p: FixedPlatform) => void;
  addCustomWorkspace: (name: string, width: number, height: number) => void;
  duplicateWorkspace: (id: string) => void;
  removeWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setActiveWorkspace: (id: string) => void;
  moveWorkspace: (id: string, toIndex: number) => void;
  setOrientation: (o: Orientation) => void;
  setBackground: (bg: Background) => void;

  // Frame (inside active workspace)
  addFrame: () => void;
  duplicateFrame: (id: string) => void;
  removeFrame: (id: string) => void;
  renameFrame: (id: string, name: string) => void;
  setActiveFrame: (id: string) => void;
  moveFrame: (id: string, toIndex: number) => void;

  // Layer (inside active frame)
  addTextLayer: () => void;
  addImageLayer: (src: string, naturalW: number, naturalH: number) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  reorderLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  moveLayer: (id: string, toIndex: number) => void;

  setSelection: (s: Selection) => void;
  setDrag: (d: Partial<DragState>) => void;
  endDrag: () => void;

  importJSON: (workspaces: Workspace[]) => void;
};

function workspaceNameForPlatform(existing: Workspace[], platform: FixedPlatform): string {
  const base = PLATFORMS[platform].label;
  const sameKind = existing.filter((w) => w.platform === platform).length;
  return sameKind === 0 ? base : `${base} ${sameKind + 1}`;
}

function mapActiveWorkspace(
  state: { workspaces: Workspace[]; activeWorkspaceId: string | null },
  fn: (w: Workspace) => Workspace,
): Workspace[] {
  return state.workspaces.map((w) => (w.id === state.activeWorkspaceId ? fn(w) : w));
}

function mapActiveFrame(
  state: {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    activeFrameId: string | null;
  },
  fn: (f: Frame) => Frame,
): Workspace[] {
  return mapActiveWorkspace(state, (w) => ({
    ...w,
    frames: w.frames.map((f) => (f.id === state.activeFrameId ? fn(f) : f)),
  }));
}

/**
 * Move the item with `id` to `toIndex`, clamping to the array bounds after
 * removal. Returns the original array unchanged if `id` isn't found.
 */
function moveInArray<T extends { id: string }>(arr: T[], id: string, toIndex: number): T[] {
  const i = arr.findIndex((x) => x.id === id);
  if (i < 0) return arr;
  const next = [...arr];
  const [item] = next.splice(i, 1);
  const clamped = Math.max(0, Math.min(next.length, toIndex));
  next.splice(clamped, 0, item);
  return next;
}

export const useSession = create<SessionState>()(
  persist(
    temporal(
      (set, get) => ({
        workspaces: [],
        activeWorkspaceId: null,
        activeFrameId: null,
        selection: null,
        drag: EMPTY_DRAG,

        addWorkspace: (p) => {
          const name = workspaceNameForPlatform(get().workspaces, p);
          const ws = createDefaultWorkspace(p, name);
          const firstFrame = ws.frames[0];
          set((s) => ({
            workspaces: [...s.workspaces, ws],
            activeWorkspaceId: ws.id,
            activeFrameId: firstFrame?.id ?? null,
            selection: firstFrame?.layers[0]
              ? { kind: 'layer', id: firstFrame.layers[0].id }
              : null,
          }));
        },

        addCustomWorkspace: (name, width, height) => {
          const ws = createCustomWorkspace(name, width, height);
          const firstFrame = ws.frames[0];
          set((s) => ({
            workspaces: [...s.workspaces, ws],
            activeWorkspaceId: ws.id,
            activeFrameId: firstFrame?.id ?? null,
            selection: firstFrame?.layers[0]
              ? { kind: 'layer', id: firstFrame.layers[0].id }
              : null,
          }));
        },

        duplicateWorkspace: (id) => {
          const src = get().workspaces.find((w) => w.id === id);
          if (!src) return;
          const copy: Workspace = JSON.parse(JSON.stringify(src));
          copy.id = uid();
          copy.name = `${src.name} copy`;
          copy.frames = copy.frames.map((f) => ({
            ...f,
            id: uid(),
            layers: f.layers.map((l) => ({ ...l, id: uid() })),
          }));
          set((s) => ({
            workspaces: [...s.workspaces, copy],
            activeWorkspaceId: copy.id,
            activeFrameId: copy.frames[0]?.id ?? null,
            selection: null,
          }));
        },

        removeWorkspace: (id) => {
          set((s) => {
            const next = s.workspaces.filter((w) => w.id !== id);
            const wasActive = s.activeWorkspaceId === id;
            const nextActive = wasActive ? next[0] ?? null : s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? null;
            return {
              workspaces: next,
              activeWorkspaceId: wasActive ? nextActive?.id ?? null : s.activeWorkspaceId,
              activeFrameId: wasActive ? nextActive?.frames[0]?.id ?? null : s.activeFrameId,
              selection: wasActive ? null : s.selection,
            };
          });
        },

        renameWorkspace: (id, name) => {
          set((s) => ({
            workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
          }));
        },

        setActiveWorkspace: (id) => {
          const ws = get().workspaces.find((w) => w.id === id);
          set({
            activeWorkspaceId: id,
            activeFrameId: ws?.frames[0]?.id ?? null,
            selection: null,
          });
        },

        moveWorkspace: (id, toIndex) => {
          set((s) => ({ workspaces: moveInArray(s.workspaces, id, toIndex) }));
        },

        setOrientation: (o) => {
          set((s) => ({ workspaces: mapActiveWorkspace(s, (w) => ({ ...w, orientation: o })) }));
        },

        setBackground: (bg) => {
          set((s) => ({ workspaces: mapActiveWorkspace(s, (w) => ({ ...w, background: bg })) }));
        },

        addFrame: () => {
          const s = get();
          const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
          if (!ws) return;
          const frame = createDefaultFrame(ws, ws.frames.length);
          set((cur) => ({
            workspaces: mapActiveWorkspace(cur, (w) => ({ ...w, frames: [...w.frames, frame] })),
            activeFrameId: frame.id,
            selection: frame.layers[0] ? { kind: 'layer', id: frame.layers[0].id } : null,
          }));
        },

        duplicateFrame: (id) => {
          set((s) => {
            const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
            if (!ws) return s;
            const i = ws.frames.findIndex((f) => f.id === id);
            if (i < 0) return s;
            const src = ws.frames[i];
            const copy: Frame = {
              ...JSON.parse(JSON.stringify(src)) as Frame,
              id: uid(),
              name: `${src.name} copy`,
              layers: src.layers.map((l) => ({ ...l, id: uid() })),
            };
            return {
              workspaces: mapActiveWorkspace(s, (w) => {
                const frames = [...w.frames];
                frames.splice(i + 1, 0, copy);
                return { ...w, frames };
              }),
              activeFrameId: copy.id,
              selection: null,
            };
          });
        },

        removeFrame: (id) => {
          set((s) => {
            const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
            if (!ws) return s;
            const nextFrames = ws.frames.filter((f) => f.id !== id);
            const wasActive = s.activeFrameId === id;
            const nextActiveFrame = wasActive ? nextFrames[0] ?? null : ws.frames.find((f) => f.id === s.activeFrameId) ?? null;
            return {
              workspaces: mapActiveWorkspace(s, (w) => ({ ...w, frames: nextFrames })),
              activeFrameId: nextActiveFrame?.id ?? null,
              selection: wasActive ? null : s.selection,
            };
          });
        },

        renameFrame: (id, name) => {
          set((s) => ({
            workspaces: mapActiveWorkspace(s, (w) => ({
              ...w,
              frames: w.frames.map((f) => (f.id === id ? { ...f, name } : f)),
            })),
          }));
        },

        setActiveFrame: (id) => set({ activeFrameId: id, selection: null }),

        moveFrame: (id, toIndex) => {
          set((s) => ({
            workspaces: mapActiveWorkspace(s, (w) => ({
              ...w,
              frames: moveInArray(w.frames, id, toIndex),
            })),
          }));
        },

        addTextLayer: () => {
          const s = get();
          const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
          if (!ws) return;
          const layer = createTextLayer(ws);
          set((cur) => ({
            workspaces: mapActiveFrame(cur, (f) => ({ ...f, layers: [...f.layers, layer] })),
            selection: { kind: 'layer', id: layer.id },
          }));
        },

        addImageLayer: (src, naturalW, naturalH) => {
          const s = get();
          const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
          if (!ws) return;
          const layer = createImageLayer(ws, src, naturalW, naturalH);
          set((cur) => ({
            workspaces: mapActiveFrame(cur, (f) => ({ ...f, layers: [...f.layers, layer] })),
            selection: { kind: 'layer', id: layer.id },
          }));
        },

        removeLayer: (id) => {
          set((s) => ({
            workspaces: mapActiveFrame(s, (f) => ({
              ...f,
              layers: f.layers.filter((l) => l.id !== id),
            })),
            selection:
              s.selection?.kind === 'layer' && s.selection.id === id ? null : s.selection,
          }));
        },

        duplicateLayer: (id) => {
          set((s) => ({
            workspaces: mapActiveFrame(s, (f) => {
              const i = f.layers.findIndex((l) => l.id === id);
              if (i < 0) return f;
              const src = f.layers[i];
              const copy: Layer = {
                ...(src as Layer),
                id: uid(),
                x: src.x + 40,
                y: src.y + 40,
              } as Layer;
              const layers = [...f.layers];
              layers.splice(i + 1, 0, copy);
              return { ...f, layers };
            }),
          }));
        },

        updateLayer: (id, patch) => {
          set((s) => {
            // Locate the target within the active workspace so we know its
            // kind + linkId to decide whether to propagate.
            const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId);
            if (!ws) return s;
            let target: Layer | null = null;
            for (const f of ws.frames) {
              const hit = f.layers.find((l) => l.id === id);
              if (hit) {
                target = hit;
                break;
              }
            }
            if (!target) return s;

            const currentLinkId = target.linkId;
            const kind = target.kind;
            const linkIdChanging = 'linkId' in patch;
            const nextLinkId = linkIdChanging ? patch.linkId : currentLinkId;

            // When joining a link group that already has siblings, adopt
            // their current styles so the group is in sync from the moment
            // the link is established. Linking means "be the same".
            let inheritedStyles: Partial<Layer> | null = null;
            if (
              linkIdChanging &&
              nextLinkId &&
              nextLinkId !== currentLinkId
            ) {
              let sibling: Layer | null = null;
              for (const f of ws.frames) {
                const hit = f.layers.find(
                  (l) =>
                    l.id !== id && l.kind === kind && l.linkId === nextLinkId,
                );
                if (hit) {
                  sibling = hit;
                  break;
                }
              }
              if (sibling) {
                inheritedStyles = pickStylePatch(
                  sibling as Partial<Layer>,
                  kind,
                );
              }
            }

            // Edit-time propagation: push style edits to same-kind siblings
            // sharing the target's current linkId. Skipped when the patch is
            // itself a linkId change (identity, not style).
            const rawStylePatch =
              currentLinkId && !linkIdChanging ? pickStylePatch(patch, kind) : null;
            const stylePatch =
              rawStylePatch && Object.keys(rawStylePatch).length > 0 ? rawStylePatch : null;

            return {
              workspaces: mapActiveWorkspace(s, (w) => ({
                ...w,
                frames: w.frames.map((f) => ({
                  ...f,
                  layers: f.layers.map((l) => {
                    if (l.id === id) {
                      // Inherited sibling styles first, then the patch, so
                      // explicit edits always win over inherited ones.
                      return { ...l, ...(inheritedStyles ?? {}), ...patch } as Layer;
                    }
                    if (stylePatch && l.kind === kind && l.linkId === currentLinkId) {
                      return { ...l, ...stylePatch } as Layer;
                    }
                    return l;
                  }),
                })),
              })),
            };
          });
        },

        reorderLayer: (id, direction) => {
          set((s) => ({
            workspaces: mapActiveFrame(s, (f) => {
              const i = f.layers.findIndex((l) => l.id === id);
              if (i < 0) return f;
              const layers = [...f.layers];
              const [item] = layers.splice(i, 1);
              let j = i;
              if (direction === 'up') j = Math.min(layers.length, i + 1);
              else if (direction === 'down') j = Math.max(0, i - 1);
              else if (direction === 'top') j = layers.length;
              else if (direction === 'bottom') j = 0;
              layers.splice(j, 0, item);
              return { ...f, layers };
            }),
          }));
        },

        moveLayer: (id, toIndex) => {
          set((s) => ({
            workspaces: mapActiveFrame(s, (f) => ({
              ...f,
              layers: moveInArray(f.layers, id, toIndex),
            })),
          }));
        },

        setSelection: (sel) => set({ selection: sel }),

        setDrag: (d) => set((s) => ({ drag: { ...s.drag, ...d } })),
        endDrag: () => set({ drag: EMPTY_DRAG }),

        importJSON: (workspaces) => {
          const first = workspaces[0];
          set({
            workspaces,
            activeWorkspaceId: first?.id ?? null,
            activeFrameId: first?.frames[0]?.id ?? null,
            selection: null,
          });
          useSession.temporal.getState().clear();
        },
      }),
      {
        partialize: (s) => ({ workspaces: s.workspaces }),
        limit: 100,
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      },
    ),
    {
      name: 'session',
      version: 2,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        workspaces: s.workspaces,
        activeWorkspaceId: s.activeWorkspaceId,
        activeFrameId: s.activeFrameId,
      }),
      migrate: (persistedState, version) => {
        if (version < 2) {
          return migrateV1ToV2(persistedState);
        }
        return persistedState as Partial<SessionState>;
      },
      onRehydrateStorage: () => () => {
        useSession.temporal.getState().clear();
      },
    },
  ),
);

// --- Legacy migration (v1 flat screenshots → v2 workspaces) ---------------

type LegacyTextFields = {
  x: number;
  y: number;
  width: number;
  rotation?: number;
  text: string;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  align?: TextLayer['align'];
};

type LegacyImageFields = Omit<ImageLayer, 'id' | 'kind'>;

type LegacyScreenshot = {
  id?: string;
  name?: string;
  // Legacy format predates the 'custom' platform, so only fixed platforms are possible.
  platform?: FixedPlatform;
  orientation?: Orientation;
  layers?: Layer[];
  background?: unknown;
  // v0 legacy (title + image singletons)
  title?: LegacyTextFields;
  image?: LegacyImageFields | null;
};

function migrateScreenshotToFrame(s: LegacyScreenshot): {
  platform: FixedPlatform;
  orientation: Orientation;
  background: Background;
  frame: Frame;
} {
  const platform = s.platform ?? 'iphone';
  const orientation = s.orientation ?? PLATFORMS[platform].orientation;
  const background = normalizeBackground(s.background);

  let layers: Layer[];
  if (Array.isArray(s.layers)) {
    layers = s.layers;
  } else {
    layers = [];
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
  }

  return {
    platform,
    orientation,
    background,
    frame: {
      id: s.id ?? uid(),
      name: s.name ?? 'untitled',
      layers,
    },
  };
}

export function legacyScreenshotsToWorkspaces(screenshots: LegacyScreenshot[]): Workspace[] {
  const migrated = screenshots.map(migrateScreenshotToFrame);
  const byPlatform = new Map<FixedPlatform, typeof migrated>();
  for (const item of migrated) {
    if (!byPlatform.has(item.platform)) byPlatform.set(item.platform, []);
    byPlatform.get(item.platform)!.push(item);
  }
  const workspaces: Workspace[] = [];
  let platformCount = 0;
  for (const [platform, items] of byPlatform) {
    platformCount += 1;
    const first = items[0];
    const defaultBg = first.background;
    const defaultBgKey = JSON.stringify(defaultBg);
    const frames: Frame[] = items.map(({ frame, background }) => {
      if (JSON.stringify(background) === defaultBgKey) return frame;
      return { ...frame, background };
    });
    // When the migration encounters multiple frames of the same platform, we
    // inherit orientation from the first — rare but sane fallback since the
    // old model let each screenshot hold its own orientation.
    workspaces.push({
      id: uid(),
      name: byPlatform.size === 1 || platformCount === 1
        ? PLATFORMS[platform].label
        : `${PLATFORMS[platform].label} ${platformCount}`,
      platform,
      orientation: first.orientation,
      background: defaultBg,
      frames,
    });
  }
  return workspaces;
}

function migrateV1ToV2(persistedState: unknown): Partial<SessionState> {
  const st = (persistedState ?? {}) as {
    screenshots?: unknown[];
    activeId?: string | null;
  };
  const screenshots = Array.isArray(st.screenshots) ? (st.screenshots as LegacyScreenshot[]) : [];
  const workspaces = legacyScreenshotsToWorkspaces(screenshots);

  let activeWorkspaceId: string | null = null;
  let activeFrameId: string | null = null;
  if (st.activeId) {
    for (const ws of workspaces) {
      const f = ws.frames.find((fr) => fr.id === st.activeId);
      if (f) {
        activeWorkspaceId = ws.id;
        activeFrameId = f.id;
        break;
      }
    }
  }
  if (!activeWorkspaceId && workspaces.length > 0) {
    activeWorkspaceId = workspaces[0].id;
    activeFrameId = workspaces[0].frames[0]?.id ?? null;
  }
  return { workspaces, activeWorkspaceId, activeFrameId };
}

export const useTemporal = <T,>(
  selector: (state: TemporalState<Pick<SessionState, 'workspaces'>>) => T,
) => useStore(useSession.temporal, selector);
