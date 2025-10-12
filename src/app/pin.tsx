'use client'

import { memo, useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image';
import type { Database } from '@/lib/database.types'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ResizableBox, type ResizableBoxProps } from 'react-resizable'
import { updatePinScale } from './actions'

type PinType = Database['public']['Tables']['pins']['Row'] & { isLoading?: boolean }

interface PinProps {
  pin: PinType
  onSelectPin: (pin: PinType) => void
  isSelectedAsStart: boolean
  onDelete: (pinId: string) => void
}

const DEFAULT_WIDTH = 192; // Corresponds to w-48

function Pin({ pin, onSelectPin, isSelectedAsStart, onDelete }: PinProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pin.id,
  })

  const position = pin.position as { x: number; y: number }
  const scale = typeof pin.scale === 'number' ? pin.scale : 1;

  const [width, setWidth] = useState(DEFAULT_WIDTH * scale);
  // Default to a 4:3 aspect ratio until the image loads
  const [aspectRatio, setAspectRatio] = useState(4 / 3);
  const height = width / aspectRatio;

  const style = {
    transform: CSS.Translate.toString(transform),
    left: position.x,
    top: position.y,
    zIndex: isDragging ? 100 : 'auto',
    width: `${width}px`,
    height: `${height}px`,
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this pin?')) {
      onDelete(pin.id)
    }
  }

  const handleClick = () => {
    if (pin.isLoading) return;
    onSelectPin(pin)
  }

  const onResizeStop: ResizableBoxProps['onResizeStop'] = useCallback(async (_e: React.SyntheticEvent, data: { size: { width: number, height: number }}) => {
    const newWidth = data.size.width;
    setWidth(newWidth);
    const newScale = newWidth / DEFAULT_WIDTH;
    await updatePinScale(pin.id, newScale);
  }, [pin.id]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
  }

  const selectionClass = isSelectedAsStart ? 'ring-4 ring-blue-500 ring-offset-2' : ''

  if (pin.isLoading) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="absolute group"
      >
        <div className={`w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg shadow-xl flex items-center justify-center`}>
            <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="absolute group"
      {...attributes}
      onClick={handleClick}
      data-pin-id={pin.id} // Add this line
    >
      <ResizableBox
        width={width}
        height={height}
        onResizeStop={onResizeStop}
        lockAspectRatio={true}
        handle={<div className="pin-resize-handle absolute bottom-0 right-0 p-2 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-3 h-3 bg-gray-400 rounded-full" /></div>}
        minConstraints={[DEFAULT_WIDTH * 0.5, (DEFAULT_WIDTH * 0.5) / aspectRatio]}
        maxConstraints={[DEFAULT_WIDTH * 3, (DEFAULT_WIDTH * 3) / aspectRatio]}
      >
        <div
          {...listeners}
          className={`handle cursor-grab active:cursor-grabbing rounded-lg ${selectionClass} transition-all w-full h-full`}
        >
          <Image src={pin.image_url} alt="pin" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="w-full h-full object-cover rounded-lg shadow-xl pointer-events-none" onLoad={onImageLoad} />
        </div>
      </ResizableBox>
      <button
        onClick={handleDelete}
        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Delete pin"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default memo(Pin)
