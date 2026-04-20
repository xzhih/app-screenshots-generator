import { createElement, useEffect, useId, useState } from 'react';
import { gradientEndpoints, loadIconNode, type IconNode } from '../lib/iconNodes';
import type { IconGradient } from '../store/session';

type Props = {
  name: string;
  width: number;
  height: number;
  /** Used when `gradient` is not set. */
  color: string;
  gradient?: IconGradient;
  /** Stroke width in lucide's 24px viewBox units. `absoluteStrokeWidth` is applied. */
  strokeWidth?: number;
};

/**
 * Live-canvas icon renderer. Builds the SVG directly so we can paint the
 * stroke with a gradient (SVG strokes can't reference CSS gradients). The PNG
 * export pipeline mirrors this output in `export.ts`.
 */
export function IconGlyph({ name, width, height, color, gradient, strokeWidth }: Props) {
  const [iconNode, setIconNode] = useState<IconNode | null>(null);
  const gradientId = useId();

  useEffect(() => {
    let cancelled = false;
    loadIconNode(name)
      .then((n) => {
        if (!cancelled) setIconNode(n);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name]);

  const size = Math.min(width, height);
  const absoluteStroke = ((strokeWidth ?? 2) * 24) / Math.max(1, size);
  const stroke = gradient ? `url(#${cssId(gradientId)})` : color;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      stroke={stroke}
      strokeWidth={absoluteStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', pointerEvents: 'none' }}
    >
      {gradient && (
        <defs>
          <linearGradient
            id={cssId(gradientId)}
            gradientUnits="userSpaceOnUse"
            {...gradientEndpoints(gradient.angle)}
          >
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
        </defs>
      )}
      {iconNode?.map(([tag, attrs], i) =>
        createElement(tag, { key: i, ...attrs }),
      )}
    </svg>
  );
}

/** React's useId includes ':' which isn't a valid URL fragment; strip it. */
function cssId(id: string): string {
  return id.replace(/:/g, '_');
}
