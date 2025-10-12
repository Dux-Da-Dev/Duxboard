'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import './editor-styles.css' // I will create this file for basic editor styling

interface NotesEditorProps {
  pinId: string;
  content: string | null
  onSave: (newContent: string) => void
}

export default function NotesEditor({ pinId, content, onSave }: NotesEditorProps) {
  const [saveStatus, setSaveStatus] = useState('Saved')

  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none p-4 h-full',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('Saving...')
      debouncedSave(editor.getHTML())
    },
  })

  const debouncedSave = useDebouncedCallback((newContent: string) => {
    onSave(newContent)
    setSaveStatus('Saved')
  }, 1000)

  // This effect ensures that if the component is for a new pin, the editor is updated.
  // It only runs when the pinId changes.
  useEffect(() => {
    if (editor) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinId, editor]);


  return (
    <div className="relative h-full min-h-[200px] border rounded-md">
      <EditorContent editor={editor} />
      <div className="absolute bottom-2 right-2 text-xs text-gray-400">
        {saveStatus}
      </div>
    </div>
  )
}
