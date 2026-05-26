// components/Stories.tsx
'use client';

import React from 'react';

const Stories: React.FC = () => {
  return (
    <div className="stories-container p-4">
      <div className="story-content space-y-2">
        <h1 className="text-xl font-bold">Story Title</h1>
        <p className="text-sm">Story Content</p>
        <img src="story-image.jpg" alt="Story Image" className="w-full h-auto rounded" />
        <video src="story-video.mp4" controls className="w-full h-auto rounded" />
      </div>
    </div>
  );
};

export default Stories;
