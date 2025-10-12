'use client'

import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { createSupabaseBrowserClient as createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import Pin from './pin'
import PinDetailModal from './pin-detail-modal'
import FloatingActionButton from './floating-action-button'
import { createConnection, softDeletePin, updatePinPosition } from './actions'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { useViewManager } from './use-view-manager'
import TutorialHighlight from './tutorial-highlight'
import { useTutorial } from './tutorial-provider'

type PinType = Database['public']['Tables']['pins']['Row'] & { isLoading?: boolean; tempId?: string }
type ProfileType = Database['public']['Tables']['profiles']['Row'] & { has_completed_tutorial?: boolean }
type ConnectionType = Database['public']['Tables']['connections']['Row']

interface BoardProps {
  serverPins: PinType[]
  serverConnections: ConnectionType[]
  user: User
  profile: ProfileType | null
}

const BOARD_WIDTH = 8000
const BOARD_HEIGHT = 6000

const ConnectionsLayer = memo(function ConnectionsLayer({ connections, pinsMap }: { connections: ConnectionType[], pinsMap: Map<string, PinType> }) {
    const PIN_WIDTH = 192;
    const PIN_HEIGHT_APPROX = 150;
    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        {connections.map(conn => {
            const start = pinsMap.get(conn.start_pin_id)
            const end = pinsMap.get(conn.end_pin_id)
            if (!start || !end) return null
            const startPos = start.position as { x: number, y: number }
            const endPos = end.position as { x: number, y: number }
            const x1 = startPos.x + PIN_WIDTH / 2
            const y1 = startPos.y + PIN_HEIGHT_APPROX / 2
            const x2 = endPos.x + PIN_WIDTH / 2
            const y2 = endPos.y + PIN_HEIGHT_APPROX / 2
            return <line key={conn.id} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-black/30 dark:stroke-white/30" strokeWidth="2" />
        })}
        </svg>
    )
});
ConnectionsLayer.displayName = 'ConnectionsLayer'

export default function Board({ serverPins, serverConnections, user, profile }: BoardProps) {
  // --- MODIFICATION: Store the initial serverPins in state ---
  // This ensures that the array passed to useViewManager is stable across re-renders,
  // preventing the view from resetting.
  const [initialPins] = useState(serverPins);
  const [pins, setPins] = useState<PinType[]>(serverPins)
  const [connections, setConnections] = useState(serverConnections)
  const [selectedPin, setSelectedPin] = useState<PinType | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [startPin, setStartPin] = useState<PinType | null>(null)
  const [showZoomControls, setShowZoomControls] = useState(false)
  const supabase = createClient()
  const boardRef = useRef<HTMLDivElement>(null)
  const { isActive: isTutorialActive, currentStep, completeStep, triggerWelcomeModal } = useTutorial()

  useEffect(() => {
    if (profile && !profile.has_completed_tutorial && !isTutorialActive && currentStep === 0) {
      setTimeout(() => {
        triggerWelcomeModal()
      }, 500)
    }
  }, [profile, isTutorialActive, triggerWelcomeModal, currentStep])

  const { view, onMouseDown, onMouseUp, onMouseMove, onHomeButton } = useViewManager(boardRef, initialPins);

  const pinsMap = useMemo(() => new Map(pins.map(pin => [pin.id, pin])), [pins]);

  useEffect(() => { setPins(serverPins) }, [serverPins])
  useEffect(() => { setConnections(serverConnections) }, [serverConnections])

  const addTemporaryPin = (pin: PinType) => {
    setPins(currentPins => [...currentPins, pin]);
  };

  const updatePinFromTemporary = (confirmedPin: PinType) => {
    setPins(currentPins => {
      const finalId = confirmedPin.id;
      // First, remove any pin that might have been added by the real-time subscription.
      const filteredPins = currentPins.filter(p => p.id !== finalId);

      // Then, map over the remaining pins to replace the temporary one.
      return filteredPins.map(p => {
        if (p.id === confirmedPin.tempId) {
          // Destructure to remove tempId before setting the state
          const { tempId, ...rest } = confirmedPin;
          return rest;
        }
        return p;
      });
    });
  };

  const removeTemporaryPin = (tempId: string) => {
    setPins(currentPins => currentPins.filter(p => p.id !== tempId));
  };

  const handleUploadStart = (tempId: string, file: File) => {
    const newPlaceholderPin: PinType = {
      id: tempId,
      tempId: tempId,
      created_at: new Date().toISOString(),
      user_id: user.id,
      image_url: URL.createObjectURL(file), // Use a local URL for the placeholder
      position: { x: 4000, y: 3000 },
      notes: '',
      is_deleted: false,
      isLoading: true, // Add a loading flag
      board_id: pins[0]?.board_id || '',
      scale: 1,
      is_sub_board_hub: false,
      parent_pin_id: null,
    };
    setPins(currentPins => [...currentPins, newPlaceholderPin]);
  };

  const handleUploadComplete = (tempId: string, finalPin: PinType) => {
    setPins(currentPins =>
      currentPins.map(p => (p.id === tempId ? { ...finalPin, isLoading: false } : p))
    );
  };

  useEffect(() => {
    const pinChannel = supabase.channel('realtime pins').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, payload => {
        const newPin = payload.new as PinType & { tempId?: string };
        setPins(currentPins =>
            currentPins.map(p => (p.id === newPin.tempId ? { ...newPin, isLoading: false } : p))
        );
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pins' }, payload => {
        const updatedPin = payload.new as PinType;
        setPins(currentPins => currentPins.map(p => p.id === updatedPin.id ? updatedPin : p));
        if (selectedPin?.id === updatedPin.id) {
            setSelectedPin(updatedPin);
        }
    }).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pins' }, payload => {
        setPins(currentPins => currentPins.filter(p => p.id !== (payload.old as { id: string }).id));
        if (selectedPin?.id === (payload.old as { id: string }).id) {
            setSelectedPin(null);
        }
    }).subscribe()

    const connectionChannel = supabase.channel('realtime connections').on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, payload => {
        if (payload.eventType === 'INSERT') {
            const newConnection = payload.new as ConnectionType;
            setConnections(current => {
                // Prevent duplicates from race conditions
                if (current.some(c => c.id === newConnection.id)) {
                    return current;
                }
                return [...current, newConnection];
            });
        }
        if (payload.eventType === 'DELETE') {
            setConnections(c => c.filter(conn => conn.id !== (payload.old as { id: string }).id))
        }
    }).subscribe()

    return () => {
      supabase.removeChannel(pinChannel)
      supabase.removeChannel(connectionChannel)
    }
  }, [supabase])


