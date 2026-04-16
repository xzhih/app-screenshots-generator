import { PLATFORMS, type Platform } from './platforms';
import type { Screenshot, TextLayer, ImageLayer } from '../store/session';
import { getCanvasSize } from '../store/session';
import { uid } from './id';
import { DEFAULT_BACKGROUND } from './backgrounds';

export function createDefaultScreenshot(platform: Platform, index: number): Screenshot {
  const spec = PLATFORMS[platform];
  return {
    id: uid(),
    name: `${spec.label}-${index + 1}`,
    platform,
    orientation: spec.orientation,
    layers: [defaultTextLayer(spec.width, spec.height)],
    background: DEFAULT_BACKGROUND,
  };
}

function defaultTextLayer(w: number, h: number): TextLayer {
  const padX = Math.round(w * 0.08);
  const titleY = Math.round(h * 0.06);
  const titleWidth = w - padX * 2;
  const fontSize = Math.round(w * 0.08);
  return {
    id: uid(),
    kind: 'text',
    x: padX,
    y: titleY,
    width: titleWidth,
    rotation: 0,
    text: 'Your headline here',
    fontSize,
    fontWeight: 700,
    color: '#ffffff',
    align: 'left',
  };
}

export function createTextLayer(screenshot: Pick<Screenshot, 'platform' | 'orientation'>): TextLayer {
  const { width, height } = getCanvasSize(screenshot);
  const layer = defaultTextLayer(width, height);
  // Offset slightly so it doesn't overlap exactly with existing text
  layer.y = Math.round(height * 0.2);
  layer.fontSize = Math.round(width * 0.05);
  layer.text = 'New text';
  layer.fontWeight = 500;
  return layer;
}

export function createImageLayer(
  screenshot: Pick<Screenshot, 'platform' | 'orientation'>,
  src: string,
  naturalW: number,
  naturalH: number,
): ImageLayer {
  const { width, height } = getCanvasSize(screenshot);
  const targetW = Math.round(width * 0.6);
  const scale = targetW / naturalW;
  const targetH = Math.round(naturalH * scale);
  return {
    id: uid(),
    kind: 'image',
    src,
    x: Math.round((width - targetW) / 2),
    y: Math.round((height - targetH) / 2),
    width: targetW,
    height: targetH,
    rotation: 0,
    aspectLocked: true,
    naturalWidth: naturalW,
    naturalHeight: naturalH,
  };
}
