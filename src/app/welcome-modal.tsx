'use client'

import { useTutorial } from './tutorial-provider'

export default function WelcomeModal() {
  const { startTutorial, endTutorial } = useTutorial()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Tutorial!</h2>
        <p className="mb-6">This will guide you through the main features.</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => endTutorial(false)}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800"
          >
            Skip
          </button>
          <button
            onClick={startTutorial}
            className="px-4 py-2 rounded bg-blue-600 text-white"
            aria-label="Start Tutorial"
          >
            Start Tutorial
          </button>
        </div>
      </div>
    </div>
  )
}