// components/PostCard.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PostCardProps {
  post: any;
  currentUserId: string;
  showThreadLine?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, showThreadLine }) => {
  const supabase = createClient();

  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [liked, setLiked] = useState(
    post.likes?.some((l: any) => l.user_id === currentUserId) || false
  );

  const handleLike = async () => {
    if (liked) {
      await supabase
        .from('likes')
        .delete()
        .match({ post_id: post.id, user_id: currentUserId });
      setLikes((c: number) => c - 1);
      setLiked(false);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
      setLikes((c: number) => c + 1);
      setLiked(true);
    }
  };

  const profile = post.profiles;

  return (
    <div className="card p-4 space-y-3 relative">
      {showThreadLine && (
        <div className="absolute left-8 top-12 bottom-0 w-0.5 bg-[var(--border)] -z-10" />
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/profile/${profile?.id}`} className="shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--grad-brand)] flex items-center justify-center text-white font-bold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              profile?.username?.[0]?.toUpperCase() ?? '?'
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${profile?.id}`} className="font-bold hover:underline">
              {profile?.username}
            </Link>
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          <p className="mt-1 text-sm whitespace-pre-wrap">{post.content}</p>

          {/* Media */}
          {post.media_url && (
            <div className="mt-2 rounded-xl overflow-hidden border border-[var(--border)]">
              {post.media_type === 'video' ? (
                <video src={post.media_url} controls className="w-full max-h-96" />
              ) : (
                <img src={post.media_url} alt="Post media" className="w-full max-h-96 object-cover" />
              )}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-6 mt-3 text-[var(--text-tertiary)]">
            <button onClick={handleLike} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-[var(--nia-coral)]' : 'hover:text-[var(--nia-coral)]'} `}>
              <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />
              <span>{likes}</span>
            </button>
            <Link href={`/posts/${post.id}`} className="flex items-center gap-1.5 text-sm hover:text-[var(--nia-violet)] transition-colors">
              <MessageCircle size={18} />
              <span>{post.comments?.length || 0}</span>
            </Link>
            <button className="flex items-center gap-1.5 text-sm hover:text-[var(--nia-mint)] transition-colors">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
