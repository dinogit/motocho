/**
 * Resizable Panel Components
 *
 * Placeholder - not currently used in the app.
 * Add react-resizable-panels implementation when needed.
 */

import * as React from "react"

// Stub implementations - will be replaced when resizable panels are needed
export function ResizablePanelGroup({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="resizable-panel-group" {...props}>{children}</div>
}

export function ResizablePanel({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="resizable-panel" {...props}>{children}</div>
}

export function ResizableHandle({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="resizable-handle" {...props} />
}