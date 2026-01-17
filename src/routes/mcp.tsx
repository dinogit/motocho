/**
 * MCP Route
 *
 * Route: /mcp
 *
 * This route loads MCP configuration data from:
 * - ~/.claude.json (per-project server configs)
 * - ~/.claude/plugins/ (marketplace plugins)
 *
 * The loader runs on the server and returns all MCP data
 * which is then rendered by the Page component.
 */

import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/mcp/page'
import type { McpDashboardData } from '@/shared/types/mcp'

export const Route = createFileRoute('/mcp')({
  // Loader runs on server - reads Claude config files
  loader: async () => {
    try {
      return await invoke<McpDashboardData>('get_mcp_data')
    } catch (error) {
      console.error('Failed to get MCP data:', error)
      return null
    }
  },
  component: Page,
})