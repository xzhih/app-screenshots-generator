// Snap threshold in canvas-space pixels (independent of display scale)
const SNAP_PX = 12;

export function applySnap(
  raw: { x: number; y: number },
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number,
  disable: boolean,
): { x: number; y: number; snapX: boolean; snapY: boolean } {
  if (disable) return { ...raw, snapX: false, snapY: false };

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const elemCenterX = raw.x + width / 2;
  const elemCenterY = raw.y + height / 2;

  let x = raw.x;
  let y = raw.y;
  let snapX = false;
  let snapY = false;

  if (Math.abs(elemCenterX - centerX) <= SNAP_PX) {
    x = Math.round(centerX - width / 2);
    snapX = true;
  }
  if (Math.abs(elemCenterY - centerY) <= SNAP_PX) {
    y = Math.round(centerY - height / 2);
    snapY = true;
  }

  return { x, y, snapX, snapY };
}
