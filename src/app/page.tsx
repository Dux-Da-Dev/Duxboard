'use client' // <-- Convert to a Client Component

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient as createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import dynamic from 'next/dynamic';
import GoogleSignIn from './google-sign-in';
import Loading from './loading'; // Import the loading component
import { User } from '@supabase/supabase-js';

const Board = dynamic(() => import('./board'), {
  ssr: false,
});

type Profile = Database['public']['Tables']['profiles']['Row'];
type PinType = Database['public']['Tables']['pins']['Row'];
type ConnectionType = Database['public']['Tables']['connections']['Row'];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pins, setPins] = useState<PinType[]>([]);
  const [connections, setConnections] = useState<ConnectionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // Call the new database function to get or create the board
        const { data: boardId, error: rpcError } = await supabase.rpc(
          'get_or_create_user_board',
          { p_user_id: currentUser.id }
        );

        if (rpcError || !boardId) {
          console.error('Could not get or create a board for this user.', rpcError);
          setIsLoading(false);
          return; // Stop if we couldn't get a board
        }

        const pinsPromise = supabase
          .from('pins')
          .select('*, scale')
          .eq('board_id', boardId)
          .eq('is_deleted', false)
          .is('parent_pin_id', null);
        const profilePromise = supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        const connectionsPromise = supabase.from('connections').select('*');

        const [{ data: pinsData }, { data: profileData }, { data: connectionsData }] = await Promise.all([
          pinsPromise,
          profilePromise,
          connectionsPromise,
        ]);

        setPins(pinsData ?? []);
        setProfile(profileData);
        setConnections(connectionsData ?? []);
      }

      setIsLoading(false);
    };

    checkUserAndFetchData();
  }, [supabase]);

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return <GoogleSignIn />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Board
        serverPins={pins}
        serverConnections={connections}
        user={user}
        profile={profile}
      />
    </main>
  );
}
