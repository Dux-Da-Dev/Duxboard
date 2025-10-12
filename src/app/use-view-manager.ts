'use client'

import { useReducer, useEffect, useCallback, RefObject, MouseEvent } from 'react';

const BOARD_WIDTH = 8000;
const BOARD_HEIGHT = 6000;
const MAX_ZOOM = 3;

// --- STATE AND TYPES ---
interface ViewState {
  x: number; // Top-left of the viewport IN BOARD COORDINATES
  y: number;
  zoom: number;
  isPanning: boolean;
  panStart: {
    x: number; // Mouse position on screen
    y: number;
    viewX: number; // View position at pan start
    viewY: number;
  };
  contentBoundingBox?: { minX: number; minY: number; maxX: number; maxY: number; };
  screenWidth: number;
  screenHeight: number;
}

type ViewAction =
  | { type: 'START_PAN'; payload: { x: number; y: number; viewX: number; viewY: number } }
  | { type: 'END_PAN' }
  | { type: 'PAN'; payload: { x: number; y: number } }
  | { type: 'ZOOM'; payload: { clientX: number; clientY: number; deltaY: number; boardRect: DOMRect } }
  | { type: 'INITIALIZE_VIEW'; payload: { pins: any[] } }
  | { type: 'SET_SCREEN_SIZE'; payload: { width: number; height: number } };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

// --- REDUCER ---
function viewReducer(state: ViewState, action: ViewAction): ViewState {
  const { screenWidth, screenHeight } = state;
  // --- START OF CHANGE ---
  // OLD LOGIC: This calculated a "fit" zoom, causing pillarboxing on wider screens.
  // const minZoom = Math.min(screenWidth / BOARD_WIDTH, screenHeight / BOARD_HEIGHT) - Number.EPSILON;

  // NEW LOGIC: This calculates a "fill" zoom, ensuring the board always covers the viewport width or height.
  const minZoom = Math.max(screenWidth / BOARD_WIDTH, screenHeight / BOARD_HEIGHT);
  // --- END OF CHANGE ---

  switch (action.type) {
    case 'SET_SCREEN_SIZE':
      return { ...state, screenWidth: action.payload.width, screenHeight: action.payload.height };
    case 'INITIALIZE_VIEW': {
      if (state.screenWidth === 0 || state.screenHeight === 0) {
        return state;
      }
      const { pins } = action.payload;
      // Always initialize to a fully zoomed-out view to prevent boundary issues.
      // This means the board will not be zoomed in on content on initial load.
      const x = (BOARD_WIDTH - screenWidth / minZoom) / 2;
      const y = (BOARD_HEIGHT - screenHeight / minZoom) / 2;
      return { ...state, x, y, zoom: minZoom, contentBoundingBox: undefined };
    }
    case 'START_PAN':
      return { ...state, isPanning: true, panStart: action.payload };
    case 'END_PAN':
      return { ...state, isPanning: false };
    case 'PAN': {
      if (!state.isPanning) return state;
      const dx = action.payload.x - state.panStart.x;
      const dy = action.payload.y - state.panStart.y;

      let newX = state.panStart.viewX - dx / state.zoom;
      let newY = state.panStart.viewY - dy / state.zoom;

      const viewWidth = screenWidth / state.zoom;
      const viewHeight = screenHeight / state.zoom;

      if (BOARD_WIDTH > viewWidth) {
        const maxX = Math.floor(BOARD_WIDTH - viewWidth);
        newX = clamp(newX, 0, maxX);
      } else {
        newX = (BOARD_WIDTH - viewWidth) / 2;
      }

      if (BOARD_HEIGHT > viewHeight) {
        const maxY = Math.floor(BOARD_HEIGHT - viewHeight);
        newY = clamp(newY, 0, maxY);
      } else {
        newY = (BOARD_HEIGHT - viewHeight) / 2;
      }

      return { ...state, x: newX, y: newY };
    }
    case 'ZOOM': {
      const { clientX, clientY, deltaY, boardRect } = action.payload;
      const zoomFactor = 1 - deltaY * 0.001;
      const newZoom = clamp(state.zoom * zoomFactor, minZoom, MAX_ZOOM);

      if (newZoom === state.zoom) return state;

      const mouseX = clientX - boardRect.left;
      const mouseY = clientY - boardRect.top;

      let newX = state.x + (mouseX / state.zoom) - (mouseX / newZoom);
      let newY = state.y + (mouseY / state.zoom) - (mouseY / newZoom);

      const viewWidth = screenWidth / newZoom;
      const viewHeight = screenHeight / newZoom;

      if (BOARD_WIDTH > viewWidth) {
        const maxX = Math.floor(BOARD_WIDTH - viewWidth);
        newX = clamp(newX, 0, maxX);
      } else {
        newX = (BOARD_WIDTH - viewWidth) / 2;
      }

      if (BOARD_HEIGHT > viewHeight) {
        const maxY = Math.floor(BOARD_HEIGHT - viewHeight);
        newY = clamp(newY, 0, maxY);
      } else {
        newY = (BOARD_HEIGHT - viewHeight) / 2;
      }

      return { ...state, x: newX, y: newY, zoom: newZoom };
    }
    default:
      return state;
  }
}

// --- HOOK ---
export function useViewManager(boardRef: RefObject<HTMLDivElement>, initialPins: any[]) {
  const [view, dispatch] = useReducer(viewReducer, {
    x: 0, y: 0, zoom: 1, isPanning: false,
    panStart: { x: 0, y: 0, viewX: 0, viewY: 0 },
    contentBoundingBox: undefined,
    screenWidth: 0, screenHeight: 0
  });

  useEffect(() => {
    const container = boardRef.current?.parentElement;
    if (!container) return;

    const updateSize = () => {
      dispatch({ type: 'SET_SCREEN_SIZE', payload: { width: container.clientWidth, height: container.clientHeight } });
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => window.removeEventListener('resize', updateSize);
  }, [boardRef]);


  useEffect(() => {
    dispatch({ type: 'INITIALIZE_VIEW', payload: { pins: initialPins } });
  }, [initialPins, view.screenWidth, view.screenHeight]); // Re-initialize when screen size changes

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;
    dispatch({ type: 'ZOOM', payload: { clientX: e.clientX, clientY: e.clientY, deltaY: e.deltaY, boardRect } });
  }, [boardRef]);

  useEffect(() => {
    const boardElement = boardRef.current;
    if (boardElement) {
      boardElement.addEventListener('wheel', handleWheel, { passive: false });
      return () => boardElement.removeEventListener('wheel', handleWheel);
    }
  }, [boardRef, handleWheel]);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.handle') || target.closest('[role="dialog"]') || target.closest('.pin-resize-handle')) {
      return;
    }
    e.preventDefault();
    dispatch({ type: 'START_PAN', payload: { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y } });
  };

  const onMouseUp = () => dispatch({ type: 'END_PAN' });
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => dispatch({ type: 'PAN', payload: { x: e.clientX, y: e.clientY } });
  const onHomeButton = () => dispatch({ type: 'INITIALIZE_VIEW', payload: { pins: initialPins } });

  return { view, onMouseDown, onMouseUp, onMouseMove, onHomeButton };
}
