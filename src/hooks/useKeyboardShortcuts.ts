import { useEffect } from 'react';
import { useSession } from '../store/session';

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const editable = isEditable(e.target);

      if (meta && e.key.toLowerCase() === 'z') {
        if (editable) return;
        e.preventDefault();
        if (e.shiftKey) useSession.temporal.getState().redo();
        else useSession.temporal.getState().undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y' && !editable) {
        e.preventDefault();
        useSession.temporal.getState().redo();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !editable) {
        const sel = useSession.getState().selection;
        if (sel?.kind === 'layer') {
          e.preventDefault();
          useSession.getState().removeLayer(sel.id);
        }
      }

      if (e.key === 'Escape') {
        useSession.getState().setSelection(null);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
