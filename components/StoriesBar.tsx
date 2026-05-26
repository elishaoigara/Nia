// components/StoriesBar.tsx
'use client';

import React from 'react';

interface StoriesBarProps {
  currentUserId: string;
}

const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserId }) => {
  return (
    <div className="stories-bar-container w-full overflow-x-auto pb-2">
      <div className="flex gap-4">
        {/* Placeholder for adding a story */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-[var(--surface-0)] border-2 border-[var(--surface-0)] flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
          </div>
          <span className="text-xs">Add Story</span>
        </div>
        {/* Additional story items can be mapped here */}
      </div>
    </div>
  );
};

export default StoriesBar;
