import { useSession } from '../store/session';
import { LayerList } from './LayerList';
import { TextProperties } from './TextProperties';
import { ImageProperties } from './ImageProperties';
import { BackgroundProperties } from './BackgroundProperties';
import { CanvasProperties } from './CanvasProperties';

export function PropertiesPanel() {
  const selection = useSession((s) => s.selection);
  const active = useSession((s) => s.screenshots.find((x) => x.id === s.activeId) ?? null);

  if (!active) {
    return (
      <aside className="w-80 shrink-0 bg-neutral-950 border-l border-neutral-800 overflow-y-auto">
        <div className="p-4 text-sm text-neutral-500">Select or create a screenshot.</div>
      </aside>
    );
  }

  const selectedLayer =
    selection?.kind === 'layer' ? active.layers.find((l) => l.id === selection.id) ?? null : null;

  return (
    <aside className="w-80 shrink-0 bg-neutral-950 border-l border-neutral-800 flex flex-col">
      <div className="p-3 border-b border-neutral-800">
        <CanvasProperties screenshot={active} />
      </div>

      <div className="border-b border-neutral-800">
        <LayerList screenshot={active} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedLayer?.kind === 'text' ? (
          <TextProperties layer={selectedLayer} />
        ) : selectedLayer?.kind === 'image' ? (
          <ImageProperties layer={selectedLayer} />
        ) : selection?.kind === 'background' ? (
          <BackgroundProperties />
        ) : (
          <div className="text-sm text-neutral-500 leading-relaxed">
            Click a layer or the background to edit its properties.
          </div>
        )}
      </div>
    </aside>
  );
}
