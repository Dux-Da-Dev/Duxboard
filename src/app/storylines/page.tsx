import { createSupabaseServerClient as createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { createStoryline } from '../actions'
import DeleteStorylineButton from './DeleteStorylineButton'

export default async function StorylinesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>You must be logged in to view storylines.</div>
  }

  const { data: storylines, error } = await supabase
    .from('storylines')
    .select('id, title, is_public, user_id')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Error loading storylines: {error.message}</div>
  }

  const myStorylines = storylines.filter(s => s.user_id === user.id);
  const publicStorylines = storylines.filter(s => s.is_public && s.user_id !== user.id);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
            &larr; Return to Board
          </Link>
          <h1 className="text-2xl font-bold">Storylines</h1>
        </div>
        <form action={async (formData) => {
          'use server'
          const title = formData.get('title') as string
          if (title) {
            await createStoryline(title)
          }
        }}>
          <input type="text" name="title" placeholder="New storyline title" className="p-2 border rounded" />
          <button type="submit" className="ml-2 p-2 bg-blue-500 text-white rounded">Create</button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold mt-8 mb-4">Your Storylines</h2>
        {myStorylines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myStorylines.map((storyline) => (
              <div key={storyline.id} className="flex justify-between items-center p-4 border rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <Link href={`/storylines/${storyline.id}`} className="hover:underline flex-grow">
                  <h2 className="text-xl font-semibold">{storyline.title}</h2>
                </Link>
                <DeleteStorylineButton storylineId={storyline.id} />
              </div>
            ))}
          </div>
        ) : (
          <p>You haven&apos;t created any storylines yet.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mt-8 mb-4">Public Storylines</h2>
        {publicStorylines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicStorylines.map((storyline) => (
              <Link key={storyline.id} href={`/storylines/${storyline.id}`} className="block p-4 border rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                <h2 className="text-xl font-semibold">{storyline.title}</h2>
              </Link>
            ))}
          </div>
        ) : (
          <p>No public storylines available yet.</p>
        )}
      </div>
    </div>
  )
}
