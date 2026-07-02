// components/CreatePost.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ImagePlus,
  Video,
  X,
  Loader2,
  Sparkles,
  BarChart2,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Play,
  Globe,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VIDEO_CATEGORIES } from '@/lib/video-categories';

interface MediaItem {
  file: File;
  preview: string;
  type: 'image' | 'video';
  duration?: number;
}

interface CreatePostProps {
  userId: string;
  circleId?: string | null;
}

interface Profile {
  username: string;
  avatar_url: string | null;
}

interface LanguageOption {
  code: string;
  label: string;
  emoji: string;
}

const AFRICAN_LANGUAGES: LanguageOption[] = [
  { code: 'english', label: 'English', emoji: '🇬🇧' },
  { code: 'swahili', label: 'Swahili', emoji: '🇰🇪' },
  { code: 'yoruba', label: 'Yoruba', emoji: '🇳🇬' },
  { code: 'zulu', label: 'Zulu', emoji: '🇿🇦' },
  { code: 'amharic', label: 'Amharic', emoji: '🇪🇹' },
  { code: 'hausa', label: 'Hausa', emoji: '🇳🇬' },
  { code: 'igbo', label: 'Igbo', emoji: '🇳🇬' },
  { code: 'afrikaans', label: 'Afrikaans', emoji: '🇿🇦' },
];

const MAX_MEDIA = 5;
const MAX_CHARS = 500;
const MAX_IMAGE_MB = 20;
const MAX_VIDEO_MB = 150;
const MAX_VIDEO_SEC = 600; // 10 min ceiling — short vs long is decided automatically by duration

