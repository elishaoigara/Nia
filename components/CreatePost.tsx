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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface MediaItem {
  file: File;
  preview: string;
  type: 'image' | 'video';
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
const MAX_VIDEO_MB = 10;
const MAX_VIDEO_SEC = 60;

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
  const [captionLoad, setCaptionLoad] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLanguage] = useState('english');
  const [showLang, setShowLang] = useState(false);
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

    addFiles(files, 'image');

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

      addFiles([f], 'video');
    }

    setLoading(false);
  }

  function addFiles(files: File[], type: 'image' | 'video') {
    setError('');

    const slots = MAX_MEDIA - mediaItems.length;

    const items: MediaItem[] = files
      .slice(0, slots)
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        type,
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

      /* Upload images/videos */
      } else if (mediaItems.length > 0) {
        const uploaded: { url: string; type: string }[] = [];

        for (const item of mediaItems) {
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
        }

        media_url = uploaded[0].url;
        media_type = uploaded[0].type;
        extra_media = uploaded.slice(1);
      }

      /* Insert post */
      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          circle_id: circleId,
          content: content.trim() || null,
          media_url,
          media_type,
          extra_media: extra_media.length ? extra_media : null,
          language,
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
    }
  }

  const initials =
    profile?.username?.[0]?.toUpperCase() ?? '?';

  const mediaCount = mediaItems.length;
  let mediaGridClass = '';
  if (mediaCount === 1) mediaGridClass = 'single';
  else if (mediaCount === 2) mediaGridClass = 'dual';
  else if (mediaCount === 3) mediaGridClass = 'triple';
  else if (mediaCount === 4) mediaGridClass = 'quad';
  else if (mediaCount === 5) mediaGridClass = 'penta';

  return (
    <div className="compose-root">
      {/* ── Compose row ─────────────────────────── */}
      <div className="compose-row">
        <div className="compose-left">
          <div className="post-avatar">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username ?? 'Your avatar'}
              />
            ) : (
              <div className="post-avatar-inner">{initials}</div>
            )}
          </div>
        </div>
        <div className="compose-body">
          <textarea
            ref={textRef}
            className="compose-textarea"
            placeholder="What's happening?"
            value={content}
            onChange={e => {
              setContent(e.target.value);
              grow();
            }}
            rows={1}
            maxLength={MAX_CHARS * 2}
          />
          <button
            className="btn-post"
            disabled={!canPost || loading}
            onClick={handlePost}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────── */}
      {error && (
        <div className="compose-toolbar" style={{ borderBottom: 'none', paddingTop: 0 }}>
          <p style={{ color: 'var(--nia-coral)', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── Poll UI ─────────────────────────────── */}
      {showPoll && (
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--divider)' }}>
          <input
            className="input"
            placeholder="Ask a question…"
            value={pollQ}
            onChange={e => setPollQ(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {pollOpts.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                className="input"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={e => {
                  const next = [...pollOpts];
                  next[i] = e.target.value;
                  setPollOpts(next);
                }}
                style={{ flex: 1 }}
              />
              {pollOpts.length > 2 && (
                <button
                  className="btn-ghost"
                  onClick={() => setPollOpts(prev => prev.filter((_, j) => j !== i))}
                  style={{ padding: '8px 10px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {pollOpts.length < 5 && (
            <button
              className="btn-ghost"
              onClick={() => setPollOpts(prev => [...prev, ''])}
              style={{ fontSize: 13, padding: '6px 14px', marginTop: 4 }}
            >
              <Plus size={14} style={{ marginRight: 4 }} /> Add option
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Poll duration:
            </label>
            <select
              value={pollDur}
              onChange={e => setPollDur(e.target.value)}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            >
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

      {/* ── Media preview grid ──────────────────── */}
      {mediaItems.length > 0 && (
        <div style={{ padding: '0 16px 12px' }}>
          <div className={`post-media ${mediaGridClass}`}>
            {mediaItems.map((item, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                {item.type === 'image' ? (
                  <img src={item.preview} alt={`Upload ${idx}`} />
                ) : (
                  <video src={item.preview} />
                )}
                <button
                  onClick={() => removeMedia(idx)}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Voice recording UI ──────────────────── */}
      {voiceBlob && (
        <div style={{ padding: '0 16px 12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--surface-2)',
              borderRadius: 12,
            }}
          >
            <Mic size={18} style={{ color: 'var(--nia-violet)' }} />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Voice note attached
            </span>
            <button
              onClick={() => setVoiceBlob(null)}
              className="btn-ghost"
              style={{
                marginLeft: 'auto',
                padding: '4px 10px',
                fontSize: 12,
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Language selector ───────────────────── */}
      {showLang && (
        <div
          style={{
            padding: '0 16px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {AFRICAN_LANGUAGES.map(l => (
            <button
              key={l.code}
              className={language === l.code ? 'btn-primary' : 'btn-ghost'}
              style={{ fontSize: 13, padding: '4px 12px' }}
              onClick={() => {
                setLanguage(l.code);
                setShowLang(false);
              }}
            >
              {l.emoji} {l.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────── */}
      <div className="compose-toolbar">
        <div className="compose-icons">
          {/* Image picker */}
          {canAddMore && (
            <>
              <button
                className="compose-icon-btn"
                onClick={() => imageRef.current?.click()}
                title="Add image"
              >
                <ImagePlus size={20} />
              </button>
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                style={{ display: 'none' }}
                multiple
              />
            </>
          )}

          {/* Video picker */}
          {canAddMore && (
            <>
              <button
                className="compose-icon-btn"
                onClick={() => videoRef.current?.click()}
                title="Add video"
              >
                <Video size={20} />
              </button>
              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                onChange={handleVideoPick}
                style={{ display: 'none' }}
              />
            </>
          )}

          {/* Voice recording */}
          <button
            className="compose-icon-btn"
            onClick={toggleRecording}
            title={recording ? 'Stop recording' : 'Record voice'}
            style={{ color: recording ? 'var(--nia-coral)' : undefined }}
          >
            {recording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* AI caption */}
          <button
            className="compose-icon-btn"
            onClick={generateCaption}
            disabled={captionLoad}
            title="Generate AI caption"
          >
            {captionLoad ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Sparkles size={20} />
            )}
          </button>

          {/* Poll */}
          <button
            className="compose-icon-btn"
            onClick={() => setShowPoll(prev => !prev)}
            title="Add poll"
            style={{ color: showPoll ? 'var(--nia-violet)' : undefined }}
          >
            <BarChart2 size={20} />
          </button>

          {/* Language */}
          <button
            className="compose-icon-btn"
            onClick={() => setShowLang(prev => !prev)}
            title="Select language"
            style={{ color: showLang ? 'var(--nia-violet)' : undefined }}
          >
            <span style={{ fontSize: 18 }}>
              {AFRICAN_LANGUAGES.find(l => l.code === language)?.emoji ?? '🌍'}
            </span>
          </button>
        </div>

        {/* Character counter */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isOver
              ? 'var(--nia-coral)'
              : charsLeft <= 20
              ? 'var(--nia-amber)'
              : 'var(--text-tertiary)',
          }}
        >
          {content.length > 0 ? charsLeft : ''}
        </span>
      </div>
    </div>
  );
}
