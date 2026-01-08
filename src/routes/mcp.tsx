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
import { Page } from '@/features/mcp/page'
import { getMcpData } from '@/shared/services/mcp/client'

export const Route = createFileRoute('/mcp')({
  // Loader runs on server - reads Claude config files
  loader: () => getMcpData(),
  component: Page,
})