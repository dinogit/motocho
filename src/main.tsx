import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './shared/styles/globals.css'
import reportWebVitals from './reportWebVitals.ts'
import {CatchBoundary} from "@/shared/components/effects/catch-boundary.tsx";

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: CatchBoundary,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Initialize the app
const rootElement = document.getElementById('app')
if (!rootElement) {
  throw new Error('Root element #app not found in DOM')
}

const root = ReactDOM.createRoot(rootElement)
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

reportWebVitals()
