import { PLATFORMS, type Platform } from './platforms';
import type {
  Frame,
  ImageLayer,
  TextLayer,
  Workspace,
} from '../store/session';
import { getCanvasSize } from '../store/session';
import { uid } from './id';
import { DEFAULT_BACKGROUND } from './backgrounds';

export function createDefaultWorkspace(platform: Platform, name: string): Workspace {
  const spec = PLATFORMS[platform];
  const ws: Workspace = {
    id: uid(),
    name,
    platform,
    orientation: spec.orientation,
    background: DEFAULT_BACKGROUND,
    frames: [],
  };
  ws.frames.push(createDefaultFrame(ws, 0));
  return ws;
}

export function createDefaultFrame(
  workspace: Pick<Workspace, 'platform' | 'orientation'>,
  index: number,
): Frame {
  const { width, height } = getCanvasSize(workspace);
  return {
    id: uid(),
    name: `Frame ${index + 1}`,
    layers: [defaultTextLayer(width, height)],
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

export function createTextLayer(
  workspace: Pick<Workspace, 'platform' | 'orientation'>,
): TextLayer {
  const { width, height } = getCanvasSize(workspace);
  const layer = defaultTextLayer(width, height);
  // Offset slightly so it doesn't overlap exactly with existing text
  layer.y = Math.round(height * 0.2);
  layer.fontSize = Math.round(width * 0.05);
  layer.text = 'New text';
  layer.fontWeight = 500;
  return layer;
}

export function createImageLayer(
  workspace: Pick<Workspace, 'platform' | 'orientation'>,
  src: string,
  naturalW: number,
  naturalH: number,
): ImageLayer {
  const { width, height } = getCanvasSize(workspace);
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
