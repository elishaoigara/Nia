'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, ChevronLeft, ChevronRight, Plus, Loader2, ImagePlus, Video, Play } from 'lucide-react';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

interface StoryGroup {
  userId: string;
  username: string;
  avatar_url: string | null;
  stories: Story[];
  hasUnread: boolean;
}

interface StoriesBarProps {
  currentUserId: string;
}

/* ── Upload Modal ─────────────────────────────── */
function StoryUploadModal({
  currentUserId,
  onClose,
  onUploaded,
}: {
  currentUserId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const supabase = createClient();
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [type,     setType]     = useState<'image' | 'video'>('image');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  function pickFile(files: FileList | null, mediaType: 'image' | 'video') {
    if (!files || !files[0]) return;
    const f = files[0];
    if (mediaType === 'video' && f.size > 50 * 1024 * 1024) {
      setError('Video must be under 50 MB'); return;
    }
    setError('');
    setFile(f);
    setType(mediaType);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!file || loading) return;
    setLoading(true); setError('');
    try {
      const ext  = file.name.split('.').pop() ?? (type === 'video' ? 'mp4' : 'jpg');
      const path = `${currentUserId}/story_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('post-media').upload(path, file, { contentType: file.type });
      if (upErr) { setError(upErr.message); setLoading(false); return; }

      const media_url = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: dbErr } = await supabase.from('stories').insert({
        user_id: currentUserId, media_url, media_type: type, expires_at,
      });
      if (dbErr) { setError(dbErr.message); setLoading(false); return; }
      onUploaded();
      onClose();
    } catch (e) {
      console.error(e); setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)', borderRadius: 20,
          padding: 24, width: '90%', maxWidth: 400,
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>Add to your story</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
          Stories are visible for 24 hours.
        </p>

        {/* Preview */}
        {preview ? (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '9/16', maxHeight: 320 }}>
            {type === 'video'
              ? <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
              : <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            }
            <button
              onClick={() => { setFile(null); setPreview(null); }}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                width: 28, height: 28, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <input ref={imageRef} type="file" accept="image/*" hidden onChange={e => pickFile(e.target.files, 'image')} />
            <input ref={videoRef} type="file" accept="video/*" hidden onChange={e => pickFile(e.target.files, 'video')} />
            <button
              onClick={() => imageRef.current?.click()}
              style={{
                flex: 1, padding: '24px 0', borderRadius: 14,
                border: '2px dashed var(--border)', background: 'var(--surface-2)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, color: 'var(--text-secondary)',
              }}
            >
              <ImagePlus size={24} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Photo</span>
            </button>
            <button
              onClick={() => videoRef.current?.click()}
              style={{
                flex: 1, padding: '24px 0', borderRadius: 14,
                border: '2px dashed var(--border)', background: 'var(--surface-2)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, color: 'var(--text-secondary)',
              }}
            >
              <Video size={24} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Video</span>
            </button>
          </div>
        )}

        {error && <p style={{ color: '#f43f5e', fontSize: 13, margin: 0 }}>{error}</p>}

        <button
          onClick={upload}
          disabled={!file || loading}
          style={{
            padding: '12px', borderRadius: 12, border: 'none',
            background: file ? 'var(--grad-brand)' : 'var(--surface-3)',
            color: file ? '#fff' : 'var(--text-tertiary)',
            fontWeight: 700, fontSize: 15, cursor: file ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Share story'}
        </button>
      </div>
    </div>
  );
}

/* ── Story Viewer ─────────────────────────────── */
function StoryViewer({
  groups,
  startGroupIdx,
  currentUserId,
  onClose,
}: {
  groups: StoryGroup[];
  startGroupIdx: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [groupIdx,  setGroupIdx]  = useState(startGroupIdx);
  const [storyIdx,  setStoryIdx]  = useState(0);
  const [progress,  setProgress]  = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);

  const group   = groups[groupIdx];
  const story   = group?.stories[storyIdx];
  const DURATION = 5000;

  // Mark viewed
  useEffect(() => {
    if (!story) return;
    supabase.from('story_views').upsert({ story_id: story.id, user_id: currentUserId }, { onConflict: 'story_id,user_id' }).then(() => {});
  }, [story?.id]); // eslint-disable-line

  // Progress bar
  useEffect(() => {
    if (!story || story.media_type === 'video') return;
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { advance(); return 0; }
        return p + (100 / (DURATION / 100));
      });
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [storyIdx, groupIdx]); // eslint-disable-line

  function advance() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }

  function goBack() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (storyIdx > 0) setStoryIdx(i => i - 1);
    else if (groupIdx > 0) { setGroupIdx(g => g - 1); setStoryIdx(0); }
  }

  if (!story) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100dvh', overflow: 'hidden' }}>
        {/* Media */}
        {story.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onEnded={advance}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
          />
        ) : (
          <img src={story.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Gradient overlays */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)', pointerEvents: 'none' }} />

        {/* Progress bars */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 3 }}>
          {group.stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: '#fff',
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                transition: i === storyIdx ? 'none' : 'none',
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{
          position: 'absolute', top: 24, left: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--grad-brand)', padding: 2, flexShrink: 0,
          }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#222' }}>
              {group.avatar_url
                ? <img src={group.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    {group.username[0]?.toUpperCase()}
                  </div>
              }
            </div>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{group.username}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {new Date(story.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>

        {/* Tap zones */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <div style={{ flex: 1 }} onClick={goBack} />
          <div style={{ flex: 1 }} onClick={advance} />
        </div>

        {/* Nav arrows */}
        {groupIdx > 0 && (
          <button onClick={e => { e.stopPropagation(); setGroupIdx(g => g - 1); setStoryIdx(0); }}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <ChevronLeft size={20} />
          </button>
        )}
        {groupIdx < groups.length - 1 && (
          <button onClick={e => { e.stopPropagation(); setGroupIdx(g => g + 1); setStoryIdx(0); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── StoriesBar ─────────────────────────────────── */
const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserId }) => {
  const supabase = createClient();
  const [groups,        setGroups]        = useState<StoryGroup[]>([]);
  const [showUpload,    setShowUpload]    = useState(false);
  const [viewerOpen,    setViewerOpen]    = useState(false);
  const [viewerGroupIdx,setViewerGroupIdx]= useState(0);
  const [viewedIds,     setViewedIds]     = useState<Set<string>>(new Set());

  async function loadStories() {
    const { data: stories } = await supabase
      .from('stories')
      .select('*, profiles:user_id(id, username, avatar_url)')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    const { data: views } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('user_id', currentUserId);

    const viewedSet = new Set((views ?? []).map((v: any) => v.story_id));
    setViewedIds(viewedSet);

    if (!stories) return;

    // Group by user
    const map = new Map<string, StoryGroup>();
    for (const s of stories as any[]) {
      const uid = s.user_id;
      if (!map.has(uid)) {
        map.set(uid, {
          userId:    uid,
          username:  s.profiles?.username ?? 'unknown',
          avatar_url:s.profiles?.avatar_url ?? null,
          stories:   [],
          hasUnread: false,
        });
      }
      const grp = map.get(uid)!;
      grp.stories.push(s);
      if (!viewedSet.has(s.id)) grp.hasUnread = true;
    }

    // Current user's group first
    const sorted = [...map.values()].sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return (b.hasUnread ? 1 : 0) - (a.hasUnread ? 1 : 0);
    });
    setGroups(sorted);
  }

  useEffect(() => { loadStories(); }, []); // eslint-disable-line

  function openViewer(idx: number) {
    setViewerGroupIdx(idx);
    setViewerOpen(true);
  }

  const myGroup = groups.find(g => g.userId === currentUserId);

  return (
    <>
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 14, padding: '12px 16px', minWidth: 'max-content' }}>

          {/* Add Story bubble */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
            onClick={() => myGroup ? openViewer(groups.indexOf(myGroup)) : setShowUpload(true)}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%', padding: 2,
              background: myGroup ? 'var(--grad-brand)' : 'var(--surface-3)',
              position: 'relative',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                border: '2px solid var(--surface-0)',
                background: myGroup?.avatar_url ? 'transparent' : 'var(--surface-2)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {myGroup?.avatar_url
                  ? <img src={myGroup.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Plus size={20} color="var(--text-secondary)" />
                }
              </div>
              {/* + badge */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--grad-brand)', border: '2px solid var(--surface-0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus size={10} color="#fff" strokeWidth={3} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {myGroup ? 'My story' : 'Add story'}
            </span>
          </div>

          {/* Other users' stories */}
          {groups.filter(g => g.userId !== currentUserId).map((g, i) => {
            const idx = groups.indexOf(g);
            return (
              <div key={g.userId}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                onClick={() => openViewer(idx)}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', padding: 2,
                  background: g.hasUnread ? 'var(--grad-brand)' : 'var(--surface-3)',
                }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    border: '2px solid var(--surface-0)',
                    overflow: 'hidden', background: '#222',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {g.avatar_url
                      ? <img src={g.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{g.username[0]?.toUpperCase()}</span>
                    }
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.username}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <StoryUploadModal
          currentUserId={currentUserId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { loadStories(); setShowUpload(false); }}
        />
      )}

      {/* Always show + button to add more even if you have stories */}
      {myGroup && showUpload === false && (
        <div
          style={{
            position: 'fixed', bottom: 'calc(var(--nav-bottom) + 16px)', right: 16,
            zIndex: 50, display: 'none',
          }}
          onClick={() => setShowUpload(true)}
        />
      )}

      {/* Story viewer */}
      {viewerOpen && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          startGroupIdx={viewerGroupIdx}
          currentUserId={currentUserId}
          onClose={() => { setViewerOpen(false); loadStories(); }}
        />
      )}
    </>
  );
};

export default StoriesBar;