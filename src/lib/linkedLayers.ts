import type { Layer } from '../store/session';

/**
 * Fields that propagate across linked siblings (same workspace, same `linkId`,
 * same `kind`). Everything else — text content, image src, natural dims — is
 * treated as unique content per frame.
 *
 * `id`, `kind`, `linkId` are intentionally excluded: they're identity, not style.
 *
 * Uses `Set<string>` rather than `Set<keyof Layer>` because `keyof Layer` is
 * the *intersection* of both variants and loses kind-specific fields
 * (`fontSize`, `height`, etc.).
 */
const TEXT_STYLE_FIELDS: ReadonlySet<string> = new Set([
  'x',
  'y',
  'width',
  'rotation',
  'fontSize',
  'fontWeight',
  'color',
  'align',
]);

const IMAGE_STYLE_FIELDS: ReadonlySet<string> = new Set([
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'aspectLocked',
  'cornerRadius',
]);

const ICON_STYLE_FIELDS: ReadonlySet<string> = new Set([
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'aspectLocked',
  'color',
  'strokeWidth',
]);

export const STYLE_FIELDS_BY_KIND: Record<Layer['kind'], ReadonlySet<string>> = {
  text: TEXT_STYLE_FIELDS,
  image: IMAGE_STYLE_FIELDS,
  icon: ICON_STYLE_FIELDS,
};

/**
 * Return the subset of `patch` that is considered "style" for the given kind.
 * Used when applying a linked update to sibling layers: only style fields
 * propagate; content fields (text, src, natural dims) stay local.
 */
export function pickStylePatch<T extends Layer>(
  patch: Partial<T>,
  kind: Layer['kind'],
): Partial<T> {
  const allow = STYLE_FIELDS_BY_KIND[kind];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (allow.has(k)) out[k] = v;
  }
  return out as Partial<T>;
}
