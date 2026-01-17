/**
 * Agent Edit Route
 *
 * Route: /agents/$name
 *
 * This route loads a single agent by name and allows editing
 */

import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/agents/edit-page'

interface Agent {
  name: string
  description: string
  tools: string[]
  skills: string[]
  mcpServers: string[]
  model: string
  content: string
  path: string
  agentType: 'user' | 'plugin' | 'builtin'
  pluginName?: string
}

export const Route = createFileRoute('/agents/$name')({
  loader: async ({ params }) => {
    try {
      return await invoke<Agent>('get_agent_by_name', { name: params.name })
    } catch (error) {
      console.error('Failed to get agent:', error)
      return null
    }
  },
  component: Page,
})