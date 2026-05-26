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
import { createClient } from '@/utils/supabase/client';

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

const MAX_MEDIA = 2;
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

  return (
    <div>
      {/* your existing JSX unchanged */}
    </div>
  );
}