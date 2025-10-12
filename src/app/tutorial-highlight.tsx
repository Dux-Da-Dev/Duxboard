'use client'

import { useEffect, useState, useRef } from 'react'
import { useTutorial } from './tutorial-provider'
import Portal from './portal'

interface TutorialHighlightProps {
  step: number
  selector: string
  text: string
  tooltipPosition?: 'left' | 'right' | 'top' | 'bottom'
  isCircle?: boolean // New prop for circular highlights
}

export default function TutorialHighlight({ step, selector, text, tooltipPosition = 'left', isCircle = false }: TutorialHighlightProps) {
  const { currentStep, nextStep, endTutorial } = useTutorial()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })

useEffect(() => {
  if (currentStep !== step) {
    setRect(null); // Clear the rect if this is not the active step
    return;
  }

  const findAndSetElement = () => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      setRect(element.getBoundingClientRect());
    }
  };

  const interval = setInterval(findAndSetElement, 50);

  return () => clearInterval(interval);
}, [currentStep, step, selector]);

  useEffect(() => {
    if (rect && tooltipRef.current) {
      const { offsetWidth: tooltipWidth, offsetHeight: tooltipHeight } = tooltipRef.current
      let newLeft = 0, newTop = 0

      switch (tooltipPosition) {
        case 'left':
          newLeft = rect.left - tooltipWidth - 20
          newTop = rect.top + (rect.height / 2) - (tooltipHeight / 2)
          break;
        case 'right':
          newLeft = rect.right + 20
          newTop = rect.top + (rect.height / 2) - (tooltipHeight / 2)
          break;
        case 'bottom':
          newLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2)
          newTop = rect.bottom + 20
          break;
        default:
          newLeft = rect.left - tooltipWidth - 20
          newTop = rect.top + (rect.height / 2) - (tooltipHeight / 2)
      }

      // Boundary checks
      if (newLeft < 10) newLeft = 10;
      if (newTop < 10) newTop = 10;
      if (newLeft + tooltipWidth > window.innerWidth - 10) newLeft = window.innerWidth - tooltipWidth - 10;
      if (newTop + tooltipHeight > window.innerHeight - 10) newTop = window.innerHeight - tooltipHeight - 10;

      setPosition({ top: newTop, left: newLeft })
    }
  }, [rect, tooltipPosition])

  if (currentStep !== step || !rect) return null

  return (
    <Portal>
      <>
        {/* Simplified Overlay & Highlight */}
        <div
          className="fixed z-[101] border-2 border-blue-400 shadow-[0_0_15px_5px_rgba(59,130,246,0.7)] animate-pulse pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6)`,
            borderRadius: isCircle ? '9999px' : '0.5rem', // Apply border-radius conditionally
          }}
        />

        <div
          ref={tooltipRef}
          className="fixed z-[102] p-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: '300px',
            opacity: position.top > -9999 ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          <p className="text-sm">{text}</p>
          <div className="flex justify-between items-center mt-4">
            <span className="text-xs text-gray-500">Step {step} of 10</span>
            <div>
              <button onClick={() => endTutorial()} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mr-4">Skip</button>
              <button onClick={nextStep} className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700">Next</button>
            </div>
          </div>
        </div>
      </>
    </Portal>
  )
}