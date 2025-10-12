'use client'

import { useState, useMemo, useRef, createRef, useEffect } from 'react'
import Image from 'next/image';
import { addPinToStoryline, updateStorylinePinPosition, toggleStorylinePinStatus, deletePinFromStoryline, updateStorylineVisibility, exportStorylineAsMarkdown } from '../../actions'
import AddPinModal from './add-pin-modal'
import PinDetailModal from '../../pin-detail-modal'
import UserMenu from '../../user-menu'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, DragEndEvent } from '@dnd-kit/core'
import { createSnapModifier } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { Switch } from '@headlessui/react'

type ProfileType = Database['public']['Tables']['profiles']['Row']
type BasePin = Database['public']['Tables']['pins']['Row']

type PinType = BasePin & {
    storyline_pin_id: number;
    is_completed: boolean;
    position: { x: number; y: number };
}

interface StorylineEditorProps {
  storylineId: string;
  initialPins: PinType[];
  allUserPins: BasePin[];
  user: User;
  profile: ProfileType | null;
  isPublic: boolean;
}

const GRID_SIZE = 20;
const PIN_CARD_WIDTH = 288;

const ArrowConnections = ({ pins, pinRefs, view }: { pins: PinType[], pinRefs: React.RefObject<HTMLDivElement>[], view: { x: number, y: number, zoom: number } }) => {
  const [lines, setLines] = useState<{key: string, x1: number, y1: number, x2: number, y2: number}[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newLines = [];
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i];
      let nearestLeftPin = null;
      let minDistance = Infinity;
      let nearestLeftPinIndex = -1;

      for (let j = 0; j < pins.length; j++) {
        if (i === j) continue;
        const otherPin = pins[j];

        if (otherPin.position.x < pin.position.x) {
          const dx = pin.position.x - otherPin.position.x;
          const dy = pin.position.y - otherPin.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            nearestLeftPin = otherPin;
            nearestLeftPinIndex = j;
          }
        }
      }

      if (nearestLeftPin && nearestLeftPinIndex !== -1) {
        const startNode = pinRefs[nearestLeftPinIndex]?.current;
        const endNode = pinRefs[i]?.current;

        if (startNode && endNode) {
            const startRect = startNode.getBoundingClientRect();
            const endRect = endNode.getBoundingClientRect();

            const x1 = (startRect.right - containerRect.left) / view.zoom;
            const y1 = (startRect.top + startRect.height / 2 - containerRect.top) / view.zoom;
            const x2 = (endRect.left - containerRect.left) / view.zoom;
            const y2 = (endRect.top + endRect.height / 2 - containerRect.top) / view.zoom;

            newLines.push({ key: `${nearestLeftPin.storyline_pin_id}-${pin.storyline_pin_id}`, x1, y1, x2, y2 });
        }
      }
    }
    setLines(newLines);
  }, [pins, pinRefs, view]);

  return (
    <div ref={containerRef} className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <svg className="w-full h-full">
        {lines.map(line => (
            <line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="stroke-gray-400 dark:stroke-gray-500" strokeWidth="2" />
        ))}
        </svg>
    </div>
  );
};


interface DraggablePinProps {
    pin: PinType;
    pinRef: React.RefObject<HTMLDivElement>;
    onDelete: (storylinePinId: number) => void;
    onToggleStatus: (storylinePinId: number, currentStatus: boolean) => void;
    onClick: (pin: PinType) => void;
}

function DraggablePin({ pin, pinRef, onDelete, onToggleStatus, onClick }: DraggablePinProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: pin.storyline_pin_id.toString(),
    });

    const style = {
        position: 'absolute' as const,
        left: pin.position.x,
        top: pin.position.y,
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 100 : 1,
    };

    // We stop propagation on buttons to prevent the main click handler from firing
    const handleButtonAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} onClick={() => onClick(pin)}>
            <div ref={pinRef} className="w-auto">
                 <div
                    {...listeners} // The drag handle is on the main body of the card now
                    className={`relative p-2 border rounded-lg flex items-center space-x-2 h-28 cursor-move ${pin.is_completed ? 'bg-green-100 dark:bg-green-800' : 'bg-white dark:bg-gray-800'}`}
                    >
                    <button
                        onClick={(e) => handleButtonAction(e, () => onDelete(pin.storyline_pin_id))}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs z-10"
                        aria-label="Delete pin from storyline"
                    >
                        X
                    </button>
                    <input
                        type="checkbox"
                        checked={pin.is_completed}
                        onChange={(e) => { e.stopPropagation(); onToggleStatus(pin.storyline_pin_id, pin.is_completed)}}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 self-start"
                    />
                    <div className="relative w-24 h-24">
                        <Image src={pin.image_url} alt={pin.notes || ''} fill sizes="100vw" className="object-cover rounded pointer-events-none" />
                    </div>
                 </div>
            </div>
        </div>
    );
}


