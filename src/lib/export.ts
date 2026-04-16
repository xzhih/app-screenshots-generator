import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import {
  type Frame,
  type Layer,
  type Workspace,
  effectiveBackground,
  getCanvasSize,
  legacyScreenshotsToWorkspaces,
} from '../store/session';
import { backgroundCSS } from './backgrounds';

/**
 * Render a single frame to a PNG data URL. Detaches a full-size DOM tree into
 * the document, replays layers, and feeds it to html-to-image. Shared by
 * single-frame export and the workspace ZIP.
 */
async function renderFramePng(workspace: Workspace, frame: Frame): Promise<string> {
  const { width, height } = getCanvasSize(workspace);
  const background = effectiveBackground(workspace, frame);

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const canvas = document.createElement('div');
  canvas.style.position = 'relative';
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.overflow = 'hidden';
  canvas.style.background = backgroundCSS(background);
  host.appendChild(canvas);

  const imageLoads: Promise<void>[] = [];

  for (const layer of frame.layers) {
    if (layer.kind === 'image') {
      const img = buildImageLayer(layer);
      canvas.appendChild(img);
      imageLoads.push(
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
      );
    } else {
      canvas.appendChild(buildTextLayer(layer));
    }
  }

  await Promise.all(imageLoads);

  try {
    return await toPng(canvas, {
      width,
      height,
      pixelRatio: 1,
      canvasWidth: width,
      canvasHeight: height,
      cacheBust: true,
    });
  } finally {
    host.remove();
  }
}

export async function exportFramePng(workspace: Workspace, frame: Frame) {
  const dataUrl = await renderFramePng(workspace, frame);
  triggerDownload(dataUrl, `${sanitize(frame.name)}.png`);
}

export async function exportWorkspaceZip(workspace: Workspace) {
  if (workspace.frames.length === 0) return;
  const zip = new JSZip();
  const padWidth = String(workspace.frames.length).length;
  const rendered = await Promise.all(
    workspace.frames.map((frame) => renderFramePng(workspace, frame)),
  );
  rendered.forEach((dataUrl, i) => {
    const base64 = dataUrl.split(',')[1];
    const prefix = String(i + 1).padStart(padWidth, '0');
    zip.file(`${prefix}-${sanitize(workspace.frames[i].name)}.png`, base64, { base64: true });
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, `${sanitize(workspace.name)}.zip`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function buildImageLayer(layer: Extract<Layer, { kind: 'image' }>): HTMLImageElement {
  const img = document.createElement('img');
  img.src = layer.src;
  img.style.display = 'block';
  img.style.position = 'absolute';
  img.style.left = `${layer.x}px`;
  img.style.top = `${layer.y}px`;
  img.style.width = `${layer.width}px`;
  img.style.height = `${layer.height}px`;
  img.style.maxWidth = 'none';
  img.style.maxHeight = 'none';
  img.style.objectFit = 'fill';
  img.style.borderRadius = `${layer.cornerRadius ?? 0}px`;
  img.style.transform = `rotate(${layer.rotation}deg)`;
  img.style.transformOrigin = 'center';
  return img;
}

function buildTextLayer(layer: Extract<Layer, { kind: 'text' }>): HTMLDivElement {
  const el = document.createElement('div');
  el.textContent = layer.text;
  el.style.position = 'absolute';
  el.style.left = `${layer.x}px`;
  el.style.top = `${layer.y}px`;
  el.style.width = `${layer.width}px`;
  el.style.fontFamily = `"SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif`;
  el.style.fontSize = `${layer.fontSize}px`;
  el.style.fontWeight = String(layer.fontWeight);
  el.style.color = layer.color;
  el.style.lineHeight = '1.05';
  el.style.letterSpacing = '-0.02em';
  el.style.textAlign = layer.align;
  el.style.whiteSpace = 'pre-wrap';
  el.style.wordWrap = 'break-word';
  el.style.transform = `rotate(${layer.rotation}deg)`;
  el.style.transformOrigin = 'center';
  return el;
}

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'screenshot';
}

export function exportJSON(workspaces: Workspace[]) {
  const payload = { version: 3, workspaces };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(url, 'screenshots-config.json');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function importJSON(file: File): Promise<Workspace[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file format');
  }
  // v3: workspaces directly
  if (Array.isArray((data as { workspaces?: unknown }).workspaces)) {
    return (data as { workspaces: Workspace[] }).workspaces;
  }
  // v0–v2: flat screenshots list → migrate
  if (Array.isArray((data as { screenshots?: unknown }).screenshots)) {
    return legacyScreenshotsToWorkspaces(
      (data as { screenshots: Parameters<typeof legacyScreenshotsToWorkspaces>[0] }).screenshots,
    );
  }
  throw new Error('Invalid file format');
}
