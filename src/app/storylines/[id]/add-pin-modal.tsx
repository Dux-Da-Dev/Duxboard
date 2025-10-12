'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import Image from 'next/image';

type Pin = {
  id: string
  image_url: string
  notes: string | null
}

interface AddPinModalProps {
  isOpen: boolean
  onClose: () => void
  pins: Pin[]
  onAddPin: (pinId: string) => void
}

export default function AddPinModal({ isOpen, onClose, pins, onAddPin }: AddPinModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel onWheel={(e) => e.stopPropagation()} className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
                >
                  Add a Pin to your Storyline
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select one of your existing pins to add to this storyline.
                  </p>
                </div>

                <div className="mt-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-4">
                    {pins.map((pin) => (
                      <div key={pin.id} className="relative h-24">
                        <Image src={pin.image_url} alt={pin.notes || ''} fill sizes="100vw" className="object-cover rounded" />
                        <button
                          onClick={() => onAddPin(pin.id)}
                          className="absolute bottom-1 right-1 p-1 bg-blue-500 text-white rounded-full text-xs"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Done
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