export default function CreatePost({
  userId,
  circleId = null,
}: CreatePostProps) {
  const supabase = createClient();
  const router = useRouter();

  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [captionLoad, setCaptionLoad] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLanguage] = useState('english');
  const [showLang, setShowLang] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);
  const [pollDur, setPollDur] = useState('24');
  const [recording, setRecording] = useState(false);

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  /* fetch own profile for avatar */
  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }: { data: Profile | null }) => setProfile(data));
  }, [userId]); // eslint-disable-line

  /* auto-grow textarea */
  const grow = () => {
    const el = textRef.current;

    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  const canAddMore = mediaItems.length < MAX_MEDIA && !voiceBlob;
  const hasVideo = mediaItems.some(m => m.type === 'video');
  const charsLeft = MAX_CHARS - content.length;
  const isOver = charsLeft < 0;

  const canPost =
    !isOver &&
    (
      content.trim() ||
      mediaItems.length > 0 ||
      voiceBlob ||
      (
        showPoll &&
        pollQ.trim() &&
        pollOpts.filter(o => o.trim()).length >= 2
      )
    );

  /* ── Image pick ──────────────────────────────────── */
  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);

    const tooBig = files.filter(f => f.size > MAX_IMAGE_MB * 1024 * 1024);
    const ok = files.filter(f => f.size <= MAX_IMAGE_MB * 1024 * 1024);

    if (tooBig.length) {
      setError(
        tooBig.length === 1
          ? `That image is over ${MAX_IMAGE_MB} MB. Try a smaller photo.`
          : `${tooBig.length} images are over ${MAX_IMAGE_MB} MB and were skipped.`
      );
    } else {
      setError('');
    }

    if (ok.length) {
      addFiles(ok, 'image');
    }

    e.target.value = '';
  }

  /* ── Video pick ──────────────────────────────────── */
  async function handleVideoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);

    for (const f of files) {
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`Video must be under ${MAX_VIDEO_MB} MB.`);
        continue;
      }

      const dur = await getVideoDuration(f);

      if (dur > MAX_VIDEO_SEC) {
        setError(`Videos must be under ${MAX_VIDEO_SEC}s.`);
        continue;
      }

      addFiles([f], 'video', dur);
    }

    setLoading(false);
  }

  function addFiles(files: File[], type: 'image' | 'video', duration?: number) {
    setError('');

    const slots = MAX_MEDIA - mediaItems.length;

    const items: MediaItem[] = files
      .slice(0, slots)
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        type,
        duration,
      }));

    setMediaItems(prev => [...prev, ...items]);

    if (items.length) {
      setVoiceBlob(null);
    }
  }

  function removeMedia(idx: number) {
    setMediaItems(prev => {
      URL.revokeObjectURL(prev[idx].preview);

      return prev.filter((_, i) => i !== idx);
    });
  }

  function getVideoDuration(file: File): Promise<number> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);

      const v = document.createElement('video');

      v.preload = 'metadata';

      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(v.duration);
      };

      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };

      v.src = url;
    });
  }

  /* ── Voice recording ─────────────────────────────── */
  async function toggleRecording() {
    if (recording) {
      mediaRecRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mr = new MediaRecorder(stream);

      chunksRef.current = [];

      mr.ondataavailable = e => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: 'audio/webm',
        });

        setVoiceBlob(blob);
        setMediaItems([]);

        stream.getTracks().forEach(t => t.stop());
      };

      mr.start();

      mediaRecRef.current = mr;

      setRecording(true);
    } catch {
      setError('Microphone access denied.');
    }
  }

  /* ── AI caption ──────────────────────────────────── */
  async function generateCaption() {
    if (!content.trim() && mediaItems.length === 0) {
      return;
    }

    setCaptionLoad(true);

    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (data.caption) {
        setContent(data.caption);
      }
    } catch {
      setError('Caption generation failed.');
    } finally {
      setCaptionLoad(false);
    }
  }

  function extractTags(text: string) {
    return (
      text.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g) ?? []
    )
      .map(t => t.toLowerCase().replace('#', ''));
  }

  /* ── Submit ──────────────────────────────────────── */
  async function handlePost() {
    if (!canPost || loading) {
      return;
    }

    setLoading(true);
    setError('');

    let media_url: string | null = null;
    let media_type: string | null = null;

    let extra_media: { url: string; type: string }[] = [];

    const totalUploads = voiceBlob ? 1 : mediaItems.length;
    if (totalUploads > 0) {
      setUploadProgress({ done: 0, total: totalUploads });
    }

    try {
      /* Upload voice */
      if (voiceBlob) {
        const path = `${userId}/voice_${Date.now()}.webm`;

        const { error: upErr } = await supabase.storage
          .from('post-media')
          .upload(path, voiceBlob, {
            contentType: 'audio/webm',
          });

        if (upErr) {
          setError('Voice upload failed.');
          return;
        }

        media_url = supabase.storage
          .from('post-media')
          .getPublicUrl(path)
          .data.publicUrl;

        media_type = 'audio';
        setUploadProgress({ done: 1, total: 1 });

      /* Upload images/videos */
      } else if (mediaItems.length > 0) {
        const uploaded: { url: string; type: string }[] = [];

        for (let i = 0; i < mediaItems.length; i++) {
          const item = mediaItems[i];
          const ext =
            item.file.name.split('.').pop() ??
            (item.type === 'video' ? 'mp4' : 'jpg');

          const path =
            `${userId}/${Date.now()}_${Math.random()
              .toString(36)
              .slice(2)}.${ext}`;

          const { error: upErr } = await supabase.storage
            .from('post-media')
            .upload(path, item.file, {
              contentType: item.file.type,
            });

          if (upErr) {
            setError(`Upload failed: ${upErr.message}`);
            return;
          }

          uploaded.push({
            url: supabase.storage
              .from('post-media')
              .getPublicUrl(path)
              .data.publicUrl,
            type: item.type,
          });

          setUploadProgress({ done: i + 1, total: mediaItems.length });
        }

        media_url = uploaded[0].url;
        media_type = uploaded[0].type;
        extra_media = uploaded.slice(1);
      }

      /* Insert post */
      const isVideo = media_type === 'video';
      const videoDuration = isVideo ? (mediaItems[0]?.duration ?? null) : null;

      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          circle_id: circleId,
          content: content.trim() || null,
          media_url,
          media_type,
          video_duration: videoDuration,
          extra_media: extra_media.length ? extra_media : null,
          language,
          category: isVideo ? (category ?? 'other') : null,
        })
        .select()
        .single();

      if (postErr) {
        setError(postErr.message);
        return;
      }

      /* Hashtags */
      if (post && content.trim()) {
        const tags = extractTags(content);

        if (tags.length) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('country')
            .eq('id', userId)
            .single();

          await supabase.from('hashtags').insert(
            tags.map(tag => ({
              tag,
              post_id: post.id,
              user_id: userId,
              country: prof?.country ?? null,
            }))
          );
        }
      }

      /* Poll */
      const hasPoll =
        showPoll &&
        pollQ.trim() &&
        pollOpts.filter(o => o.trim()).length >= 2;

      if (hasPoll && post) {
        const validOpts = pollOpts.filter(o => o.trim());

        await supabase.from('polls').insert({
          post_id: post.id,
          question: pollQ.trim(),
          options: validOpts.map((text, i) => ({
            id: `opt_${i}`,
            text,
            votes: 0,
          })),
          ends_at: new Date(
            Date.now() + parseInt(pollDur) * 3_600_000
          ).toISOString(),
        });
      }

      /* Reset */
      mediaItems.forEach(m => URL.revokeObjectURL(m.preview));

      setContent('');
      setMediaItems([]);
      setVoiceBlob(null);
      setCategory(null);

      setShowPoll(false);
      setPollQ('');
      setPollOpts(['', '']);
      setPollDur('24');

      if (textRef.current) {
        textRef.current.style.height = 'auto';
      }

      router.refresh();

    } catch (err) {
      console.error(err);
      setError('Something went wrong.');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  const initials =
    profile?.username?.[0]?.toUpperCase() ?? '?';

  /* ── Collapsed / expanded state ─────────────────── */
  const [isOpen, setIsOpen] = useState(false);

  function openCompose() {
    setIsOpen(true);
    // Let the panel render before focusing
    setTimeout(() => textRef.current?.focus(), 80);
  }

  function closeCompose() {
    // Only collapse if nothing is in progress
    if (loading || recording) return;
    if (content || mediaItems.length || voiceBlob) return;
    setIsOpen(false);
  }

  const mediaCount = mediaItems.length;
  let mediaGridClass = '';
  if (mediaCount === 1) mediaGridClass = 'single';
  else if (mediaCount === 2) mediaGridClass = 'dual';
  else if (mediaCount === 3) mediaGridClass = 'triple';
  else if (mediaCount === 4) mediaGridClass = 'quad';
  else if (mediaCount === 5) mediaGridClass = 'penta';

  return (
    <div className="compose-root">

      {/* ── Ghost trigger pill (collapsed state) ─────── */}
      {!isOpen && (
        <div
          className="compose-trigger"
          onClick={openCompose}
          role="button"
          aria-label="Create a post"
        >
          <div className="compose-trigger-avatar">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" />
              : <span>{initials}</span>
            }
          </div>
          <div className="compose-trigger-pill">
            <span className="compose-trigger-placeholder">
              Share something with Africa 🌍
            </span>
          </div>
          <button
            className="compose-trigger-media"
            onClick={e => { e.stopPropagation(); openCompose(); imageRef.current?.click(); }}
            aria-label="Add photo"
          >
            <ImagePlus size={20} />
          </button>
        </div>
      )}

      {/* ── Expanded compose panel ────────────────────── */}
      <div className={`compose-panel ${isOpen ? 'compose-panel--open' : ''}`}>

        {isOpen && !content && !mediaItems.length && !voiceBlob && (
          <button
            className="compose-collapse-btn"
            onClick={closeCompose}
            aria-label="Collapse compose"
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>↑ collapse</span>
          </button>
        )}

        <div className="compose-row">
          <div className="compose-left">
            <div className="post-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username ?? 'Your avatar'} />
              ) : (
                <div className="post-avatar-inner">{initials}</div>
              )}
            </div>
          </div>
          <div className="compose-body">
            <textarea
              ref={textRef}
              className="compose-textarea"
              placeholder="Share something with Africa 🌍"
              value={content}
              onChange={e => { setContent(e.target.value); grow(); }}
              rows={1}
              maxLength={MAX_CHARS * 2}
            />
            <button
              className="btn-post"
              disabled={!canPost || loading}
              onClick={handlePost}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 className="animate-spin" size={16} />
                  {uploadProgress && uploadProgress.total > 0
                    ? `${uploadProgress.done}/${uploadProgress.total}`
                    : null}
                </span>
              ) : 'Post'}
            </button>
          </div>
        </div>

        {!content && (
          <div className="mood-chips hidden-scrollbar">
            {[
              { emoji: '😂', label: 'Funny' },
              { emoji: '🔥', label: 'Hot take' },
              { emoji: '💡', label: 'Insight' },
              { emoji: '🎵', label: 'Music' },
              { emoji: '💪', label: 'Motivation' },
              { emoji: '🍽️', label: 'Food' },
            ].map(({ emoji, label }) => (
              <button
                key={label}
                className="mood-chip"
                onClick={() => {
                  const ta = document.querySelector('.compose-textarea') as HTMLTextAreaElement;
                  if (ta) ta.focus();
                }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="compose-toolbar" style={{ borderBottom: 'none', paddingTop: 0 }}>
            <p style={{ color: 'var(--nia-coral)', fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}

        {showPoll && (
          <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--divider)' }}>
            <input className="input" placeholder="Ask a question…" value={pollQ} onChange={e => setPollQ(e.target.value)} style={{ marginBottom: 8 }} />
            {pollOpts.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="input" placeholder={`Option ${i + 1}`} value={opt}
                  onChange={e => { const next = [...pollOpts]; next[i] = e.target.value; setPollOpts(next); }}
                  style={{ flex: 1 }}
                />
                {pollOpts.length > 2 && (
                  <button className="btn-ghost" onClick={() => setPollOpts(prev => prev.filter((_, j) => j !== i))} style={{ padding: '8px 10px' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {pollOpts.length < 5 && (
              <button className="btn-ghost" onClick={() => setPollOpts(prev => [...prev, ''])} style={{ fontSize: 13, padding: '6px 14px', marginTop: 4 }}>
                <Plus size={14} style={{ marginRight: 4 }} /> Add option
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Poll duration:</label>
              <select value={pollDur} onChange={e => setPollDur(e.target.value)}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 13, color: 'var(--text-primary)' }}>
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">3 days</option>
                <option value="168">7 days</option>
              </select>
            </div>
          </div>
        )}

        {mediaItems.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div className={`post-media compose-media ${mediaGridClass}`}>
              {mediaItems.map((item, idx) => (
                <div key={idx} className="compose-media-item">
                  {item.type === 'image' ? (
                    <img src={item.preview} alt={`Upload ${idx + 1}`} />
                  ) : (
                    <>
                      <video src={item.preview} muted playsInline />
                      <span className="compose-media-badge">
                        <Play size={12} fill="currentColor" />
                      </span>
                    </>
                  )}
                  <button
                    className="compose-media-remove"
                    onClick={() => removeMedia(idx)}
                    aria-label="Remove media"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <p className="compose-media-hint">
              {mediaItems.length}/{MAX_MEDIA} added
            </p>
          </div>
        )}

        {voiceBlob && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 12 }}>
              <Mic size={18} style={{ color: 'var(--nia-violet)' }} />
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Voice note attached</span>
              <button onClick={() => setVoiceBlob(null)} className="btn-ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}

        {showLang && (
          <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {AFRICAN_LANGUAGES.map(l => (
              <button key={l.code} className={language === l.code ? 'btn-primary' : 'btn-ghost'}
                style={{ fontSize: 13, padding: '4px 12px' }}
                onClick={() => { setLanguage(l.code); setShowLang(false); }}>
                {l.emoji} {l.label}
              </button>
            ))}
          </div>
        )}

        {hasVideo && (
          <div style={{ padding: '0 16px 12px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Topic — helps people find this in Flicks
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VIDEO_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={category === c.id ? 'btn-primary' : 'btn-ghost'}
                  style={{ fontSize: 13, padding: '4px 12px' }}
                  onClick={() => setCategory(c.id)}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="compose-toolbar">
          <div className="compose-icons">
            {canAddMore && (
              <>
                <button className="compose-icon-btn" onClick={() => imageRef.current?.click()} title="Add image"><ImagePlus size={20} /></button>
                <input ref={imageRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} multiple />
              </>
            )}
            {canAddMore && (
              <>
                <button className="compose-icon-btn" onClick={() => videoRef.current?.click()} title="Add video"><Video size={20} /></button>
                <input ref={videoRef} type="file" accept="video/*" onChange={handleVideoPick} style={{ display: 'none' }} />
              </>
            )}
            <button className="compose-icon-btn" onClick={toggleRecording} title={recording ? 'Stop recording' : 'Record voice'} style={{ color: recording ? 'var(--nia-coral)' : undefined }}>
              {recording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button className="compose-icon-btn" onClick={generateCaption} disabled={captionLoad} title="Generate AI caption">
              {captionLoad ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            </button>
            <button className="compose-icon-btn" onClick={() => setShowPoll(prev => !prev)} title="Add poll" style={{ color: showPoll ? 'var(--nia-violet)' : undefined }}>
              <BarChart2 size={20} />
            </button>
            <button className="compose-icon-btn" onClick={() => setShowLang(prev => !prev)} title="Select language" style={{ color: showLang || language !== 'english' ? 'var(--nia-violet)' : undefined }}>
              <Globe size={20} />
              {language !== 'english' && (
                <span className="compose-lang-badge">
                  {language.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          </div>
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: isOver ? 'var(--nia-coral)' : charsLeft <= 20 ? 'var(--nia-amber)' : 'var(--text-tertiary)',
          }}>
            {content.length > 0 ? charsLeft : ''}
          </span>
        </div>

      </div>{/* end compose-panel */}
    </div>
  );
}