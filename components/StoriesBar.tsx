'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, ChevronLeft, ChevronRight, Plus, Loader2, ImagePlus, Video, Trash2, Eye, Send, MessageCircle } from 'lucide-react';

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

/* ── Avatar helper ────────────────────────────────── */
function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--grad-brand)', padding: 1.5, flexShrink: 0,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        background: '#181614', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      }}>
        {url
          ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : name[0]?.toUpperCase()
        }
      </div>
    </div>
  );
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
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)',
          borderRadius: 24, padding: 24, width: '90%', maxWidth: 400,
          display: 'flex', flexDirection: 'column', gap: 16,
          border: '0.5px solid var(--border)',
          boxShadow: '0 32px 80px rgba(91,33,182,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0, color: 'var(--text-primary)' }}>Add to your story</h2>
          <button onClick={onClose} style={{
            background: 'var(--surface-2)', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
          Visible to your followers for 24 hours.
        </p>

        {preview ? (
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '9/16', maxHeight: 320 }}>
            {type === 'video'
              ? <video src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
              : <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            }
            <button
              onClick={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(null); }}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                width: 30, height: 30, cursor: 'pointer', display: 'flex',
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
            {[
              { label: 'Photo', icon: <ImagePlus size={22} />, onClick: () => imageRef.current?.click() },
              { label: 'Video', icon: <Video size={22} />, onClick: () => videoRef.current?.click() },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                style={{
                  flex: 1, padding: '28px 0', borderRadius: 16,
                  border: '1.5px dashed var(--border)', background: 'var(--surface-2)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8, color: 'var(--text-secondary)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {btn.icon}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{btn.label}</span>
              </button>
            ))}
          </div>
        )}

        {error && <p style={{ color: '#f43f5e', fontSize: 13, margin: 0 }}>{error}</p>}

        <button
          onClick={upload}
          disabled={!file || loading}
          style={{
            padding: '13px', borderRadius: 14, border: 'none',
            background: file ? 'var(--grad-brand)' : 'var(--surface-3)',
            color: file ? '#fff' : 'var(--text-tertiary)',
            fontWeight: 700, fontSize: 15, cursor: file ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Share story'}
        </button>
      </div>
    </div>
  );
}

