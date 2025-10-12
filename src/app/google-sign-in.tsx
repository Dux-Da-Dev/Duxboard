'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Image from 'next/image'
// --- THIS IS THE FIX: Import the image directly ---
import welcomeDuxImage from '../../public/welcomeduxfinal.png'

export default function GoogleSignIn() {
  const supabase = createSupabaseBrowserClient()

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center w-full max-w-md">

        {/* --- USE THE IMPORTED IMAGE VARIABLE --- */}
        <Image src={welcomeDuxImage} alt="Welcome Dux" width={120} height={120} className="mx-auto mb-6" />

        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Welcome to Duxboard
        </h1>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="w-5 h-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
          >
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.534-11.082-8.464l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C39.99,35.938,44,30.608,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  )
}