export default function StorylineEditor({ storylineId, initialPins, allUserPins, user, profile, isPublic: initialIsPublic }: StorylineEditorProps) {
  const [pins, setPins] = useState(initialPins)
  const [isModalOpen, setModalOpen] = useState(false)
  const [selectedPinForModal, setSelectedPinForModal] = useState<PinType | null>(null)
  const [saveStatus, setSaveStatus] = useState('Saved')
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [isExporting, setIsExporting] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const handleExport = async () => {
    setIsExporting(true);
    const result = await exportStorylineAsMarkdown(storylineId);
    setIsExporting(false);

    if (result.error) {
      alert(`Export failed: ${result.error}`);
      return;
    }

    if (result.success && result.data) {
      // Create a blob from the markdown string
      const blob = new Blob([result.data], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);

      // Create a temporary link to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${storylineId}.md`; // Or use a fetched storyline title
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const pinRefs = useMemo(() => Array(pins.length).fill(0).map(() => createRef<HTMLDivElement>()), [pins.length]);

  const existingPinIds = useMemo(() => new Set(pins.map(p => p.id)), [pins]);
  const availablePins = allUserPins.filter(p => !existingPinIds.has(p.id));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Only start dragging after 5px move
      },
    })
  );

  const snapToGridModifier = createSnapModifier(GRID_SIZE);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    const storylinePinId = Number(active.id);

    const pinToUpdate = pins.find(p => p.storyline_pin_id === storylinePinId);
    if (!pinToUpdate) return;

    const newPosition = {
      x: pinToUpdate.position.x + delta.x / view.zoom,
      y: pinToUpdate.position.y + delta.y / view.zoom,
    };

    // Optimistic update
    setPins(currentPins =>
      currentPins.map(p =>
        p.storyline_pin_id === storylinePinId ? { ...p, position: newPosition } : p
      )
    );

    setSaveStatus('Saving...');
    await updateStorylinePinPosition(storylinePinId, newPosition);
    setSaveStatus('Saved');
  };

  const handleConversionSuccess = (pinId: string) => {
    // This function might need to update the local state of the pin in this component
    // if it's being displayed here. For now, we'll just log it.
    console.log(`Pin ${pinId} converted to sub-board.`);
  };

  const handlePinClick = (pin: PinType) => {
      setSelectedPinForModal(pin);
  }

  const handleAddPin = async (pinId: string) => {
    const pinToAdd = availablePins.find(p => p.id === pinId);
    if (!pinToAdd) return;
    setModalOpen(false);

    const rightmostPin = pins.reduce((max, p) => (p.position.x > max.position.x ? p : max), { position: { x: -Infinity, y: 50 } });
    const newPosition = {
        x: rightmostPin.position.x > -Infinity ? rightmostPin.position.x + PIN_CARD_WIDTH + GRID_SIZE * 4 : 50,
        y: rightmostPin.position.y,
    };

    const tempId = Date.now();
    const newOptimisticPin: PinType = {
      ...pinToAdd,
      position: newPosition,
      storyline_pin_id: tempId,
      is_completed: false,
    };
    setPins(currentPins => [...currentPins, newOptimisticPin]);

    await addPinToStoryline(storylineId, pinId);
  }

  const handleToggleStatus = async (storylinePinId: number, currentStatus: boolean) => {
    setPins(currentPins =>
      currentPins.map(p =>
        p.storyline_pin_id === storylinePinId ? { ...p, is_completed: !currentStatus } : p
      )
    );
    await toggleStorylinePinStatus(storylinePinId, !currentStatus);
  }

  const handleDeletePin = async (storylinePinId: number) => {
    setPins(currentPins => currentPins.filter(p => p.storyline_pin_id !== storylinePinId));
    await deletePinFromStoryline(storylinePinId);
  }

  const handleVisibilityChange = async (newVisibility: boolean) => {
    setIsPublic(newVisibility);
    setSaveStatus('Saving...');
    await updateStorylineVisibility(storylineId, newVisibility);
    setSaveStatus('Saved');
  }

  const handleZoom = (direction: 'in' | 'out') => {
    setView(currentView => {
      const zoom = direction === 'in' ? currentView.zoom * 1.2 : currentView.zoom / 1.2;
      return { ...currentView, zoom };
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan when clicking on the background
    if ((e.target as HTMLElement).closest('.cursor-move')) {
      return;
    }
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - view.x, y: e.clientY - view.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    e.preventDefault();
    const x = e.clientX - panStartRef.current.x;
    const y = e.clientY - panStartRef.current.y;
    setView(currentView => ({ ...currentView, x, y }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <div
      className="relative w-full h-[80vh] border dark:border-gray-700 rounded-lg overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} // Stop panning if mouse leaves
    >
        <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
            <button onClick={() => handleZoom('out')} className="p-2 bg-gray-500 text-white rounded">-</button>
            <button onClick={() => handleZoom('in')} className="p-2 bg-gray-500 text-white rounded">+</button>
        </div>
        <div className="absolute top-2 left-2 z-10 flex items-center space-x-4">
            <button onClick={() => setModalOpen(true)} className="p-2 bg-green-500 text-white rounded">
                Add Pin to Storyline
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="p-2 bg-gray-500 text-white rounded disabled:bg-gray-400"
              >
                {isExporting ? 'Exporting...' : 'Export as MD'}
              </button>
                <Switch
                    checked={isPublic}
                    onChange={handleVisibilityChange}
                    className={`${
                    isPublic ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                    <span
                    className={`${
                        isPublic ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                </Switch>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{isPublic ? 'Public' : 'Private'}</span>
            </div>
            <div className="text-sm text-gray-500">{saveStatus}</div>
        </div>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[snapToGridModifier]}>
            <div
                className="relative w-full h-full"
                style={{
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                    transformOrigin: 'top left',
                }}
            >
                <ArrowConnections pins={pins} pinRefs={pinRefs} view={view} />
                {pins.map((pin, index) => (
                    <DraggablePin
                        key={pin.storyline_pin_id}
                        pin={pin}
                        pinRef={pinRefs[index]}
                        onDelete={handleDeletePin}
                        onToggleStatus={handleToggleStatus}
                        onClick={handlePinClick}
                    />
                ))}
            </div>
        </DndContext>
        <AddPinModal
            isOpen={isModalOpen}
            onClose={() => setModalOpen(false)}
            pins={availablePins}
            onAddPin={handleAddPin}
        />
        <PinDetailModal
            pin={selectedPinForModal}
            userId={user.id}
            onClose={() => setSelectedPinForModal(null)}
            onConversionSuccess={handleConversionSuccess}
        />
    </div>
  )
}
