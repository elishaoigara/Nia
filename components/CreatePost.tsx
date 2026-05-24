import React, { useState } from 'react';
import './CreatePost.css';

const CreatePost = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // Submit the post
  };

  return (
    <div className='create-post-container'>
      <h1>Create Post</h1>
      <form onSubmit={handleSubmit}>
        <label>Title:</label>
        <input type='text' value={title} onChange={(event) => setTitle(event.target.value)} />
        <label>Content:</label>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} />
        <button type='submit'>Create Post</button>
      </form>
    </div>
  );
};

export default CreatePost;