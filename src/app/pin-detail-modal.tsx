'use client'

    import { Dialog, Transition } from '@headlessui/react'
    import { Fragment, useState, useEffect, FormEvent } from 'react'
    import { useRouter, useParams } from 'next/navigation'
    import type { Database } from '@/lib/database.types'
    import NotesEditor from './notes-editor'
    import { updatePinNotes, getModelInstructions, generateWithGemini, convertToSubBoard, generateAttachment, exportAttachmentsAsPins } from './actions'
    import LimitReachedModal from './limit-reached-modal';
    import './editor-styles.css'
    import FileList from './file-list'
    import FileUploader from './file-uploader'
    import Image from 'next/image';
    import { createSupabaseBrowserClient } from '@/lib/supabase/client';
    import JobList from './job-list';
import { useTutorial } from './tutorial-provider'
import TutorialHighlight from './tutorial-highlight'
import EditPinImageModal from './edit-pin-image-modal'

    type PinType = Database['public']['Tables']['pins']['Row']
    type FileType = Database['public']['Tables']['files']['Row']
type ProfileType = Database['public']['Tables']['profiles']['Row']
    type InstructionProfile = {
      id: string
      profile_name: string
    }

    interface PinDetailModalProps {
      pin: PinType | null
      userId: string
      onClose: () => void
      onConversionSuccess: (pinId: string) => void;
    }

    export default function PinDetailModal({ pin, userId, onClose, onConversionSuccess }: PinDetailModalProps) {
  const { isActive: isTutorialActive, currentStep, completeStep } = useTutorial()
  const [subjectValue, setSubjectValue] = useState('');
  const [hasStartedTypingSubject, setHasStartedTypingSubject] = useState(false);
      const router = useRouter();
      const params = useParams();
      const [isLimitModalOpen, setLimitModalOpen] = useState(false);
      const [isProcessing, setIsProcessing] = useState(false);
      const [isAIPromptOpen, setIsAIPromptOpen] = useState(false)
      const [isAttachmentModalOpen, setisAttachmentModalOpen] = useState(false);
      const [isEditImageModalOpen, setIsEditImageModalOpen] = useState(false);
      const [attachmentPrompt, setAttachmentPrompt] = useState('');
      const [hasStartedTypingAttachment, setHasStartedTypingAttachment] = useState(false);
      const [profiles, setProfiles] = useState<InstructionProfile[]>([])
      const [notesContent, setNotesContent] = useState(pin?.notes || '')
      const [editorKey, setEditorKey] = useState(pin?.id || '')
      const [isLoading, setIsLoading] = useState(false)
      const [error, setError] = useState<string | null>(null)
      const [attachmentCount, setAttachmentCount] = useState(0);
      const [isExporting, setIsExporting] = useState(false);
  const [profile, setProfile] = useState<ProfileType | null>(null)
      const isOpen = pin !== null

      const handleExportAttachments = async () => {
        if (!pin) return;
        setIsExporting(true);
        const result = await exportAttachmentsAsPins(pin.id);
        if (result.error) {
          alert(`Error exporting attachments: ${result.error}`);
        } else {
          alert(result.message);
          onClose(); // Close the modal on success
        }
        setIsExporting(false);
      };

const handleSubBoardAction = async () => {
    if (!pin) return;
    setIsProcessing(true);

    const currentBoardId = params.id as string | undefined;

    // Case 1: We are inside a sub-board AND the selected pin is the hub for THIS sub-board.
    if (currentBoardId && pin.is_sub_board_hub && pin.parent_pin_id === currentBoardId) {
        router.push('/'); // Action: Return to the main board.
    }
    // Case 2: The pin is a sub-board hub (e.g., viewed from the main board).
    else if (pin.is_sub_board_hub) {
        router.push(`/board/${pin.id}`); // Action: Enter its sub-board.
    }
    // Case 3: The pin is not a hub.
    else {
        const result = await convertToSubBoard(pin.id); // Action: Convert it.
        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            onConversionSuccess(pin.id);
        }
    }

    // Always close the modal after an action
    onClose();
    setIsProcessing(false);
};

      useEffect(() => {
        setNotesContent(pin?.notes || '')
        setEditorKey(pin?.id || '')

        async function checkAttachments() {
          if (!pin) return;
          const supabase = createSupabaseBrowserClient();
          const { data: files, error } = await supabase
            .from('files')
            .select('id')
            .eq('pin_id', pin.id);

          if (error) {
            console.error("Error fetching attachments:", error);
            setAttachmentCount(0);
          } else {
            setAttachmentCount(files ? files.length : 0);
          }
        }

        checkAttachments();
      }, [pin])

      useEffect(() => {
        async function fetchProfiles() {
          const result = await getModelInstructions()
          if (result.success && result.data) {
            setProfiles(result.data)
          }
        }
        fetchProfiles()
      }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
      } else if (data) {
        setProfile(data)
      }
    }
    fetchProfile()
  }, [userId])

      const handleSaveNotes = async (newContent: string) => {
        if (!pin) return
        setNotesContent(newContent)
        await updatePinNotes(pin.id, newContent)
      }

      const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!profiles.length) {
          setError("No instruction profiles found. Please create one in your profile settings.")
          return
        }

        const formData = new FormData(e.currentTarget)
        const subject = formData.get('subject') as string
        const profileId = formData.get('profile') as string

        setError(null)
        setIsLoading(true)

        const result = await generateWithGemini(subject, profileId)

        if (result.limitExceeded) {
          setLimitModalOpen(true);
          setIsLoading(false);
          return;
        }

        if (result.error) {
          setError(result.error)
        } else if (result.success && result.data) {
          await handleSaveNotes(result.data)
          setEditorKey(pin!.id + Date.now())
          setIsAIPromptOpen(false)
          // Add a small delay to allow the UI to update before advancing
          setTimeout(() => {
            completeStep(5);
          }, 100);
        }

        setIsLoading(false)
      }

      const handleCreateAttachments = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!pin) return;
        setIsProcessing(true);

        const formData = new FormData(e.currentTarget);
        const prompt = formData.get('prompt') as string;
        const instructionProfileId = formData.get('instructionProfileId') as string;

        if (!prompt || !instructionProfileId) {
          alert('Please provide a prompt and select a profile.');
          setIsProcessing(false);
          return;
        }

        try {
          const result = await generateAttachment(
            prompt,
            instructionProfileId,
            pin.id
          );

          if (result.error) {
            alert(`Attachment generation failed: ${result.error}`);
          } else {
            alert(result.message);
            setisAttachmentModalOpen(false);
            completeStep(7);
          }
        } catch (error) {
          alert(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setIsProcessing(false);
        }
      };

      return (
        <Transition appear show={isOpen} as={Fragment}>
        <LimitReachedModal
          isOpen={isLimitModalOpen}
          onClose={() => setLimitModalOpen(false)}
        />
          <Dialog as="div" className="relative z-[100]" onClose={onClose}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
              leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                >
                  {/* Stop wheel events from propagating to the board underneath. */}
                  <Dialog.Panel onWheel={(e) => e.stopPropagation()} className="w-full max-w-5xl h-[80vh] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all flex flex-col dark:bg-gray-900">
                    <div className="flex justify-between items-center border-b pb-4">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                        Pin Details
                      </Dialog.Title>
                      <div className="flex items-center gap-2">
                        {attachmentCount >= 5 && (
                          <button
                            onClick={handleExportAttachments} disabled={isExporting}
                            className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {isExporting ? 'Exporting...' : 'Export as Pins'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setisAttachmentModalOpen(true);
                            completeStep(6);
                          }}
                          aria-label="Create Attachments"
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                        >
                          Create Attachments
                        </button>
                        <button
                          onClick={() => {
                            setIsAIPromptOpen(true);
                            completeStep(4);
                          }}
                          aria-label="Generate with AI"
                          className="text-sm bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700"
                        >
                          ✨ Generate with AI
                        </button>
                      </div>
                    </div>

                    {isAttachmentModalOpen && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-20">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border dark:border-gray-700 w-full max-w-md">
                          <h4 className="font-bold mb-4">Generate New Attachment from Prompt</h4>

                          {isTutorialActive && currentStep === 7 && !hasStartedTypingAttachment && (
                            <TutorialHighlight
                              step={7}
                              selector="#prompt"
                              text="Enter a subject to generate an image. Make sure you select an image-generating AI profile from the dropdown below."
                              tooltipPosition="bottom"
                            />
                          )}

                          <form onSubmit={handleCreateAttachments} className="space-y-4">
                            <div>
                              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt</label>
                              <textarea
                                id="prompt"
                                name="prompt"
                                rows={4}
                                className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                required
                                value={attachmentPrompt}
                                onChange={(e) => {
                                  setAttachmentPrompt(e.target.value);
                                  if (isTutorialActive && currentStep === 7) {
                                    setHasStartedTypingAttachment(true);
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
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setisAttachmentModalOpen(false)} className="p-2 border rounded">Cancel</button>
                              <button
                                type="submit"
                                className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                                disabled={isProcessing}
                              >
                                {isProcessing ? 'Generating...' : 'Generate and Attach'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {isAIPromptOpen && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center z-20">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border dark:border-gray-700 w-full max-w-md">
                          <h4 className="font-bold mb-4">Generate Notes with AI</h4>
                          {isTutorialActive && currentStep === 5 && !hasStartedTypingSubject && (
                            <TutorialHighlight
                              step={5}
                              selector="#subject"
                              text="Enter a subject for the AI to write about, then press 'Generate'."
                              tooltipPosition="bottom"
                            />
                          )}
                          {isTutorialActive && currentStep === 6 && (
                            <TutorialHighlight
                              step={6}
                              selector="button[type='submit'][disabled=false]"
                              text="Great! Now click 'Generate' to have the AI write your notes."
                              tooltipPosition="bottom"
                            />
                          )}
                          {isLoading && <p className="text-center">Generating...</p>}
                          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                          <form onSubmit={handleGenerate} className="space-y-4">
                            <div>
                              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                              <input
                                type="text"
                                id="subject"
                                name="subject"
                                className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                                required
                                value={subjectValue}
                                onChange={(e) => {
                                  setSubjectValue(e.target.value);
                                  if (isTutorialActive && currentStep === 5) {
                                    setHasStartedTypingSubject(true);
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label htmlFor="profile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instruction Profile</label>
                              <select id="profile" name="profile" defaultValue={profiles[0]?.id} className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required>
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.profile_name}</option>)}
                              </select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setIsAIPromptOpen(false)} className="p-2 border rounded" disabled={isLoading}>Cancel</button>
                              <button type="submit" className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700" disabled={isLoading}>
                                {isLoading ? 'Generating...' : 'Generate'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {pin && (
                      <div className="grid md:grid-cols-2 gap-6 mt-4 flex-1 overflow-y-auto">
                        <div className="md:col-span-1 flex flex-col gap-4">
                          <Image src={pin.image_url} alt="pin content" width={500} height={500} className="w-full h-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsEditImageModalOpen(true)} />
                          <div>
                            <h4 className="font-bold mb-2 dark:text-white">Attachments</h4>
                            <JobList pinId={pin.id} />
                            <FileList pinId={pin.id} userId={userId} profile={profile} />
                            <FileUploader pinId={pin.id} userId={userId} />
                          </div>
                        </div>
                        <div className="md:col-span-1 h-full flex flex-col">
                          <h4 className="font-bold mb-2 dark:text-white">Notes</h4>
                          <div className="flex-1">
                            <NotesEditor key={editorKey} pinId={pin.id} content={notesContent} onSave={handleSaveNotes} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t flex justify-between">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200"
                        onClick={onClose}
                      >
                        Close
                      </button>

                      {pin && (
                        <button
                          type="button" onClick={handleSubBoardAction} disabled={isProcessing}
                          className="inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200 disabled:opacity-50"
                        >
                          {isProcessing ? 'Processing...' :
    // Case 1: We are inside a sub-board (params.id exists) AND the opened pin is the hub for THIS sub-board.
    (params.id && pin.is_sub_board_hub && pin.parent_pin_id === params.id) ? 'Return to Main Board' :
    // Case 2: The pin is a hub for another sub-board (viewed from the main board).
    pin.is_sub_board_hub ? 'Enter Sub-Board' :
    // Case 3: It's a regular pin that can be converted.
    'Convert to Sub-Board'
}
                        </button>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
          {isEditImageModalOpen && (
            <EditPinImageModal
              pin={pin}
              isOpen={isEditImageModalOpen}
              onClose={() => setIsEditImageModalOpen(false)}
            />
          )}
        </Transition>
      )
    }