const handlePinClick = async (pin: PinType) => {
    if (isConnecting) {
        if (!startPin) {
            setStartPin(pin);
        } else {
            if (startPin.id !== pin.id) {
                // Create a temporary ID for the optimistic update
                const tempId = `temp-conn-${Date.now()}`;
                const newConnection: ConnectionType = {
                    id: tempId,
                    created_at: new Date().toISOString(),
                    user_id: user.id,
                    start_pin_id: startPin.id,
                    end_pin_id: pin.id,
                };

                // Optimistically add the new connection to the state for an instant UI update
                setConnections(currentConnections => [...currentConnections, newConnection]);

                // Call the server action
                const result = await createConnection(startPin.id, pin.id);

                if (result.error) {
                    // If the server call fails, remove the temporary connection to revert the UI
                    setConnections(currentConnections => currentConnections.filter(c => c.id !== tempId));
                    alert(`Error creating connection: ${result.error}`);
                } else if (result.success && result.data) {
                    // If successful, replace the temporary connection with the real one from the server
                    setConnections(currentConnections =>
                        currentConnections.map(c => c.id === tempId ? result.data! : c)
                    );
                }
            }
            // Reset the connection flow
            setStartPin(null);
            setIsConnecting(false);
        }
    } else {
        // Default behavior: open the pin detail modal
        setSelectedPin(pin);
    }
};

  const handleCloseModal = () => setSelectedPin(null)
  const toggleConnectionMode = () => {
    setIsConnecting(prev => !prev)
    setStartPin(null)
  }

  const handleDeletePin = async (pinId: string) => {
    // --- OPTIMISTIC DELETION ---
    // 1. Keep a copy of the current pins in case we need to revert
    const originalPins = [...pins];

    // 2. Optimistically remove the pin from the local state
    setPins(currentPins => currentPins.filter(p => p.id !== pinId));
    if (selectedPin?.id === pinId) {
      setSelectedPin(null);
    }

    // 3. Call the server action
    const result = await softDeletePin(pinId);

    // 4. If the server action fails, revert the optimistic update
    if (result?.error) {
      alert(`Error deleting pin: ${result.error}`);
      setPins(originalPins); // Restore the pins
    }
    // --- END OPTIMISTIC DELETION ---
  }

