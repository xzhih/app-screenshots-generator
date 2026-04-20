import dynamicIconImports from 'lucide-react/dynamicIconImports';

export type IconNode = Array<[string, Record<string, string>]>;

const cache = new Map<string, Promise<IconNode>>();

/**
 * Load a lucide icon's primitive node array (`[tag, attrs][]`) by name.
 * Shared between live canvas renderer and PNG export so both build the same
 * SVG structure.
 */
export function loadIconNode(name: string): Promise<IconNode> {
  const cached = cache.get(name);
  if (cached) return cached;
  const loader = (dynamicIconImports as Record<string, () => Promise<{ __iconNode: IconNode }>>)[name];
  if (!loader) return Promise.reject(new Error(`Unknown lucide icon: ${name}`));
  const promise = loader().then((m) => m.__iconNode);
  cache.set(name, promise);
  return promise;
}

/**
 * Convert a CSS linear-gradient angle (0deg = bottom→top, clockwise) to the
 * `x1,y1,x2,y2` tuple used by `<linearGradient>`. Coordinates span `size` in
 * user space — callers must set `gradientUnits="userSpaceOnUse"`. Using
 * user-space (not the default objectBoundingBox) is required because many
 * lucide icons paint strokes via `<line>` elements whose per-element bbox is
 * zero-width or zero-height, which would collapse an objectBoundingBox
 * gradient to nothing.
 */
export function gradientEndpoints(
  angle: number,
  size = 24,
): { x1: number; y1: number; x2: number; y2: number } {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a) / 2;
  const dy = Math.cos(a) / 2;
  return {
    x1: (0.5 - dx) * size,
    y1: (0.5 + dy) * size,
    x2: (0.5 + dx) * size,
    y2: (0.5 - dy) * size,
  };
}
