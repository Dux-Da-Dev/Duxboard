'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient as createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import { deleteAttachment, renameAttachment } from './actions' // Make sure to import renameAttachment

type FileType = Database['public']['Tables']['files']['Row']
type ProfileType = Database['public']['Tables']['profiles']['Row']

interface FileListProps {
  pinId: string
  userId: string
  profile: ProfileType | null
}

export default function FileList({ pinId, userId, profile }: FileListProps) {
  const [files, setFiles] = useState<FileType[]>([])
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const supabase = createClient()
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    const fetchFiles = async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('pin_id', pinId)

      if (error) {
        console.error('Error fetching files:', error)
      } else if (data) {
        setFiles(data)
      }
    }
    fetchFiles()
  }, [pinId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-files-for-pin-${pinId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files', filter: `pin_id=eq.${pinId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFiles((currentFiles) => [...currentFiles, payload.new as FileType])
          } else if (payload.eventType === 'UPDATE') {
            setFiles((currentFiles) => currentFiles.map(f => f.id === (payload.new as FileType).id ? payload.new as FileType : f))
          } else if (payload.eventType === 'DELETE') {
            setFiles((currentFiles) => currentFiles.filter(file => file.id !== (payload.old as {id: string}).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pinId, supabase])

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 60) // 60-second validity
    if (error) {
        console.error('Error creating signed URL:', error)
        alert('Error generating download link.')
        return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (file: FileType) => {
    if (window.confirm(`Are you sure you want to delete ${file.file_name}?`)) {
      await deleteAttachment(file.id)
    }
  }

  const handleRename = async (fileId: string) => {
    if (!newFileName.trim()) return
    const result = await renameAttachment(fileId, newFileName.trim())
    if (result.error) {
      alert(`Error: ${result.error}`)
    } else {
      setEditingFileId(null)
    }
  }

  if (files.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No attachments yet.</p>
  }

  return (
    <div className="mt-4">
      <ul className="space-y-2">
        {files.map((file) => {
          const canModify = isAdmin || file.user_id === userId
          return (
            <li key={file.id} className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-800">
              {editingFileId === file.id ? (
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent border-b dark:border-gray-600 focus:outline-none"
                />
              ) : (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.file_name}</span>
              )}
              <div className="flex items-center space-x-2">
                <button onClick={() => handleDownload(file.storage_path)} className="text-sm text-blue-600 hover:underline">Download</button>
                {canModify && (
                  <>
                    {editingFileId === file.id ? (
                      <button onClick={() => handleRename(file.id)} className="text-sm text-green-600 hover:underline">Save</button>
                    ) : (
                      <button onClick={() => { setEditingFileId(file.id); setNewFileName(file.file_name); }} className="text-sm text-gray-500 hover:underline">Edit</button>
                    )}
                    <button onClick={() => handleDelete(file)} className="text-sm text-red-600 hover:underline">Delete</button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
