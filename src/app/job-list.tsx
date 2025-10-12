'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient as createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import { clearGenerationJobsForPin } from './actions'
import { Trash2 } from 'lucide-react'

type JobType = Database['public']['Tables']['generation_jobs']['Row']

interface JobListProps {
  pinId: string
}

export default function JobList({ pinId }: JobListProps) {
  const [jobs, setJobs] = useState<JobType[]>([])
  const [isClearing, setIsClearing] = useState(false)
  const supabase = createClient()

  const handleClearJobs = async () => {
    setIsClearing(true)
    await clearGenerationJobsForPin(pinId)
    // The real-time subscription will handle the UI update
    setIsClearing(false)
  }

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('anchor_pin_id', pinId)
        .in('status', ['pending', 'processing', 'failed'])

      if (error) {
        console.error('Error fetching jobs:', error)
      } else if (data) {
        setJobs(data)
      }
    }
    fetchJobs()
  }, [pinId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-jobs-for-pin-${pinId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'generation_jobs', filter: `anchor_pin_id=eq.${pinId}` },
        (payload) => {
            const newJob = payload.new as JobType;

            setJobs(currentJobs => {
                const jobMap = new Map(currentJobs.map(j => [j.id, j]));

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    jobMap.set(newJob.id, newJob);
                } else if (payload.eventType === 'DELETE') {
                    const oldJobId = (payload.old as {id: string})?.id;
                    if(oldJobId) {
                        jobMap.delete(oldJobId);
                    }
                }

                const updatedJobs = Array.from(jobMap.values())
                    .filter(job => job.status === 'pending' || job.status === 'processing' || job.status === 'failed');

                // If a DELETE operation happens via the clear button, the server action
                // might delete multiple rows. The realtime event will fire for each,
                // but we can also just refetch or filter locally.
                // The current implementation handles this by removing jobs one by one.
                // A full clear event from the server would be more efficient.
                // For now, this is robust enough. If all jobs are gone, the component will return null.
                return updatedJobs;
            });
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pinId, supabase])

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="my-4 p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
      <div className="flex justify-between items-center mb-2">
        <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400">Generation Jobs:</h5>
        {jobs.length > 0 && (
          <button
            onClick={handleClearJobs}
            disabled={isClearing}
            className="p-1 text-gray-500 hover:text-red-500 disabled:opacity-50"
            aria-label="Clear job queue"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {jobs.map((job) => (
          <li key={job.id} className="text-sm">
            {job.status === 'processing' || job.status === 'pending' ? (
               <span className="text-blue-600 dark:text-blue-400">Processing: &quot;{job.source_content}&quot;...</span>
            ) : (
               <span className="text-red-600 dark:text-red-400">Failed: {job.error_message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
