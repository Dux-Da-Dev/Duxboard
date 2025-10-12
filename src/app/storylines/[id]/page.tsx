import { createSupabaseServerClient as createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const StorylineEditor = dynamic(() => import('./storyline-editor'), {
  ssr: false,
})

type StorylinePageProps = {
  params: {
    id: string
  }
}

export default async function StorylinePage({ params }: StorylinePageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>You must be logged in to view this storyline.</div>
  }

  const { data: storyline, error: storylineError } = await supabase
    .from('storylines')
    .select('id, title, is_public')
    .eq('id', params.id)
    .single()

  if (storylineError || !storyline) {
    notFound()
  }

  const { data: storylinePins, error: pinsError } = await supabase
    .from('storyline_pins')
    .select('id, position, is_completed, pins!inner(*)')
    .eq('storyline_id', params.id)

  if (pinsError) {
    return <div>Error loading storyline pins: {pinsError.message}</div>
  }

  const { data: allUserPins, error: allPinsError } = await supabase
    .from('pins')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)

  if (allPinsError) {
      return <div>Error loading your pins: {allPinsError.message}</div>
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // The 'pins' property is nested in storylinePins, so we need to extract it.
  const processedPins = storylinePins
    .map(sp => {
      if (!sp.pins || Array.isArray(sp.pins) && sp.pins.length === 0) return null;
      const pin = Array.isArray(sp.pins) ? sp.pins[0] : sp.pins;
      const position = sp.position as { x: number; y: number };
      return {
        ...pin,
        storyline_pin_id: sp.id,
        is_completed: sp.is_completed,
        position: position,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);


  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/storylines" className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
          &larr; Back to Storylines
        </Link>
        <h1 className="text-2xl font-bold">{storyline.title}</h1>
      </div>
      <StorylineEditor
        storylineId={storyline.id}
        initialPins={processedPins}
        allUserPins={allUserPins}
        user={user}
        profile={profile}
        isPublic={storyline.is_public}
      />
    </div>
  )
}
