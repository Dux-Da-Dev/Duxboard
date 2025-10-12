'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import Image from 'next/image'
import congratsDux from '../../public/congratzdux.png'
import { setTutorialCompleted } from './actions'

interface CongratulationsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CongratulationsModal({ isOpen, onClose }: CongratulationsModalProps) {
  const handleClose = () => {
    setTutorialCompleted();
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[150]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 text-center"
                >
                  Congratulations!
                </Dialog.Title>
                <div className="mt-4 flex flex-col items-center">
                    <Image src={congratsDux} alt="Congratulations Dux" width={150} height={150} />
                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        You have completed the basic tutorial, you can drag your pins around the board and connect them with lines using the add line icon in the speed dial menu. You can also explore the storyline feature under the home icon in the top right hand corner. Have a quackin&apos; time!
                    </p>
                </div>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={handleClose}
                  >
                    Let&apos;s Go!
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