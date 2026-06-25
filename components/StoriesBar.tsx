'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, ChevronLeft, ChevronRight, Plus, Loader2, ImagePlus, Video, Trash2, Eye } from 'lucide-react';

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
  userId:     string;
  username:   string;
  avatar_url: string | null;
  stories:    Story[];
  hasUnread:  boolean;
}

interface ViewerProfile {
  user_id:   string;
  username:  string;
  avatar_url: string | null;
  viewed_at: string;
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
  const [file,    setFile]    = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [type,    setType]    = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
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
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    // reset inputs so same file can be re-selected
    if (imageRef.current) imageRef.current.value = '';
    if (videoRef.current) videoRef.current.value = '';
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

      const media_url  = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: dbErr } = await supabase.from('stories').insert({
        user_id: currentUserId, media_url, media_type: type, expires_at,
      });
      if (dbErr) { setError(dbErr.message); setLoading(false); return; }
      if (preview) URL.revokeObjectURL(preview);
      onUploaded();
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

        {preview ? (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '9/16', maxHeight: 320 }}>
            {type === 'video'
              ? <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
              : <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            }
            <button
              onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); }}
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

/* ── Viewers Panel ────────────────────────────── */
function ViewersPanel({
  storyId,
  onClose,
}: {
  storyId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [viewers,  setViewers]  = useState<ViewerProfile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [dbError,  setDbError]  = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setDbError(null);

    // Step 1: fetch views (no FK join — works even without FK constraints)
    const { data: viewRows, error: viewErr } = await supabase
      .from('story_views')
      .select('viewer_id, viewed_at')
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });

    if (viewErr) {
      console.error('[Nia] story_views fetch error:', viewErr);
      setDbError(viewErr.message);
      setLoading(false);
      return;
    }

    if (!viewRows || viewRows.length === 0) {
      setViewers([]);
      setLoading(false);
      return;
    }

    // Step 2: fetch profiles for those viewer_ids separately
    const viewerIds = viewRows.map((v: any) => v.viewer_id);
    const { data: profileRows, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', viewerIds);

    if (profErr) console.error('[Nia] profiles fetch error:', profErr);

    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

    setViewers(
      viewRows.map((v: any) => {
        const profile = profileMap.get(v.viewer_id);
        return {
          user_id:    v.viewer_id,
          username:   profile?.username ?? 'unknown',
          avatar_url: profile?.avatar_url ?? null,
          viewed_at:  v.viewed_at,
        };
      })
    );
    setLoading(false);
  }

  useEffect(() => {
    load();

    // Real-time: re-fetch whenever a view row is inserted/updated for this story
    const channel = supabase
      .channel(`story_views_${storyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'story_views', filter: `story_id=eq.${storyId}` },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storyId]); // eslint-disable-line

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  return (
    <div
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(15,15,15,0.97)', borderRadius: '20px 20px 0 0',
        padding: '16px 0 24px',
        maxHeight: '50%', overflowY: 'auto',
        zIndex: 10,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
          {loading ? 'Loading views…' : `Viewed by ${viewers.length}`}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={load} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
            <Loader2 size={16} style={{ transform: 'rotate(0deg)' }} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {dbError && (
        <p style={{ color: '#f43f5e', fontSize: 12, padding: '0 16px 8px', margin: 0 }}>
          Error loading views: {dbError}
        </p>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>
      ) : viewers.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '16px 0' }}>
          No views yet
        </p>
      ) : (
        viewers.map(v => (
          <div key={v.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--grad-brand)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              {v.avatar_url
                ? <img src={v.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : v.username[0]?.toUpperCase()
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{v.username}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{timeAgo(v.viewed_at)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ── Story Viewer ─────────────────────────────── */
function StoryViewer({
  groups,
  startGroupIdx,
  currentUserId,
  onClose,
  onRequestUpload,
  onDeleteStory,
}: {
  groups:          StoryGroup[];
  startGroupIdx:   number;
  currentUserId:   string;
  onClose:         () => void;
  onRequestUpload: () => void;
  onDeleteStory:   (storyId: string) => Promise<void>;
}) {
  const supabase = createClient();
  const [groupIdx,     setGroupIdx]     = useState(startGroupIdx);
  const [storyIdx,     setStoryIdx]     = useState(0);
  const [progress,     setProgress]     = useState(0);
  const [showViewers,  setShowViewers]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);

  // Use refs for navigation state to avoid stale closures in interval callbacks
  const groupIdxRef = useRef(groupIdx);
  const storyIdxRef = useRef(storyIdx);
  groupIdxRef.current = groupIdx;
  storyIdxRef.current = storyIdx;

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const DURATION = 5000;
  const isOwner = group?.userId === currentUserId;

  // Mark viewed (skip own stories) — fire immediately and log any DB errors
  useEffect(() => {
    if (!story || story.user_id === currentUserId) return;

    async function recordView() {
      // First try upsert
      const { error } = await supabase
        .from('story_views')
        .upsert(
          { story_id: story!.id, viewer_id: currentUserId, viewed_at: new Date().toISOString() },
          { onConflict: 'story_id,viewer_id' }
        );

      if (error) {
        console.error('[Nia] story_views upsert failed:', error.code, error.message, error.details, error.hint);
        // Fallback: try plain insert in case upsert/conflict resolution is failing
        const { error: insertErr } = await supabase
          .from('story_views')
          .insert({ story_id: story!.id, viewer_id: currentUserId, viewed_at: new Date().toISOString() });
        if (insertErr) console.error('[Nia] story_views insert fallback also failed:', insertErr.message);
      } else {
        console.log('[Nia] story view recorded for story:', story!.id);
      }
    }

    recordView();
  }, [story?.id]); // eslint-disable-line

  const advance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const curGroup = groupIdxRef.current;
    const curStory = storyIdxRef.current;
    const grp = groups[curGroup];
    if (!grp) { onClose(); return; }
    if (curStory < grp.stories.length - 1) {
      setStoryIdx(curStory + 1);
    } else if (curGroup < groups.length - 1) {
      setGroupIdx(curGroup + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [groups, onClose]);

  const goBack = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const curGroup = groupIdxRef.current;
    const curStory = storyIdxRef.current;
    if (curStory > 0) {
      setStoryIdx(curStory - 1);
    } else if (curGroup > 0) {
      setGroupIdx(curGroup - 1);
      setStoryIdx(0);
    }
  }, []);

  // Progress timer for images
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setShowViewers(false);
    if (story.media_type === 'video') return; // video uses onTimeUpdate
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + (100 / (DURATION / 100));
        if (next >= 100) {
          advance();
          return 100;
        }
        return next;
      });
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [story?.id, groupIdx, advance]); // eslint-disable-line

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowRight')  advance();
      if (e.key === 'ArrowLeft')   goBack();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, advance, goBack]);

  async function handleDelete() {
    if (!story) return;
    setDeleting(true);
    await onDeleteStory(story.id);
    setDeleting(false);
    // After delete, stay at same index (next story shifts into place) or go back
    const grp = groups[groupIdx];
    if (grp && grp.stories.length > 1) {
      // If we were on the last story, step back one; otherwise the index is already correct
      if (storyIdx >= grp.stories.length - 1) {
        setStoryIdx(Math.max(0, storyIdx - 1));
      }
      // else: storyIdx stays, the story that was after this one slides into position
    } else {
      onClose();
    }
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
            key={story.id}
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
          <img key={story.id} src={story.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        {/* Gradient overlays */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Progress bars */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 3 }}>
          {group.stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: '#fff',
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ position: 'absolute', top: 24, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--grad-brand)', padding: 2, flexShrink: 0 }}>
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

          {/* Owner controls: add more, viewers, delete */}
          {isOwner && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={e => { e.stopPropagation(); onRequestUpload(); }}
                title="Add to story"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                <Plus size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowViewers(v => !v); }}
                title="See viewers"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
                title="Delete story"
                style={{ background: 'rgba(244,63,94,0.25)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          )}

          {/* Non-owner close */}
          {!isOwner && (
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}>
              <X size={22} />
            </button>
          )}

          {/* Owner close (separate, so controls stay visible) */}
          {isOwner && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex' }}>
              <X size={22} />
            </button>
          )}
        </div>

        {/* Tap zones — only when viewers panel is hidden */}
        {!showViewers && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', top: 80 }}>
            <div style={{ flex: 1 }} onClick={goBack} />
            <div style={{ flex: 1 }} onClick={advance} />
          </div>
        )}

        {/* Group navigation arrows */}
        {groupIdx > 0 && !showViewers && (
          <button
            onClick={e => { e.stopPropagation(); setGroupIdx(g => g - 1); setStoryIdx(0); }}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {groupIdx < groups.length - 1 && !showViewers && (
          <button
            onClick={e => { e.stopPropagation(); setGroupIdx(g => g + 1); setStoryIdx(0); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Viewers panel (slides up from bottom) */}
        {showViewers && isOwner && (
          <ViewersPanel storyId={story.id} onClose={() => setShowViewers(false)} />
        )}
      </div>
    </div>
  );
}

/* ── StoriesBar ─────────────────────────────────── */
const StoriesBar: React.FC<StoriesBarProps> = ({ currentUserId }) => {
  const supabase = createClient();
  const [groups,         setGroups]         = useState<StoryGroup[]>([]);
  const [showUpload,     setShowUpload]      = useState(false);
  const [viewerOpen,     setViewerOpen]      = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx]  = useState(0);

  async function loadStories() {
    // Fetch stories without FK join (works without FK constraints on user_id)
    const { data: stories, error: storiesErr } = await supabase
      .from('stories')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (storiesErr) { console.error('[Nia] loadStories error:', storiesErr); return; }
    if (!stories || stories.length === 0) { setGroups([]); return; }

    // Fetch profiles for all story authors separately
    const authorIds = [...new Set(stories.map((s: any) => s.user_id))];
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', authorIds);
    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

    const { data: views } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', currentUserId);

    const viewedSet = new Set((views ?? []).map((v: any) => v.story_id));

    const map = new Map<string, StoryGroup>();
    for (const s of stories as any[]) {
      const uid = s.user_id;
      const profile = profileMap.get(uid);
      if (!map.has(uid)) {
        map.set(uid, {
          userId:     uid,
          username:   profile?.username ?? 'unknown',
          avatar_url: profile?.avatar_url ?? null,
          stories:    [],
          hasUnread:  false,
        });
      }
      const grp = map.get(uid)!;
      grp.stories.push(s);
      // Own stories never count as unread
      if (uid !== currentUserId && !viewedSet.has(s.id)) grp.hasUnread = true;
    }

    const sorted = [...map.values()].sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      return (b.hasUnread ? 1 : 0) - (a.hasUnread ? 1 : 0);
    });
    setGroups(sorted);
  }

  useEffect(() => { loadStories(); }, []); // eslint-disable-line

  async function deleteStory(storyId: string) {
    // Delete from DB (storage cleanup can be a background job)
    await supabase.from('stories').delete().eq('id', storyId);
    // Optimistically remove from local state
    setGroups(prev =>
      prev
        .map(g => ({ ...g, stories: g.stories.filter(s => s.id !== storyId) }))
        .filter(g => g.stories.length > 0)
    );
  }

  function openViewer(idx: number) {
    setViewerGroupIdx(idx);
    setViewerOpen(true);
    // Optimistically mark the group as read so the ring turns grey immediately
    const grp = groups[idx];
    if (grp && grp.userId !== currentUserId) {
      setGroups(prev =>
        prev.map((g, i) => i === idx ? { ...g, hasUnread: false } : g)
      );
    }
  }

  const myGroup = groups.find(g => g.userId === currentUserId);

  return (
    <>
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 14, padding: '12px 16px', minWidth: 'max-content' }}>

          {/* My story bubble */}
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 60, height: 60, borderRadius: '50%', padding: 2,
                  background: myGroup ? 'var(--grad-brand)' : 'var(--surface-3)',
                  cursor: 'pointer',
                }}
                onClick={() => myGroup ? openViewer(groups.indexOf(myGroup)) : setShowUpload(true)}
              >
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
              </div>
              {/* Always-visible + badge to add a new story */}
              <div
                onClick={() => setShowUpload(true)}
                title="Add to story"
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--grad-brand)', border: '2px solid var(--surface-0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 1,
                }}
              >
                <Plus size={10} color="#fff" strokeWidth={3} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {myGroup ? 'My story' : 'Add story'}
            </span>
          </div>

          {/* Other users */}
          {groups.filter(g => g.userId !== currentUserId).map(g => {
            const idx = groups.indexOf(g);
            return (
              <div
                key={g.userId}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                onClick={() => openViewer(idx)}
              >
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
          onUploaded={() => { setShowUpload(false); loadStories(); }}
        />
      )}

      {/* Viewer */}
      {viewerOpen && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          startGroupIdx={viewerGroupIdx}
          currentUserId={currentUserId}
          onClose={() => { setViewerOpen(false); loadStories(); }}
          onRequestUpload={() => { setViewerOpen(false); setShowUpload(true); }}
          onDeleteStory={deleteStory}
        />
      )}
    </>
  );
};

export default StoriesBar;