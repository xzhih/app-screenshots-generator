import type { CSSProperties } from 'react';
import type { TextLayer } from '../store/session';

/**
 * CSS to render a text layer's fill. When `gradient` is present we clip a
 * gradient background to the glyph shapes (`background-clip: text`); otherwise
 * it's a plain solid color. Keeping this shared so canvas render, thumbnails,
 * and PNG export stay consistent.
 */
export function textFillStyle(layer: TextLayer): CSSProperties {
  if (!layer.gradient) {
    return { color: layer.color };
  }
  const { from, to, angle } = layer.gradient;
  const bg = `linear-gradient(${angle}deg, ${from}, ${to})`;
  return {
    color: 'transparent',
    backgroundImage: bg,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };
}

/** Apply the same fill to a raw DOM element (used by PNG export). */
export function applyTextFill(el: HTMLElement, layer: TextLayer) {
  if (!layer.gradient) {
    el.style.color = layer.color;
    return;
  }
  const { from, to, angle } = layer.gradient;
  const bg = `linear-gradient(${angle}deg, ${from}, ${to})`;
  el.style.color = 'transparent';
  el.style.backgroundImage = bg;
  el.style.backgroundClip = 'text';
  el.style.webkitBackgroundClip = 'text';
  el.style.webkitTextFillColor = 'transparent';
}
