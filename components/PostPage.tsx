import React from 'react';
import './PostPage.css';

const PostPage = () => {
  return (
    <div className='post-page-container'>
      <div className='post-content'>
        <h1>Post Title</h1>
        <p>Post Content</p>
      </div>
      <div className='comments-section'>
        <h2>Comments</h2>
        <ul>
          <li>Comment 1</li>
          <li>Comment 2</li>
        </ul>
      </div>
    </div>
  );
};

export default PostPage;