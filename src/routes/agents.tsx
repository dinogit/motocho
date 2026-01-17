/**
 * Agents Route
 *
 * Route: /agents
 *
 * This route loads agents data from ~/.claude/agents/
 * The loader runs on the server and returns all agents data
 * which is then rendered by the Page component.
 */

import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/agents/page'

interface Agent {
  name: string
  description: string
  tools: string[]
  skills: string[]
  mcpServers: string[]
  model: string
  content: string
  path: string
  agentType: 'user' | 'plugin'
  pluginName?: string
}

interface AgentsDashboardData {
  userAgents: Agent[]
  pluginAgents: Agent[]
}

export const Route = createFileRoute('/agents')({
  loader: async () => {
    try {
      return await invoke<AgentsDashboardData>('get_agents_data')
    } catch (error) {
      console.error('Failed to get agents data:', error)
      return null
    }
  },
  component: Page,
})