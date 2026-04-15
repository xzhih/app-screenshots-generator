import { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { useSession } from './store/session';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { exportScreenshotPng } from './lib/export';

export default function App() {
  useKeyboardShortcuts();

  // Prevent the browser from navigating to a dropped image when the user
  // misses the canvas drop zone.
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  async function exportById(id: string) {
    const s = useSession.getState().screenshots.find((x) => x.id === id);
    if (s) await exportScreenshotPng(s);
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        <Sidebar onExport={exportById} />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}