const handleConversionSuccess = (pinId: string) => {
    // Optimistically update the specific pin in the local state
    setPins(currentPins =>
      currentPins.map(p =>
        p.id === pinId ? { ...p, is_sub_board_hub: true } : p
      )
    );
    // If the currently selected pin is the one that was converted, update it as well
    if (selectedPin?.id === pinId) {
      setSelectedPin(prev => (prev ? { ...prev, is_sub_board_hub: true } : null));
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event
    const pinId = active.id as string

    // --- CORRECTION: Apply zoom factor to the delta for accurate dragging ---
    const correctedDelta = {
        x: delta.x / view.zoom,
        y: delta.y / view.zoom,
    };

    // Optimistic update
    setPins(currentPins =>
      currentPins.map(p => {
        if (p.id === pinId) {
          const currentPosition = p.position as { x: number; y: number }
          return { ...p, position: { x: currentPosition.x + correctedDelta.x, y: currentPosition.y + correctedDelta.y } }
        }
        return p
      })
    )

    // Server update
    const pinToUpdate = pins.find(p => p.id === pinId)
    if (pinToUpdate) {
        const currentPosition = pinToUpdate.position as { x: number; y: number }
        const newPosition = { x: currentPosition.x + correctedDelta.x, y: currentPosition.y + correctedDelta.y }
        updatePinPosition(pinId, newPosition)
    }
  }

  useEffect(() => {
    const tempPin = pins.find(p => p.id.startsWith('temp-'));
    if (isTutorialActive && currentStep === 2 && tempPin) {
      completeStep(2);
    }
  }, [pins, isTutorialActive, currentStep, completeStep]);

  useEffect(() => {
    // Automatically advance from step 3 to 4 when the pin modal is opened.
    if (isTutorialActive && currentStep === 3 && selectedPin) {
      completeStep(3);
    }
  }, [selectedPin, isTutorialActive, currentStep, completeStep]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseUp}
    >
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div
          ref={boardRef}
          className={`relative bg-gray-100 dark:bg-gray-800 ${isConnecting ? 'cursor-crosshair' : ''} ${view.isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            // FINAL CORRECTED TRANSFORM
            transform: `translate(${-view.x * view.zoom}px, ${-view.y * view.zoom}px) scale(${view.zoom})`,
            transformOrigin: 'top left'
          }}
        >
          <ConnectionsLayer connections={connections} pinsMap={pinsMap} />
          {pins.map(pin => (
            <Pin key={pin.id} pin={pin} onSelectPin={handlePinClick} isSelectedAsStart={startPin?.id === pin.id} onDelete={handleDeletePin} />
          ))}
        </div>
      </DndContext>
      <FloatingActionButton
        userId={user.id}
        onToggleConnectionMode={toggleConnectionMode}
        onUploadStart={handleUploadStart}
        addTemporaryPin={addTemporaryPin}
        updatePinFromTemporary={updatePinFromTemporary}
        removeTemporaryPin={removeTemporaryPin}
        onUploadComplete={handleUploadComplete}
      />
      <PinDetailModal pin={selectedPin} userId={user.id} onClose={handleCloseModal} onConversionSuccess={handleConversionSuccess} />

        {isTutorialActive && (
          <>
            <TutorialHighlight
              step={1}
              selector="[aria-label='Toggle Add Menu']"
              text="To get started, press the '+' button to open the actions menu."
            />
            <TutorialHighlight
              step={2}
              selector="[title='Add Pin']"
              text="Great! Now click here to upload an image and create your first pin."
            />
            {isTutorialActive && currentStep === 3 && (() => {
                // Find the newest pin added to the board since it was loaded
                const newPins = pins.filter(p => !initialPins.some(ip => ip.id === p.id));
                const latestPin = newPins.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                if (!latestPin) return null;

                return (
                  <TutorialHighlight
                    step={3}
                    selector={`[data-pin-id='${latestPin.id}']`}
                    text="Awesome! Your new pin has been added. Click on it to see the details."
                    tooltipPosition="bottom"
                  />
                );
            })()}
            {isTutorialActive && currentStep === 4 && (
              <TutorialHighlight
                step={4}
                selector="button[aria-label='Generate with AI']"
                text="You can use AI to write notes for you. Click here to open the AI prompt."
                tooltipPosition="left"
              />
            )}
            {isTutorialActive && currentStep === 6 && (
              <TutorialHighlight
                step={6}
                selector="button[aria-label='Create Attachments']"
                text="Perfect! Now let's generate an image and attach it to this pin. Click here."
                tooltipPosition="left"
              />
            )}
            {isTutorialActive && currentStep === 8 && (
              <TutorialHighlight
                step={8}
                selector="button[aria-label='Toggle Add Menu']"
                text="Want to generate a pin instead of uploading one? Click the plus to open the menu."
                tooltipPosition="left"
                isCircle={true}
              />
            )}
          </>
        )}

      <div
        className="absolute top-4 right-20 flex flex-col items-center"
        onMouseEnter={() => setShowZoomControls(true)}
        onMouseLeave={() => setShowZoomControls(false)}
      >
        <button
          onClick={onHomeButton}
          className="bg-white dark:bg-gray-700 dark:text-gray-100 rounded-full p-2 shadow-md"
          aria-label="Go to home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        {showZoomControls && (
          <div className="mt-2 flex flex-col items-center space-y-2 bg-white dark:bg-gray-700 rounded-xl p-2 shadow-md">
            <Link href="/storylines" passHref legacyBehavior>
              <a className="text-gray-600 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full p-2" aria-label="Go to storylines">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </a>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
