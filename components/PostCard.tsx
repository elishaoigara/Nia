import React from 'react';
import Link from 'next/link';
import { ThumbUp } from 'lucide-react';

const PostCard = () => {
  return (
    <div className="card">
      <div className="post-header">
        <div className="avatar">
          <img src="https://via.placeholder.com/40" alt="Avatar" />
        </div>
        <div className="post-info">
          <h2 className="post-title"><Link href="/post"><a>Post Title</a></Link></h2>
          <p className="post-meta">Posted by <Link href="/author"><a>Author</a></Link> on <time>2023-03-01</time></p>
        </div>
      </div>
      <div className="post-content">
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet nulla auctor, vestibulum magna sed, convallis ex.</p>
      </div>
      <div className="post-footer">
        <button className="like-button"><ThumbUp size={20} /></button>
        <span className="like-count">10 likes</span>
      </div>
    </div>
  );
};

export default PostCard;
