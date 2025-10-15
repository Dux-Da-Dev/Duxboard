'use client'

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'
import { setTutorialCompleted } from './actions'
import WelcomeModal from './welcome-modal'
import CongratulationsModal from './CongratulationsModal'
import Confetti from './Confetti'
import type { Database } from '@/lib/database.types'

type ProfileType = Database['public']['Tables']['profiles']['Row']

interface TutorialContextType {
  isActive: boolean
  currentStep: number
  startTutorial: () => void
  nextStep: () => void
  endTutorial: (markAsCompleted?: boolean) => void
  restartTutorial: () => void
  completeStep: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)
const TOTAL_STEPS = 10;

export function TutorialProvider({ children, profile }: { children: ReactNode, profile: ProfileType | null }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)

  useEffect(() => {
    // This is the new logic to decide if the welcome modal should show.
    // It only runs when the profile prop changes (e.g., on login).
    if (profile && !profile.has_completed_tutorial) {
      // Use a timeout to ensure the rest of the app has loaded.
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const setStep = (step: number) => {
    localStorage.setItem('tutorialStep', step.toString());
    setCurrentStep(step);
  };

  const endTutorial = useCallback(async (markAsCompleted = true) => {
    setIsActive(false)
    setStep(0)
    setShowWelcome(false)
    localStorage.removeItem('tutorialStep');
    if (markAsCompleted) {
      await setTutorialCompleted()
    }
  }, [])

  const startTutorial = useCallback(() => {
    setShowWelcome(false)
    setIsActive(true)
    setStep(1)
  }, [])

  const restartTutorial = useCallback(() => {
    endTutorial(false) // End without saving completion to DB
    setTimeout(() => setShowWelcome(true), 100) // Show the welcome modal again
  }, [endTutorial])

  const nextStep = useCallback(() => {
    setStep(currentStep + 1);
  }, [currentStep])

  const completeStep = useCallback((step: number) => {
    if (isActive && step === currentStep) {
      if (step === TOTAL_STEPS) {
        endTutorial(true);
        setShowCongrats(true);
      } else {
        nextStep();
      }
    }
  }, [isActive, currentStep, nextStep, endTutorial]);

  return (
    <TutorialContext.Provider value={{ isActive, currentStep, startTutorial, nextStep, endTutorial, restartTutorial, completeStep }}>
      {children}
      {showWelcome && <WelcomeModal />}
      {showCongrats && (
        <>
          <Confetti />
          <CongratulationsModal isOpen={showCongrats} onClose={() => setShowCongrats(false)} />
        </>
      )}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider')
  }
  return context
}
