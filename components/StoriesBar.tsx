// components/StoriesBar.tsx
'use client';

import React, { useState } from 'react';

interface StoriesBarProps {
  currentUserId: string;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserId }) => {
  const [toast, setToast] = useState(false);

  function handleAddStory() {
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <div className="stories-bar-container w-full overflow-x-auto pb-2" style={{ position: 'relative' }}>
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1" style={{ cursor: 'pointer' }} onClick={handleAddStory}>
          <div className="w-16 h-16 rounded-full bg-linear-to-tr from-yellow-400 to-purple-600 p-0.5">
            <div className="w-full h-full rounded-full bg-(--surface-0) border-2 border-(--surface-0) flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
          </div>
          <span className="text-xs">Add Story</span>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          padding: '10px 20px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap',
        }}>
          Stories coming soon! 🌟
        </div>
      )}
    </div>
  );
};

export default StoriesBar;