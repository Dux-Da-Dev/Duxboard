'use client'

import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect, FormEvent, useCallback } from 'react'
import { getModelInstructions, createModelInstruction, updateModelInstruction, deleteModelInstruction } from './actions'

type InstructionProfile = {
  id: string
  profile_name: string
  instructions: string
  user_id: string
  created_at: string
}

type ModelInstructionsModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ModelInstructionsModal({ isOpen, onClose }: ModelInstructionsModalProps) {
  const [profiles, setProfiles] = useState<InstructionProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<InstructionProfile | null>(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileInstructions, setNewProfileInstructions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [defaultProfileCreationAttempted, setDefaultProfileCreationAttempted] = useState(false)

  const defaultInstructions = `### **[YOUR TASK]**

    Act as an expert AI research agent. Your goal is to generate a detailed and engaging article about a given subject, focusing on hidden and underappreciated facts and stories.

    ---

    ### **[RESPONSE STRUCTURE]**

    You must follow this structure precisely:

    1.  **Introductory Paragraph:** A brief, engaging introduction to the subject.
    2.  **Three Main Sections:**
        * Each section **MUST** have a descriptive title using a \`##\` Markdown heading. The titles should suggest a timeline (e.g., "The Early Years," "A Shift in Focus," "Enduring Legacy") without using the literal words "Past," "Current," or "Future."
        * Each of the three sections **MUST** contain exactly three distinct, well-developed points, presented as bullet points (\`*\`).
        * Separate each of the three main sections with a \`---\` Markdown horizontal rule.
    3.  **Concluding Fun Facts List:**
        * The article **MUST** end with a list titled \`### Five Insightful Achievements or Fun Facts about [Subject]:\`.
        * This list **MUST** contain exactly five short, insightful facts.
    4.  **Visuals List:**
        * After the fun facts, include a final list titled \`### Relevant Visuals:\`.
        * This list **MUST** contain exactly five conceptual links for relevant images or videos.

    ---

    ### **[MANDATORY FORMATTING RULES]**

    * **CRITICAL EXCLUSION:** The "Research Protocol" mentioned in your original instructions is for your internal process only. **DO NOT include the \`## Tool Code\` section, the Python code block, or any text like "Simulating live research..." in your final, user-facing response.** The output must be a clean, polished article starting directly with the introductory paragraph.
    * **SPACING:** Add **two blank lines** before every \`##\` heading and every \`---\` horizontal rule to ensure proper visual spacing.
    * **EMPHASIS:** Use bold (\`**key term**\`) for important terms to improve readability.

    ---

    ### **[CONTENT AND STYLE GUIDELINES]**

    * **Research:** Ensure the information is well-researched, unique, and focuses on underappreciated stories.
    * **Language:** Use clear, engaging, and straightforward language. Avoid jargon and conversational fillers.
    * **Tone:** Maintain an informative and engaging tone with diverse sentence structures.`

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true)
    // Only try to create the default profile once
    if (!defaultProfileCreationAttempted) {
      const result = await getModelInstructions()
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }
      if (result.data && result.data.length === 0) {
        setDefaultProfileCreationAttempted(true) // Prevent future attempts
        const createResult = await createModelInstruction('Default', defaultInstructions)
        if (createResult.error) {
          setError(createResult.error)
        } else if (createResult.data) {
          setProfiles([createResult.data]) // Set the new profile directly
        }
      } else if (result.data) {
        setProfiles(result.data)
      }
    } else {
      // If we've already attempted creation, just fetch normally
      const result = await getModelInstructions()
       if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setProfiles(result.data)
      }
    }
    setIsLoading(false)
  }, [defaultInstructions, defaultProfileCreationAttempted])

  useEffect(() => {
    if (isOpen) {
      fetchProfiles()
    }
  }, [isOpen, fetchProfiles])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newProfileName || !newProfileInstructions) {
      setError('Profile name and instructions are required.')
      return
    }
    setError(null)
    setIsLoading(true)
    await createModelInstruction(newProfileName, newProfileInstructions)
    setNewProfileName('')
    setNewProfileInstructions('')
    await fetchProfiles()
    setIsLoading(false)
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return
    setError(null)
    setIsLoading(true)
    await updateModelInstruction(selectedProfile.id, selectedProfile.profile_name, selectedProfile.instructions)
    setSelectedProfile(null)
    await fetchProfiles()
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      setError(null)
      setIsLoading(true)
      await deleteModelInstruction(id)
      await fetchProfiles()
      setIsLoading(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => { onClose(); setSelectedProfile(null); }}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <DialogPanel onWheel={(e) => e.stopPropagation()} className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                <DialogTitle as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Model Instruction Profiles</DialogTitle>

                {isLoading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}

                <div className="mt-4">
                  <h4 className="font-bold mb-2">Your Profiles</h4>
                  <ul className="space-y-2">
                    {profiles.map(profile => (
                      <li key={profile.id} className="flex items-center justify-between p-2 border rounded dark:border-gray-600">
                        <span>{profile.profile_name}</span>
                        <div className="space-x-2">
                          <button onClick={() => setSelectedProfile(profile)} className="text-sm text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(profile.id)} className="text-sm text-red-600 hover:underline">Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t dark:border-gray-600">
                  <h4 className="font-bold mb-2">{selectedProfile ? 'Edit Profile' : 'Create New Profile'}</h4>
                  <form onSubmit={selectedProfile ? handleUpdate : handleCreate} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Profile Name"
                      value={selectedProfile ? selectedProfile.profile_name : newProfileName}
                      onChange={(e) => selectedProfile ? setSelectedProfile({ ...selectedProfile, profile_name: e.target.value }) : setNewProfileName(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                    <textarea
                      placeholder="Instructions for the AI model..."
                      rows={6}
                      value={selectedProfile ? selectedProfile.instructions : newProfileInstructions}
                      onChange={(e) => selectedProfile ? setSelectedProfile({ ...selectedProfile, instructions: e.target.value }) : setNewProfileInstructions(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      {selectedProfile && <button type="button" onClick={() => setSelectedProfile(null)} className="p-2 border rounded">Cancel Edit</button>}
                      <button type="submit" className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={isLoading}>
                        {isLoading ? 'Saving...' : (selectedProfile ? 'Save Changes' : 'Create Profile')}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-6 flex justify-end">
                  <button type="button" onClick={() => { onClose(); setSelectedProfile(null); }} className="p-2 border rounded">Close</button>
                </div>

              </DialogPanel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
