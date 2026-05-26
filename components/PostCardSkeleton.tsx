import React from 'react';

const PostCardSkeleton = () => {
  return (
    <div className="card">
      <div className="avatar-ring animate-shimmer"></div>
      <div className="lines">
        <div className="line-1 animate-shimmer"></div>
        <div className="line-2 animate-shimmer"></div>
        <div className="line-3 animate-shimmer"></div>
      </div>
      <div className="icons">
        <div className="icon-1 animate-shimmer"></div>
        <div className="icon-2 animate-shimmer"></div>
        <div className="icon-3 animate-shimmer"></div>
      </div>
    </div>
  );
};

export default PostCardSkeleton;
