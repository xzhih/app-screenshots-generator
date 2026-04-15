import { toPng } from 'html-to-image';
import type { Screenshot } from '../store/session';
import { PLATFORMS } from './platforms';

/**
 * Render a Screenshot at its true target resolution by building a detached
 * DOM tree, converting to PNG via html-to-image, and triggering download.
 */
export async function exportScreenshotPng(screenshot: Screenshot) {
  const spec = PLATFORMS[screenshot.platform];

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = `${spec.width}px`;
  host.style.height = `${spec.height}px`;
  host.style.pointerEvents = 'none';
  document.body.appendChild(host);

  const canvas = document.createElement('div');
  canvas.style.position = 'relative';
  canvas.style.width = `${spec.width}px`;
  canvas.style.height = `${spec.height}px`;
  canvas.style.overflow = 'hidden';
  canvas.style.background = `linear-gradient(${screenshot.background.angle}deg, ${screenshot.background.from}, ${screenshot.background.to})`;
  host.appendChild(canvas);

  // Image layer
  if (screenshot.image) {
    const img = document.createElement('img');
    img.src = screenshot.image.src;
    img.style.position = 'absolute';
    img.style.left = `${screenshot.image.x}px`;
    img.style.top = `${screenshot.image.y}px`;
    img.style.width = `${screenshot.image.width}px`;
    img.style.height = `${screenshot.image.height}px`;
    img.style.transform = `rotate(${screenshot.image.rotation}deg)`;
    img.style.transformOrigin = 'center';
    canvas.appendChild(img);

    // Wait for image to load so html-to-image captures pixels
    await new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  }

  // Text layer
  const text = document.createElement('div');
  text.textContent = screenshot.title.text;
  text.style.position = 'absolute';
  text.style.left = `${screenshot.title.x}px`;
  text.style.top = `${screenshot.title.y}px`;
  text.style.width = `${screenshot.title.width}px`;
  text.style.fontFamily = `"SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif`;
  text.style.fontSize = `${screenshot.title.fontSize}px`;
  text.style.fontWeight = String(screenshot.title.fontWeight);
  text.style.color = screenshot.title.color;
  text.style.lineHeight = '1.05';
  text.style.letterSpacing = '-0.02em';
  text.style.textAlign = 'left';
  text.style.whiteSpace = 'pre-wrap';
  text.style.wordWrap = 'break-word';
  canvas.appendChild(text);

  try {
    const dataUrl = await toPng(canvas, {
      width: spec.width,
      height: spec.height,
      pixelRatio: 1,
      canvasWidth: spec.width,
      canvasHeight: spec.height,
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

function sanitize(s: string): string {
  return s.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '') || 'screenshot';
}

export function exportJSON(screenshots: Screenshot[]) {
  const payload = { version: 1, screenshots };
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
