/**
 * Global MCP Servers Section
 *
 * Displays MCP servers configured at the global (home directory) level.
 * These servers are available across ALL projects, unlike project-specific ones.
 *
 * Global servers are useful for:
 * - Company-wide tools (e.g., Sentry error tracking)
 * - Personal productivity tools
 * - Services you use in every project
 *
 * Configuration location: ~/.claude.json under projects[~].mcpServers
 */

import { Globe } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { ServerCard } from './server-card'
import type { McpServer } from '@/shared/services/mcp/types'

interface GlobalServersProps {
  servers: McpServer[]
}

export function GlobalServers({ servers }: GlobalServersProps) {
  if (servers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Globe className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Global Servers</CardTitle>
            <CardDescription>
              Available across all projects
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {servers.map((server) => (
            <ServerCard key={server.name} server={server} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}