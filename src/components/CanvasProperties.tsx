import { RotateCw } from 'lucide-react';
import { useSession, type Screenshot, getCanvasSize } from '../store/session';
import { PLATFORMS } from '../lib/platforms';

export function CanvasProperties({ screenshot }: { screenshot: Screenshot }) {
  const setOrientation = useSession((s) => s.setOrientation);
  const spec = PLATFORMS[screenshot.platform];
  const canToggle = screenshot.platform === 'iphone' || screenshot.platform === 'ipad';
  const size = getCanvasSize(screenshot);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">Canvas</div>
          <div className="text-sm font-medium">{spec.label}</div>
          <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
            {size.width} × {size.height}
          </div>
        </div>

        {canToggle && (
          <button
            onClick={() =>
              setOrientation(screenshot.orientation === 'portrait' ? 'landscape' : 'portrait')
            }
            title="Toggle orientation"
            className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2 py-1 text-xs"
          >
            <RotateCw size={12} />
            {screenshot.orientation === 'portrait' ? 'Portrait' : 'Landscape'}
          </button>
        )}
      </div>
    </div>
  );
}
