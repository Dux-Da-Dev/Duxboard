import { createSupabaseServerClient as createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import Board from './board';
import GoogleSignIn from './google-sign-in';

type Profile = Database['public']['Tables']['profiles']['Row'];
type PinType = Database['public']['Tables']['pins']['Row'];
type ConnectionType = Database['public']['Tables']['connections']['Row'];

export default async function Home() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <GoogleSignIn />;
  }

  // Call the new database function to get or create the board
  const { data: boardId, error: rpcError } = await supabase.rpc(
    'get_or_create_user_board',
    { p_user_id: user.id }
  );

  if (rpcError || !boardId) {
    console.error('Could not get or create a board for this user.', rpcError);
    // You might want to render an error page here
    return <div>Error loading board.</div>;
  }

  const pinsPromise = supabase
    .from('pins')
    .select('*, scale')
    .eq('board_id', boardId)
    .eq('is_deleted', false)
    .is('parent_pin_id', null);
  const profilePromise = supabase.from('profiles').select('*').eq('id', user.id).single();
  const connectionsPromise = supabase.from('connections').select('*');

  const [
    { data: pinsData },
    { data: profileData },
    { data: connectionsData }
  ] = await Promise.all([
    pinsPromise,
    profilePromise,
    connectionsPromise,
  ]);

  const pins: PinType[] = pinsData ?? [];
  const profile: Profile | null = profileData;
  const connections: ConnectionType[] = connectionsData ?? [];

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
