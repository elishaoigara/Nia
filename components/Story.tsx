import React from 'react';

const Story = () => {
  return (
    <div className='story'>
      <h2>Story Title</h2>
      <p>Story content...</p>
      <video src='story-video.mp4' controls></video>
    </div>
  );
};

export default Story;