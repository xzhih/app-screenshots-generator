import { useState } from 'react';

/**
 * HTML5 drag-and-drop state + handlers for reordering items within a list.
 *
 * The caller passes the list *in display order* and an `onMove(id, toIndex)`
 * callback. `toIndex` is the final position in the display list after the
 * drop — the caller translates this to any underlying array index if display
 * order differs from storage order (e.g. a reversed layer list).
 *
 * All handlers call `stopPropagation`, which lets nested drag lists (e.g. a
 * frame list inside a workspace card) coexist without cross-triggering.
 */
export function useListReorder<T extends { id: string }>(
  items: T[],
  onMove: (id: string, toIndex: number) => void,
) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const reset = () => {
    setDragId(null);
    setDropIndex(null);
  };

  return {
    dragId,
    dropIndex,
    isDragging: dragId !== null,
    startDrag: (id: string) => (e: React.DragEvent) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      // Firefox requires setData to actually begin a drag.
      e.dataTransfer.setData('text/plain', id);
      setDragId(id);
    },
    hoverGap: (i: number) => (e: React.DragEvent) => {
      if (dragId === null) return;
      e.preventDefault();
      e.stopPropagation();
      // `dragover` fires at ~60Hz while the pointer sits over one gap —
      // skip the no-op setState so React doesn't re-render the whole list.
      if (dropIndex === i) return;
      setDropIndex(i);
    },
    commit: (e?: React.DragEvent) => {
      if (e) e.stopPropagation();
      if (dragId !== null && dropIndex !== null) {
        const from = items.findIndex((x) => x.id === dragId);
        if (from >= 0) {
          const to = from < dropIndex ? dropIndex - 1 : dropIndex;
          if (from !== to) onMove(dragId, to);
        }
      }
      reset();
    },
    cancel: reset,
  };
}
