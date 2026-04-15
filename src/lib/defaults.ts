import { PLATFORMS, type Platform } from './platforms';
import type { Screenshot } from '../store/session';
import { uid } from './id';

export function createDefaultScreenshot(platform: Platform, index: number): Screenshot {
  const spec = PLATFORMS[platform];
  const w = spec.width;
  const h = spec.height;
  const padX = Math.round(w * 0.08);
  const titleY = Math.round(h * 0.06);
  const titleWidth = w - padX * 2;
  const fontSize = Math.round(w * 0.08);

  return {
    id: uid(),
    name: `${spec.label}-${index + 1}`,
    platform,
    title: {
      text: 'Your headline here',
      x: padX,
      y: titleY,
      width: titleWidth,
      fontSize,
      fontWeight: 700,
      color: '#ffffff',
    },
    image: null,
    background: {
      from: '#E8F1F8',
      to: '#7AA3C4',
      angle: 180,
    },
  };
}
