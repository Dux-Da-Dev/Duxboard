'use client'

import { Menu, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { useTheme } from './theme-provider'
import { useTutorial } from './tutorial-provider'
import { logout } from './actions'
import ProfileModal from './profile-modal'
import { ModelInstructionsModal } from './model-instructions-modal'
import InviteModal from './invite-modal'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type ProfileType = Database['public']['Tables']['profiles']['Row']

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
)

interface UserMenuProps {
    user: User;
    profile: ProfileType | null;
}

export default function UserMenu({ user, profile }: UserMenuProps) {
  const { theme, toggleTheme } = useTheme()
  const { restartTutorial } = useTutorial()
  const [isProfileModalOpen, setProfileModalOpen] = useState(false)
  const [isInviteModalOpen, setInviteModalOpen] = useState(false)
  const [isInstructionsModalOpen, setInstructionsModalOpen] = useState(false)

  const openProfileModal = () => setProfileModalOpen(true)
  const closeProfileModal = () => setProfileModalOpen(false)

  const openInviteModal = () => setInviteModalOpen(true)
  const closeInviteModal = () => setInviteModalOpen(false)

  return (
    <>
      <div className="absolute top-4 right-4 text-right z-20">
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button aria-label="User menu" className="inline-flex w-full justify-center rounded-full bg-black bg-opacity-20 p-2 text-sm font-medium text-white hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
              <UserIcon />
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="px-1 py-1 ">
                  <div className="px-2 py-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile?.role || 'User'}</p>
                  </div>
              </div>
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={openProfileModal}
                      className={`${
                        active ? 'bg-violet-500 text-white' : 'text-gray-900 dark:text-gray-100'
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    >
                      Profile
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => setInstructionsModalOpen(true)}
                      className={`${
                        active ? 'bg-violet-500 text-white' : 'text-gray-900 dark:text-gray-100'
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    >
                      Model Instructions
                    </button>
                  )}
                </Menu.Item>
                {profile?.role === 'admin' && (
                  <Menu.Item>
                      {({ active }) => (
                      <button
                          onClick={openInviteModal}
                          className={`${
                          active ? 'bg-violet-500 text-white' : 'text-gray-900 dark:text-gray-100'
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                          Invite User
                      </button>
                      )}
                  </Menu.Item>
                )}
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={restartTutorial}
                      className={`${
                        active ? 'bg-violet-500 text-white' : 'text-gray-900 dark:text-gray-100'
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    >
                      Restart Tutorial
                    </button>
                  )}
                </Menu.Item>
              </div>
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={toggleTheme}
                      className={`${
                        active ? 'bg-violet-500 text-white' : 'text-gray-900 dark:text-gray-100'
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                    >
                      {theme === 'light' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                      Toggle Theme
                    </button>
                  )}
                </Menu.Item>
              </div>
              <div className="px-1 py-1">
                  <form action={logout}>
                      <Menu.Item>
                          {({ active }) => (
                          <button
                              type="submit"
                              className={`${
                              active ? 'bg-violet-500 text-white' : 'text-gray-900 dark:text-gray-100'
                              } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                              Logout
                          </button>
                          )}
                      </Menu.Item>
                  </form>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
        userEmail={user.email || ''}
        userRole={profile?.role || 'user'}
      />
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
      />
      <ModelInstructionsModal
        isOpen={isInstructionsModalOpen}
        onClose={() => setInstructionsModalOpen(false)}
      />
    </>
  )
}
