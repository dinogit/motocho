/**
 * Plugins Layout Route
 *
 * Route: /plugins
 *
 * Acts as the layout for all plugin routes.
 * Defines shared types.
 */

import { createFileRoute, Outlet } from '@tanstack/react-router'

export interface PluginSummary {
  id: string
  name: string
  description: string
  marketplace: string
  isInstalled: boolean
  installedVersion: string | null
  agentCount: number
  commandCount: number
  skillCount: number
  readmePreview: string
}

export interface PluginsDashboardData {
  installedPlugins: PluginSummary[]
  availablePlugins: PluginSummary[]
  totalInstalled: number
  totalAvailable: number
}

export const Route = createFileRoute('/plugins')({
  component: () => <Outlet />,
})

