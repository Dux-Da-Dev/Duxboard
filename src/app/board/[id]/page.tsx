import { createSupabaseServerClient as createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Board from '../../board' // Adjust path if needed

export default async function SubBoardPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

// Fetch ONLY the pins that belong to this sub-board, identified by the parent_pin_id.
const pinsPromise = supabase
  .from('pins')
  .select('*, scale')
  .eq('parent_pin_id', params.id)
  .eq('is_deleted', false);

  const profilePromise = supabase.from('profiles').select('*').eq('id', user.id).single();

  // The connections query can now be simplified since we have all the pins
  const { data: subBoardPins } = await supabase.from('pins').select('id').or(`id.eq.${params.id},parent_pin_id.eq.${params.id}`);
  const pinIds = subBoardPins?.map(p => p.id) || [];
  const connectionsPromise = supabase.from('connections').select('*').in('start_pin_id', pinIds).in('end_pin_id', pinIds);

  const [{ data: pins }, { data: profile }, { data: connections }] = await Promise.all([
    pinsPromise,
    profilePromise,
    connectionsPromise,
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Board
        serverPins={pins ?? []}
        serverConnections={connections ?? []}
        user={user}
        profile={profile}
      />
    </main>
  );
}
