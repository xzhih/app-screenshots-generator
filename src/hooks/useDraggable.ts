import { useDrag } from '@use-gesture/react';

type Options = {
  onChange: (delta: { dx: number; dy: number }) => void;
  scale: number; // pixels on screen per canvas pixel (fitScale)
  onStart?: () => void;
  onEnd?: () => void;
};

/**
 * Hook that returns `@use-gesture/react` drag bindings that translate screen-space
 * pointer movement into canvas-space deltas (divided by the canvas fit scale).
 * `onChange` receives the absolute-from-start movement in canvas pixels.
 */
export function useDraggable({ onChange, scale, onStart, onEnd }: Options) {
  return useDrag(({ movement: [mx, my], first, last, event }) => {
    event.stopPropagation();
    if (first) onStart?.();
    onChange({ dx: mx / scale, dy: my / scale });
    if (last) onEnd?.();
  });
}
