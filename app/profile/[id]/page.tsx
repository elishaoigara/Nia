import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/router';

export default function Profile() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.from('users').select('*').eq('id', id);
      if (error) console.error(error);
      else setUser(data[0]);
    };
    fetchUser();
  }, [id]);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
      <p>Followers: {user.followers}</p>
      <p>Following: {user.following}</p>
      <button>Follow</button>
      <button>Message</button>
    </div>
  );
}
