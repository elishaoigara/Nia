import React from 'react';
import './Stories.css';

const Stories = () => {
  return (
    <div className='stories-container'>
      <div className='story-content'>
        <h1>Story Title</h1>
        <p>Story Content</p>
        <img src='story-image.jpg' alt='Story Image' />
        <video src='story-video.mp4' alt='Story Video' />
      </div>
    </div>
  );
};

export default Stories;