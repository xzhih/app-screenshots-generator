import { toPng } from 'html-to-image';
import { type Screenshot, type Layer, getCanvasSize } from '../store/session';
import { backgroundCSS } from './backgrounds';

export async function exportScreenshotPng(screenshot: Screenshot) {
  const { width, height } = getCanvasSize(screenshot);

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
  canvas.style.background = backgroundCSS(screenshot.background);
  host.appendChild(canvas);

  const imageLoads: Promise<void>[] = [];

  for (const layer of screenshot.layers) {
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
    const dataUrl = await toPng(canvas, {
      width,
      height,
      pixelRatio: 1,
      canvasWidth: width,
      canvasHeight: height,
      cacheBust: true,
    });

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${sanitize(screenshot.name)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    host.remove();
  }
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

export function exportJSON(screenshots: Screenshot[]) {
  const payload = { version: 2, screenshots };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'screenshots-config.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importJSON(file: File): Promise<Screenshot[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.screenshots)) {
    throw new Error('Invalid file format');
  }
  return data.screenshots as Screenshot[];
}
