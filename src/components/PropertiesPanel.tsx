import { useSession } from '../store/session';
import { TextProperties } from './TextProperties';
import { ImageProperties } from './ImageProperties';
import { BackgroundProperties } from './BackgroundProperties';

export function PropertiesPanel() {
  const selection = useSession((s) => s.selection);
  const active = useSession((s) => s.screenshots.find((x) => x.id === s.activeId) ?? null);

  return (
    <aside className="w-72 shrink-0 bg-neutral-950 border-l border-neutral-800 overflow-y-auto">
      <div className="p-4">
        {!active ? (
          <EmptyHint>Select or create a screenshot.</EmptyHint>
        ) : !selection ? (
          <EmptyHint>Click the text, image, or background to edit its properties.</EmptyHint>
        ) : selection.kind === 'title' ? (
          <TextProperties />
        ) : selection.kind === 'image' ? (
          <ImageProperties />
        ) : (
          <BackgroundProperties />
        )}
      </div>
    </aside>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-neutral-500 leading-relaxed">
      <div className="text-xs uppercase tracking-wider text-neutral-600 mb-2">Properties</div>
      {children}
    </div>
  );
}
