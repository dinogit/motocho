import { useState, useEffect, type ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Renders children only on the client side to prevent hydration mismatches.
 * Useful for components that use browser-only APIs or have dynamic content
 * that differs between server and client (like Radix UI primitives).
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return fallback
  }

  return children
}