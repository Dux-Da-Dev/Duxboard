// src/app/floating-action-button.tsx

'use client'

import { useState, useRef, Fragment, FormEvent, useEffect, useCallback } from 'react'
import { useTutorial } from './tutorial-provider'
import { createSupabaseBrowserClient as createClient } from '@/lib/supabase/client'
import { createPin, generatePin, getModelInstructions } from './actions'
import Image from 'next/image'
import { Dialog, Transition } from '@headlessui/react'
import LimitReachedModal from './limit-reached-modal';
import type { Database } from '@/lib/database.types'
import TutorialHighlight from './tutorial-highlight'

type PinType = Database['public']['Tables']['pins']['Row'] & { isLoading?: boolean; tempId?: string }

type InstructionProfile = {
  id: string
  profile_name: string
}

interface FloatingActionButtonProps {
  userId: string;
  onToggleConnectionMode: () => void;
  onUploadStart: (tempId: string, file: File) => void;
  addTemporaryPin: (pin: PinType) => void;
  updatePinFromTemporary: (pin: PinType) => void;
  removeTemporaryPin: (tempId: string) => void;
  onUploadComplete: (tempId: string, finalPin: any) => void;
}

export default function FloatingActionButton({ userId, onToggleConnectionMode, onUploadStart, addTemporaryPin, updatePinFromTemporary, removeTemporaryPin, onUploadComplete }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [isGenerateModalOpen, setGenerateModalOpen] = useState(false)
  const [isLimitModalOpen, setLimitModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false);
  const [profiles, setProfiles] = useState<InstructionProfile[]>([])
  const { isActive: isTutorialActive, completeStep, currentStep } = useTutorial(); // Get the function from context
  const [hasStartedTypingPrompt, setHasStartedTypingPrompt] = useState(false);

  // --- THIS IS THE FIX ---
  // Move the function declaration out of the if-block and wrap with useCallback.
  const fetchProfiles = useCallback(async () => {
    const result = await getModelInstructions()
    if (result.success && result.data) {
      setProfiles(result.data)
    }
  }, []);

  useEffect(() => {
    if (isGenerateModalOpen) {
      fetchProfiles();
    }
  }, [isGenerateModalOpen, fetchProfiles]);
  // --- END OF FIX ---

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsOpen(false);
    setIsUploading(true)
    const tempId = `temp-${Date.now()}`;

    // Immediately create a placeholder pin on the board
    onUploadStart(tempId, file);

    try {
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw new Error(`Error uploading file: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
      if (!publicUrl) throw new Error('Could not get public URL for the uploaded image.');

      // Pass the tempId to the server action
      const result = await createPin(publicUrl, tempId)

      if (result.success && result.data) {
        onUploadComplete(tempId, result.data);
      }

    } catch (error: any) {
        alert(error.message)
        removeTemporaryPin(tempId);
    } finally {
        if(fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        setIsUploading(false)
    }
  }

  const handleAddPinClick = () => {
    fileInputRef.current?.click()
  }

  const handleAddLineClick = () => {
    setIsOpen(false)
    onToggleConnectionMode()
  }

  // --- NEW HANDLER FOR GENERATE PIN SUBMIT ---
  const handleGenerateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const wasTutorialLastStep = isTutorialActive && currentStep === 10;
    setIsGenerating(true);

    const formData = new FormData(e.currentTarget);
    const prompt = formData.get('prompt') as string;
    const instructionProfileId = formData.get('instructionProfileId') as string;

    const tempId = `temp-${Date.now()}`;
    if (!wasTutorialLastStep) {
      setGenerateModalOpen(false);
    }

    const tempPin: PinType = {
      id: tempId,
      created_at: new Date().toISOString(),
      user_id: userId,
      image_url: '/generate-dux.jpeg', // Placeholder image
      position: { x: 4000, y: 3000 },
      notes: `<p>Generating from prompt: ${prompt}</p>`,
      is_deleted: false,
      isLoading: true,
      tempId: tempId,
      board_id: '', // Placeholder
      is_sub_board_hub: null,
      parent_pin_id: null,
      scale: 1,
    };

    addTemporaryPin(tempPin);

    const result = await generatePin(prompt, instructionProfileId);

    if (result.limitExceeded) {
      setLimitModalOpen(true);
      removeTemporaryPin(tempId);
    } else if (result.error) {
      alert(`Error generating pin: ${result.error}`);
      removeTemporaryPin(tempId);
    } else if (result.success && result.data) {
        const finalPin = { ...result.data, tempId };
        updatePinFromTemporary(finalPin as PinType);
        if (wasTutorialLastStep) {
          completeStep(10);
        }
    }
    setIsGenerating(false);
    setGenerateModalOpen(false);
  };

  return (
    <>
      <LimitReachedModal
        isOpen={isLimitModalOpen}
        onClose={() => setLimitModalOpen(false)}
      />
      <div className="fixed bottom-10 right-10 flex flex-col items-center gap-2 z-40">
        {/* Speed Dial Options */}
        <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          {/* --- NEW GENERATE BUTTON --- */}
          <button onClick={() => { setIsOpen(false); setGenerateModalOpen(true); if(isTutorialActive && currentStep === 9) completeStep(9); }} title="Generate Pin" className="bg-white w-12 h-12 rounded-full shadow-md hover:bg-gray-100 flex items-center justify-center overflow-hidden">
            <Image
              src="/generate-dux.jpeg"
              alt="Generate Pin with AI"
              width={48}
              height={48}
              className="object-cover"
            />
          </button>

          <button onClick={handleAddLineClick} title="Add Line" className="bg-white w-12 h-12 rounded-full shadow-md hover:bg-gray-100 flex items-center justify-center overflow-hidden">
            <Image src="/connectdux.png" alt="Add a new connection" width={48} height={48} className="object-cover"/>
          </button>

          <button onClick={handleAddPinClick} title="Add Pin" className="bg-white w-12 h-12 rounded-full shadow-md hover:bg-gray-100 flex items-center justify-center overflow-hidden" disabled={isUploading}>
            {isUploading ? (
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Image src="/uploaddux.png" alt="Upload new pin" width={48} height={48} className="object-cover"/>
            )}
          </button>
        </div>

        {/* Main FAB */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={isUploading} />
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (isTutorialActive && currentStep === 1) completeStep(1);
            if (isTutorialActive && currentStep === 8) completeStep(8);
          }}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
          aria-label="Toggle Add Menu"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {isTutorialActive && currentStep === 9 && (
        <TutorialHighlight
          step={9}
          selector="button[title='Generate Pin']"
          text="Now, click the Dux with the banana phone to generate a pin with AI."
          tooltipPosition="left"
          isCircle={true}
        />
      )}

      {/* --- NEW GENERATE PIN MODAL --- */}
      <Transition appear show={isGenerateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setGenerateModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
                <Dialog.Title as="h3" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Generate Pin with AI
                </Dialog.Title>

                {isTutorialActive && currentStep === 10 && !hasStartedTypingPrompt && (
                  <TutorialHighlight
                    step={10}
                    selector="#prompt"
                    text="Finally, write a prompt for the image you want to create and ensure an appropriate AI profile is selected. Then click 'Generate Pin' to finish the tutorial!"
                    tooltipPosition="bottom"
                  />
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
                      onChange={() => {
                        if (isTutorialActive && currentStep === 10) {
                          setHasStartedTypingPrompt(true);
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="instructionProfileId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Instruction Profile</label>
                    <select id="instructionProfileId" name="instructionProfileId" defaultValue={profiles[0]?.id} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required>
                      {profiles.map(p => <option key={p.id} value={p.id}>{p.profile_name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setGenerateModalOpen(false)} className="p-2 border rounded" disabled={isGenerating}>Cancel</button>
                    <button type="submit" className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700" disabled={isGenerating}>
                      {isGenerating ? 'Generating...' : 'Generate Pin'}
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