/* ── Viewers Panel ─────────────────────────────── */
function ViewersPanel({
  storyId,
  onClose,
}: {
  storyId: string;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [viewers, setViewers] = useState<ViewerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setDbError(null);
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

    const viewerIds = viewRows.map((v: any) => v.viewer_id);
    const { data: profileRows, error: profErr } = await supabase
      .from('profiles').select('id, username, avatar_url').in('id', viewerIds);
    if (profErr) console.error('[Nia] profiles fetch error:', profErr);
    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

    setViewers(viewRows.map((v: any) => {
      const p = profileMap.get(v.viewer_id);
      return { user_id: v.viewer_id, username: p?.username ?? 'unknown', avatar_url: p?.avatar_url ?? null, viewed_at: v.viewed_at };
    }));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`story_views_${storyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'story_views', filter: `story_id=eq.${storyId}` },
        () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storyId]); // eslint-disable-line

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60)    return `${s}s`;
    if (s < 3600)  return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,9,8,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '24px 24px 0 0',
        paddingBottom: 32,
        maxHeight: '56%', overflowY: 'auto',
        zIndex: 10,
        borderTop: '0.5px solid rgba(124,58,237,0.22)',
      }}
    >
      {/* Drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 6 }}>
        <div style={{ width: 38, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.14)' }} />
      </div>

      {/* Hero row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 18px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 24, lineHeight: 1 }}>
            {loading ? '—' : viewers.length}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>
            {loading ? 'Loading…' : viewers.length === 1 ? 'view · last 24h' : 'views · last 24h'}
          </div>
        </div>
        <button onClick={load} title="Refresh" style={{
          background: 'rgba(124,58,237,0.16)', border: '0.5px solid rgba(124,58,237,0.3)',
          borderRadius: '50%', width: 34, height: 34, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8,
        }}>
          <Loader2 size={14} style={{ color: '#7C3AED' }} />
        </button>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.07)', border: 'none',
          borderRadius: '50%', width: 34, height: 34, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={16} style={{ color: 'rgba(255,255,255,0.55)' }} />
        </button>
      </div>

      {dbError && (
        <p style={{ color: '#f43f5e', fontSize: 12, padding: '8px 18px 0', margin: 0 }}>{dbError}</p>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#7C3AED' }} />
        </div>
      ) : viewers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Eye size={30} style={{ color: 'rgba(255,255,255,0.1)', display: 'block', margin: '0 auto 10px' }} />
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 14, margin: 0 }}>No views yet</p>
        </div>
      ) : viewers.map((v, i) => (
        <div key={v.user_id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
          borderBottom: i < viewers.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
        }}>
          <Avatar url={v.avatar_url} name={v.username} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {v.username}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 12, marginTop: 1 }}>{timeAgo(v.viewed_at)} ago</div>
          </div>
          {/* DM shortcut */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(124,58,237,0.14)',
            border: '0.5px solid rgba(124,58,237,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <MessageCircle size={15} style={{ color: '#7C3AED' }} />
          </div>
        </div>
      ))}
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
  const [groupIdx,    setGroupIdx]    = useState(startGroupIdx);
  const [storyIdx,    setStoryIdx]    = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [reply,       setReply]       = useState('');
  const [sending,     setSending]     = useState(false);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);
  const groupIdxRef  = useRef(groupIdx);
  const storyIdxRef  = useRef(storyIdx);
  groupIdxRef.current = groupIdx;
  storyIdxRef.current = storyIdx;

  const QUICK_REACTIONS = ['❤️', '😂', '🔥', '😮'];
  const DURATION = 5000;

  const group   = groups[groupIdx];
  const story   = group?.stories[storyIdx];
  const isOwner = group?.userId === currentUserId;

  // Mark viewed instantly
  useEffect(() => {
    if (!story || story.user_id === currentUserId) return;
    async function recordView() {
      const { error } = await supabase
        .from('story_views')
        .upsert(
          { story_id: story!.id, viewer_id: currentUserId, viewed_at: new Date().toISOString() },
          { onConflict: 'story_id,viewer_id' }
        );
      if (error) {
        console.error('[Nia] story_views upsert failed:', error.code, error.message);
        const { error: insertErr } = await supabase
          .from('story_views')
          .insert({ story_id: story!.id, viewer_id: currentUserId, viewed_at: new Date().toISOString() });
        if (insertErr) console.error('[Nia] story_views insert fallback failed:', insertErr.message);
      } else {
        console.log('[Nia] story view recorded:', story!.id);
      }
    }
    recordView();
  }, [story?.id]); // eslint-disable-line

  const advance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const cg = groupIdxRef.current, cs = storyIdxRef.current;
    const grp = groups[cg];
    if (!grp) { onClose(); return; }
    if (cs < grp.stories.length - 1) setStoryIdx(cs + 1);
    else if (cg < groups.length - 1) { setGroupIdx(cg + 1); setStoryIdx(0); }
    else onClose();
  }, [groups, onClose]);

  const goBack = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const cg = groupIdxRef.current, cs = storyIdxRef.current;
    if (cs > 0) setStoryIdx(cs - 1);
    else if (cg > 0) { setGroupIdx(cg - 1); setStoryIdx(0); }
  }, []);

  // Progress timer
  useEffect(() => {
    if (!story) return;
    setProgress(0);
    setShowViewers(false);
    setReply('');
    if (story.media_type === 'video') return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + (100 / (DURATION / 100));
        if (next >= 100) { advance(); return 100; }
        return next;
      });
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [story?.id, groupIdx, advance]); // eslint-disable-line

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowRight') advance();
      if (e.key === 'ArrowLeft')  goBack();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, advance, goBack]);

  async function handleDelete() {
    if (!story) return;
    setDeleting(true);
    await onDeleteStory(story.id);
    setDeleting(false);
    const grp = groups[groupIdx];
    if (grp && grp.stories.length > 1) {
      if (storyIdx >= grp.stories.length - 1) setStoryIdx(Math.max(0, storyIdx - 1));
    } else { onClose(); }
  }

  async function sendReply(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    // Send as a DM to the story owner — adjust to your messages table shape
    await supabase.from('messages').insert({
      sender_id:   currentUserId,
      recipient_id: group.userId,
      content:     text,
      story_id:    story?.id ?? null,
    });
    setSending(false);
    setReply('');
  }

  if (!story) return null;

  /* violet ring colour for progress bars */
  const VIOLET = '#7C3AED';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100dvh', overflow: 'hidden' }}>

        {/* ── Media ── */}
        {story.media_type === 'video' ? (
          <video
            key={story.id} ref={videoRef} src={story.media_url}
            autoPlay playsInline muted={false}
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

        {/* ── Gradient overlays ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 28%, transparent 60%, rgba(0,0,0,0.72) 100%)',
        }} />

        {/* ── Progress bars (violet-tinted) ── */}
        <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', gap: 3 }}>
          {group.stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: i < storyIdx ? '#fff' : i === storyIdx ? VIOLET : 'transparent',
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                transition: 'none',
              }} />
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div style={{ position: 'absolute', top: 24, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar url={group.avatar_url} name={group.username} size={38} />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{group.username}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
              {new Date(story.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Owner controls */}
          {isOwner && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={e => { e.stopPropagation(); onRequestUpload(); }}
                title="Add to story"
                style={{ background: 'rgba(124,58,237,0.25)', border: '0.5px solid rgba(124,58,237,0.4)', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C4B5FD' }}
              >
                <Plus size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowViewers(v => !v); }}
                title="See viewers"
                style={{ background: 'rgba(124,58,237,0.25)', border: '0.5px solid rgba(124,58,237,0.4)', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C4B5FD' }}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
                title="Delete story"
                style={{ background: 'rgba(220,38,38,0.2)', border: '0.5px solid rgba(220,38,38,0.3)', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FCA5A5' }}
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Viewer close */}
          {!isOwner && (
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Tap zones ── */}
        {!showViewers && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', top: 80, bottom: isOwner ? 0 : 80 }}>
            <div style={{ flex: 1 }} onClick={goBack} />
            <div style={{ flex: 1 }} onClick={advance} />
          </div>
        )}

        {/* ── Group navigation arrows ── */}
        {groupIdx > 0 && !showViewers && (
          <button
            onClick={e => { e.stopPropagation(); setGroupIdx(g => g - 1); setStoryIdx(0); }}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {groupIdx < groups.length - 1 && !showViewers && (
          <button
            onClick={e => { e.stopPropagation(); setGroupIdx(g => g + 1); setStoryIdx(0); }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* ── Reply bar (non-owners only) ── */}
        {!isOwner && !showViewers && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '10px 14px 22px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)',
          }}>
            {/* Quick reactions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => sendReply(emoji)}
                  style={{
                    fontSize: 22, background: 'rgba(255,255,255,0.10)',
                    border: '0.5px solid rgba(255,255,255,0.18)',
                    borderRadius: 14, width: 44, height: 40,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.12s, transform 0.1s',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* Reply input */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendReply(reply); }}
                placeholder={`Reply to ${group.username}…`}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.10)',
                  border: '0.5px solid rgba(124,58,237,0.35)',
                  borderRadius: 22, padding: '9px 16px',
                  color: '#fff', fontSize: 14,
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => sendReply(reply)}
                disabled={!reply.trim() || sending}
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none',
                  background: reply.trim() ? 'var(--grad-brand)' : 'rgba(255,255,255,0.1)',
                  cursor: reply.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >
                {sending
                  ? <Loader2 size={16} className="animate-spin" style={{ color: '#fff' }} />
                  : <Send size={16} style={{ color: reply.trim() ? '#fff' : 'rgba(255,255,255,0.35)' }} />
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Viewers panel ── */}
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
    const { data: stories, error: storiesErr } = await supabase
      .from('stories').select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (storiesErr) { console.error('[Nia] loadStories error:', storiesErr); return; }
    if (!stories || stories.length === 0) { setGroups([]); return; }

    const authorIds = [...new Set(stories.map((s: any) => s.user_id))];
    const { data: profileRows } = await supabase
      .from('profiles').select('id, username, avatar_url').in('id', authorIds);
    const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

    const { data: views } = await supabase
      .from('story_views').select('story_id').eq('viewer_id', currentUserId);
    const viewedSet = new Set((views ?? []).map((v: any) => v.story_id));

    const map = new Map<string, StoryGroup>();
    for (const s of stories as any[]) {
      const uid = s.user_id;
      const profile = profileMap.get(uid);
      if (!map.has(uid)) {
        map.set(uid, { userId: uid, username: profile?.username ?? 'unknown', avatar_url: profile?.avatar_url ?? null, stories: [], hasUnread: false });
      }
      const grp = map.get(uid)!;
      grp.stories.push(s);
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
    await supabase.from('stories').delete().eq('id', storyId);
    setGroups(prev =>
      prev.map(g => ({ ...g, stories: g.stories.filter(s => s.id !== storyId) }))
          .filter(g => g.stories.length > 0)
    );
  }

  function openViewer(idx: number) {
    setViewerGroupIdx(idx);
    setViewerOpen(true);
    const grp = groups[idx];
    if (grp && grp.userId !== currentUserId) {
      setGroups(prev => prev.map((g, i) => i === idx ? { ...g, hasUnread: false } : g));
    }
  }

  const myGroup = groups.find(g => g.userId === currentUserId);

  /* ── Bubble renderer ── */
  function Bubble({ g, idx, isMine }: { g: StoryGroup; idx: number; isMine?: boolean }) {
    const unread = isMine ? !!myGroup : g.hasUnread;

    /* Ring: 72px outer shell — 52px avatar inner + 2.5px gap + 3px ring */
    const OUTER = 72;
    const INNER = 52; /* avatar image area */

    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={() => isMine ? (myGroup ? openViewer(idx) : setShowUpload(true)) : openViewer(idx)}
      >
        <div style={{ position: 'relative', width: OUTER, height: OUTER }}>
          {/* Pulse ring — only on unread non-mine bubbles */}
          {unread && !isMine && (
            <div style={{
              position: 'absolute', inset: -3,
              borderRadius: '50%',
              background: 'var(--grad-brand)',
              animation: 'story-ring-pulse 2s ease-in-out infinite',
              opacity: 0.55,
              zIndex: 0,
            }} />
          )}

          {/* Outer ring shell */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            padding: 3,
            background: unread ? 'var(--grad-brand)' : 'var(--surface-3)',
            zIndex: 1,
          }}>
            {/* Gap between ring and avatar */}
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              border: '2.5px solid var(--surface-0)',
              background: 'var(--surface-2)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {g.avatar_url
                ? <img src={g.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : isMine && !myGroup
                  ? <Plus size={24} color="var(--text-secondary)" />
                  : <span style={{ color: unread ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: 20 }}>
                      {g.username[0]?.toUpperCase()}
                    </span>
              }
            </div>
          </div>

          {/* Add-more badge (my story only) */}
          {isMine && (
            <div
              onClick={e => { e.stopPropagation(); setShowUpload(true); }}
              style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--grad-brand)',
                border: '2.5px solid var(--surface-0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 2,
              }}
            >
              <Plus size={11} color="#fff" strokeWidth={3} />
            </div>
          )}

          {/* Unread story-count pip (others only, >1 story) */}
          {!isMine && g.hasUnread && g.stories.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              background: '#DC2626',
              border: '2.5px solid var(--surface-0)',
              borderRadius: 10, minWidth: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', zIndex: 2,
            }}>
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>{g.stories.length}</span>
            </div>
          )}
        </div>

        {/* Username — 8 char cap, bolder when unread */}
        <span style={{
          fontSize: 11, fontWeight: unread ? 700 : 500,
          whiteSpace: 'nowrap',
          maxWidth: OUTER, overflow: 'hidden', textOverflow: 'ellipsis',
          color: unread ? 'var(--text-primary)' : 'var(--text-tertiary)',
          letterSpacing: unread ? '0.01em' : '0',
        }}>
          {isMine
            ? (myGroup ? 'My story' : 'Add story')
            : g.username.length > 9 ? g.username.slice(0, 8) + '…' : g.username
          }
        </span>
      </div>
    );
  }

  /* own placeholder group when user has no stories yet */
  const placeholderGroup: StoryGroup = { userId: currentUserId, username: 'You', avatar_url: null, stories: [], hasUnread: false };

  return (
    <>
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: 14, padding: '14px 16px 10px', minWidth: 'max-content' }}>
          <Bubble g={myGroup ?? placeholderGroup} idx={myGroup ? groups.indexOf(myGroup) : -1} isMine />
          {groups.filter(g => g.userId !== currentUserId).map(g => (
            <Bubble key={g.userId} g={g} idx={groups.indexOf(g)} />
          ))}
        </div>
      </div>

      {showUpload && (
        <StoryUploadModal
          currentUserId={currentUserId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadStories(); }}
        />
      )}

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