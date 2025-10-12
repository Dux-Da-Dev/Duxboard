'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

interface LimitReachedModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LimitReachedModal({ isOpen, onClose }: LimitReachedModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg transform rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
              <Dialog.Title as="h3" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                You&apos;ve Reached the Demo Limit!
              </Dialog.Title>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Thanks for trying out Duxboard! To get unlimited access and run your own instance, please visit our GitHub repository.
                </p>
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <h4 className="font-semibold">Get Started with Self-Hosting</h4>
                  <p className="text-sm mt-2">
                    <a href="https://github.com/your-repo/duxboard" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      Fork the repository on GitHub
                    </a> and follow the setup instructions in the README to deploy your own version for free.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <button type="button" className="rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200" onClick={onClose}>
                  I Understand
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
