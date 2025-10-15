'use client'

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient as createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/database.types';
import dynamic from 'next/dynamic';
import GoogleSignIn from './google-sign-in';
import Loading from './loading';
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
  const [isLoading, setIsLoading] = useState(true); // Start in a loading state
  const supabase = createClient();

useEffect(() => {
    const checkUserAndFetchData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          const { data: boardId, error: rpcError } = await supabase.rpc(
            'get_or_create_user_board',
            { p_user_id: currentUser.id }
          );

          if (rpcError) throw rpcError;

          const pinsPromise = supabase
            .from('pins')
            .select('*, scale')
            .eq('board_id', boardId)
            .eq('is_deleted', false)
            .is('parent_pin_id', null);
          const profilePromise = supabase.from('profiles').select('*').eq('id', currentUser.id).single();
          const connectionsPromise = supabase.from('connections').select('*');

          const [
              { data: pinsData, error: pinsError },
              { data: profileData, error: profileError },
              { data: connectionsData, error: connectionsError }
          ] = await Promise.all([
            pinsPromise,
            profilePromise,
            connectionsPromise,
          ]);

          if (pinsError) throw pinsError;
          if (profileError) throw profileError;
          if (connectionsError) throw connectionsError;

          setPins(pinsData ?? []);
          setProfile(profileData);
          setConnections(connectionsData ?? []);
        }
      } catch (error) {
          console.error("Failed to fetch initial board data:", error);
          // You might want to show an error message to the user here
      } finally {
          // This block will always run, ensuring the loading state is removed.
          setIsLoading(false);
      }
    };

    checkUserAndFetchData();
  }, [supabase]);

  // Show a loading spinner while the initial auth check and data fetch are happening
  if (isLoading) {
    return <Loading />;
  }

  // If not loading and no user, show the sign-in component
  if (!user) {
    return <GoogleSignIn />;
  }

  // If not loading and there is a user, show the board
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
