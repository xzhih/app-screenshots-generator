import { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { FrameStrip } from './components/FrameStrip';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { findFrame, useSession } from './store/session';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { exportFramePng } from './lib/export';

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

  async function exportByFrameId(frameId: string) {
    const match = findFrame(useSession.getState().workspaces, frameId);
    if (match) await exportFramePng(match.workspace, match.frame);
  }

  return (
    <div className="h-full flex flex-col">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        <Sidebar onExport={exportByFrameId} />
        <div className="flex-1 flex flex-col min-w-0">
          <Canvas />
          <FrameStrip />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
