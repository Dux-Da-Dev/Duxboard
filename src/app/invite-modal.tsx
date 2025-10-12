// src/app/invite-modal.tsx

'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState, useEffect, useRef } from 'react'
import { inviteUserByEmail } from '@/app/actions'
// The Switch component is no longer needed
// import { Switch } from '@headlessui/react'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const emailInputRef = useRef(null)

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setEmail('');
                setMessage(null);
            }, 300); // Delay reset to allow for closing animation
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const result = await inviteUserByEmail(email);
        setIsSubmitting(false);

        if (result.error) {
            setMessage({ type: 'error', text: result.error });
        } else {
            setMessage({ type: 'success', text: result.message || `Successfully sent invitation to ${email}` });
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" initialFocus={emailInputRef} onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel onWheel={(e) => e.stopPropagation()} className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                  Invite New User by Email
                </Dialog.Title>

                <div className="mt-4">
                    <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400" htmlFor="email">Email Address</label>
                        <input ref={emailInputRef} id="email" className="w-full rounded-md px-4 py-2 bg-gray-100 dark:bg-gray-700 border mt-1 dark:border-gray-600 text-gray-900 dark:text-gray-100" type="email" name="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="mt-6 w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400">
                        {isSubmitting ? 'Sending...' : 'Send Invitation'}
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 text-sm p-2 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {message.text}
                    </div>
                )}

                <div className="mt-6">
                  <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600" onClick={onClose}>
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
