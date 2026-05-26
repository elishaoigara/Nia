// app/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function Notifications() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error(error);
      else setNotifications(data ?? []);
    };
    fetch();
  }, [supabase]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      {notifications.length === 0 ? (
        <p>No notifications yet 🔔</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="p-3 border rounded-lg bg-[var(--surface-1)]"
            >
              {n.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
