'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: ReactNode;
}

export default function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false)
  const [portalRoot, setPortalRoot] = useState<Element | null>(null);

  useEffect(() => {
    setMounted(true)
    // This ensures we find the div after the client has rendered.
    setPortalRoot(document.getElementById('portal-root'));
    return () => setMounted(false)
  }, [])

  if (!mounted || !portalRoot) {
    return null;
  }

  return createPortal(children, portalRoot);
}