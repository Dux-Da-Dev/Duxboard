'use client'

import { useRef, useState } from 'react'
import { createSupabaseBrowserClient as createClient } from '@/lib/supabase/client'
import { createFileAttachment } from './actions'

interface FileUploaderProps {
  pinId: string
  userId: string
}

export default function FileUploader({ pinId, userId }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const supabase = createClient()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    // 1. Upload to 'documents' bucket
    const filePath = `${pinId}/${userId}/${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      alert(`Error uploading file: ${uploadError.message}`)
      setIsUploading(false)
      return
    }

    // 2. Create a file record in the database
    const result = await createFileAttachment(pinId, file.name, filePath)

    if (result?.error) {
        alert(`Error creating file record: ${result.error}`)
        // Attempt to delete the orphaned file
        await supabase.storage.from('documents').remove([filePath])
    }

    // Reset the file input
    if(fileInputRef.current) {
        fileInputRef.current.value = ''
    }

    setIsUploading(false)
    // The FileList's real-time subscription will handle the UI update
  }

  return (
    <div className="mt-4 relative z-20">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isUploading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>
  )
}
