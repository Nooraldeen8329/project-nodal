import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import WorkspaceLayout from './components/WorkspaceLayout';
import Canvas from './components/Canvas';

function App() {
  const { init, isLoading } = useStore();

  useEffect(() => {
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-neutral-900 text-white"
        role="status"
        aria-live="polite"
      >
        Loading...
      </div>
    );
  }

  return (
    <WorkspaceLayout>
      <Canvas />
    </WorkspaceLayout>
  );
}

export default App;
