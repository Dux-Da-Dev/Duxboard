'use client'

import { useState, Fragment, FormEvent, useEffect, useCallback } from 'react'
import { getModelInstructions, regeneratePinImage } from './actions'
import Image from 'next/image'
import { Dialog, Transition } from '@headlessui/react'
import LimitReachedModal from './limit-reached-modal'
import type { Database } from '@/lib/database.types'

type PinType = Database['public']['Tables']['pins']['Row']
type InstructionProfile = {
  id: string
  profile_name: string
}

interface EditPinImageModalProps {
  pin: PinType | null
  isOpen: boolean
  onClose: () => void
}

export default function EditPinImageModal({ pin, isOpen, onClose }: EditPinImageModalProps) {
  const [isLimitModalOpen, setLimitModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [profiles, setProfiles] = useState<InstructionProfile[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    const result = await getModelInstructions()
    if (result.success && result.data) {
      setProfiles(result.data)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchProfiles()
    }
  }, [isOpen, fetchProfiles])

  const handleGenerateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!pin) return

    setIsGenerating(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const prompt = formData.get('prompt') as string
    const instructionProfileId = formData.get('instructionProfileId') as string

    const result = await regeneratePinImage(pin.id, prompt, instructionProfileId)

    if (result.limitExceeded) {
      setLimitModalOpen(true)
      onClose()
    } else if (result.error) {
      setError(result.error)
    } else if (result.success) {
      onClose()
    }

    setIsGenerating(false)
  }

  return (
    <>
      <LimitReachedModal
        isOpen={isLimitModalOpen}
        onClose={() => setLimitModalOpen(false)}
      />
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
                <Dialog.Title as="h3" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Regenerate Pin Image
                </Dialog.Title>

                {pin && (
                  <div className="mt-4">
                    <Image src={pin.image_url} alt="Current pin image" width={150} height={150} className="rounded-lg object-cover" />
                  </div>
                )}

                <form onSubmit={handleGenerateSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt</label>
                    <textarea
                      id="prompt"
                      name="prompt"
                      rows={4}
                      className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="instructionProfileId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Instruction Profile</label>
                    <select id="instructionProfileId" name="instructionProfileId" defaultValue={profiles[0]?.id} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.profile_name}</option>)}
                    </select>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="p-2 border rounded" disabled={isGenerating}>Cancel</button>
                    <button type="submit" className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700" disabled={isGenerating}>
                      {isGenerating ? 'Generating...' : 'Generate & Replace'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}
