import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './shared/styles/globals.css'
import reportWebVitals from './reportWebVitals.ts'

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Wait for Tauri to be ready before rendering
async function initializeApp() {
  // Wait for document to be interactive
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve, { once: true })
    })
  }

  // Wait for Tauri to initialize (check for __TAURI__ object or wait longer)
  let attempts = 0
  while (typeof (window as any).__TAURI__ === 'undefined' && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 10))
    attempts++
  }

  console.log('[Init] Tauri ready, rendering app...')

  const rootElement = document.getElementById('app')
  if (rootElement && !rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    )
  }

  reportWebVitals()
}

// Initialize the app
initializeApp().catch(err => {
  console.error('Failed to initialize app:', err)
})
