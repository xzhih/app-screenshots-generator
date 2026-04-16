import { useDrag } from '@use-gesture/react';

type Options = {
  scale: number;
  onStart?: () => void;
  onChange: (delta: { dx: number; dy: number; shift: boolean }) => void;
  onEnd?: () => void;
};

export function useDraggable({ onChange, scale, onStart, onEnd }: Options) {
  return useDrag(({ movement: [mx, my], first, last, event, shiftKey }) => {
    event.stopPropagation();
    if (first) onStart?.();
    onChange({ dx: mx / scale, dy: my / scale, shift: shiftKey });
    if (last) onEnd?.();
  });
}
