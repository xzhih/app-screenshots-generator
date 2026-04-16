# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **bun** (see `bun.lock`). Scripts:

- `bun run dev` — Vite dev server with HMR
- `bun run build` — `tsc -b` project-references build, then `vite build`
- `bun run lint` — ESLint flat config across the repo
- `bun run preview` — serve the built bundle

There is **no test runner** configured; don't fabricate a test command.

## Architecture

A single-page editor for generating App Store-style marketing screenshots. Stack: React 19 + TypeScript + Vite 8 + Tailwind v4 (via `@tailwindcss/vite`). No routing, no backend — the whole app is in-memory client state with JSON import/export and PNG download.

### Layout

`App.tsx` composes a fixed three-pane UI: `Toolbar` (top) / `Sidebar` (left, list of screenshots) / `Canvas` (center) / `PropertiesPanel` (right). `useKeyboardShortcuts()` wires global undo/redo/delete at the root.

### State: `src/store/session.ts`

All editor state lives in one `zustand` store wrapped in `zundo`'s `temporal` middleware:

- `partialize` only tracks `screenshots` for undo history — `selection`, `drag`, and `activeId` are **not** undoable on purpose.
- `useSession.temporal.getState().{undo,redo,clear}()` drives history. `importJSON` calls `.clear()` to drop stale history.
- `drag` is the live-drag overlay (snap state, position indicator); `setDrag` / `endDrag` are called by layer components during pointer drags so `Canvas` can render center-line guides and the HUD.

### The layer model

A `Screenshot` has `layers: Layer[]` where `Layer = TextLayer | ImageLayer` (discriminated by `kind`). Array order **is z-order** (last = front). Selection is `{kind: 'layer', id} | {kind: 'background'} | null` — this is what `PropertiesPanel` switches on to pick the editor, and what the delete keybind looks for.

Legacy JSON (before layer refactor) had singleton `title` + `image` fields. `migrate()` in `session.ts` converts those to a layers array on import; the exported JSON `version` is `2`. When changing the `Screenshot`/`Layer` shapes, update `migrate()` and `normalizeBackground()` in `src/lib/backgrounds.ts` in lockstep.

### Platforms and orientation

`src/lib/platforms.ts` defines fixed output resolutions (iPhone 1242×2688, iPad 2064×2752, macOS 2560×1600, tvOS/visionOS 3840×2160). Each platform has a `native` orientation. The current size is derived through `getCanvasSize(screenshot)` which swaps width/height when `screenshot.orientation` differs from the platform's native orientation — **always use `getCanvasSize`**, never read `spec.width/height` directly, or portrait/landscape toggling breaks.

### Backgrounds: `src/lib/backgrounds.ts`

`Background` is a discriminated union: `linear | radial | solid | mesh`. `backgroundCSS(bg)` returns the CSS `background` value used by both the live canvas and PNG export. Two subtle pieces:

- `presetId` is cleared whenever a field is edited so the preset-gallery highlight reflects only true preset state. See `edit()` in `BackgroundProperties.tsx`.
- `palette` is a "memory" of colors carried across kind switches (e.g. linear→solid→mesh) so type-toggling doesn't collapse colors. See `derivePalette` / `convertKind`.

### Canvas rendering (`src/components/Canvas.tsx`)

The canvas is drawn at its **true pixel size** inside a `transform: scale()` wrapper. `scale` is `userScale ?? fitScale`; `fitScale` is recomputed via `ResizeObserver`. Zoom-to-cursor is implemented via `pendingAnchor` stashed between render and `useLayoutEffect`, which adjusts `scrollLeft/Top` so the pointed-at canvas point stays under the pointer. Cmd/Ctrl + wheel (trackpad pinch) also routes through `zoomTo`.

Drags operate in canvas-space. `useDraggable` divides screen-space movement by `scale`. Center-snap logic lives in `src/lib/snap.ts` (threshold in canvas-space px); Shift disables snap. While a drag is active, `Canvas` reads the store's `drag` state to draw the red center-line guides and HUD.

### Export (`src/lib/export.ts`)

PNG export does **not** screenshot the visible editor. It builds a detached DOM tree at full `getCanvasSize` dimensions, replays each layer via `buildImageLayer`/`buildTextLayer`, awaits image `onload`s, and calls `html-to-image`'s `toPng`. The layer DOM produced here must stay in sync with the live renderers in `ImageLayer.tsx` / `TextLayer.tsx` — both paths render the same CSS properties (position, size, rotation, corner radius, text alignment).

### Tailwind v4 gotcha

Tailwind v4's preflight sets `img { max-width: 100%; height: auto }`, which silently clamps image layers. `ImageLayer.tsx` and `export.ts` both set `maxWidth: 'none'`, `maxHeight: 'none'`, `objectFit: 'fill'`, `display: 'block'` explicitly. Preserve those when touching image rendering.


