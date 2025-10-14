'use client'

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setTutorialCompleted } from './actions'
import WelcomeModal from './welcome-modal'
import CongratulationsModal from './CongratulationsModal'
import Confetti from './Confetti'

interface TutorialContextType {
  isActive: boolean
  currentStep: number
  startTutorial: () => void
  nextStep: () => void
  endTutorial: (markAsCompleted?: boolean) => void
  restartTutorial: () => void
  showWelcome: boolean
  triggerWelcomeModal: () => void
  completeStep: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

const TOTAL_STEPS = 10;

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showCongrats, setShowCongrats] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const savedStep = localStorage.getItem('tutorialStep');
    if (savedStep) {
      const step = parseInt(savedStep, 10);
      if (step > 0) {
        setIsActive(true);
        setCurrentStep(step);
      }
    }
  }, []);

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
      router.refresh()
    }
  }, [router])

  const startTutorial = useCallback(() => {
    setShowWelcome(false)
    setIsActive(true)
    setStep(1)
  }, [])

  const restartTutorial = useCallback(() => {
    endTutorial(false)
    setTimeout(() => setShowWelcome(true), 100)
  }, [endTutorial])

  const nextStep = useCallback(() => {
    setStep(currentStep + 1);
  }, [currentStep])

  const triggerWelcomeModal = useCallback(() => {
    setShowWelcome(true)
  }, [])

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
    <TutorialContext.Provider value={{ isActive, currentStep, startTutorial, nextStep, endTutorial, restartTutorial, showWelcome, triggerWelcomeModal, completeStep }}>
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