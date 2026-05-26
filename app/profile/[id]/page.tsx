// app/profile/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export default function Profile() {
  const { id } = useParams() as { id: string };
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) console.error(error);
      else setProfile(data);
    };

    if (id) fetchProfile();
  }, [id, supabase]);

  if (!profile) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">
        {profile.full_name ?? profile.username}
      </h1>
      <p className="mt-2">{profile.bio}</p>

      <div className="mt-4 flex gap-4">
        <button className="btn-primary">Follow</button>
        <button className="btn-ghost">Message</button>
      </div>
    </div>
  );
}
