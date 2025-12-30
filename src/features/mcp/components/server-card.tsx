/**
 * MCP Server Card
 *
 * Displays information about a single MCP server:
 * - Server name and type (HTTP, SSE, stdio)
 * - Connection URL or command
 * - Online/offline status (for HTTP servers)
 *
 * Server types explained:
 * - HTTP: REST-like API calls (most cloud services like Figma, GitHub)
 * - SSE: Server-Sent Events for streaming data
 * - stdio: Local process communication (CLI tools)
 */

import { useState } from 'react'
import { Globe, Terminal, Radio, ExternalLink } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Status, StatusIndicator, StatusLabel } from '@/shared/components/ui/status'
import { checkServerStatus } from '@/shared/services/mcp/server-functions'
import type { McpServer } from '@/shared/services/mcp/types'

interface ServerCardProps {
  server: McpServer
  /** Whether to show the status check button (only for HTTP servers) */
  showStatusCheck?: boolean
}

export function ServerCard({ server, showStatusCheck = true }: ServerCardProps) {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking' | 'unknown'>('unknown')
  const [error, setError] = useState<string>()

  // Get the appropriate icon based on server type
  const TypeIcon = {
    http: Globe,
    sse: Radio,
    stdio: Terminal,
  }[server.type]

  // Get URL or command to display
  const connectionInfo = server.type === 'stdio'
    ? `${server.command} ${server.args?.join(' ') || ''}`
    : server.url

  // Check server status (only for HTTP/SSE servers)
  const handleCheckStatus = async () => {
    if (server.type === 'stdio') return

    setStatus('checking')
    setError(undefined)

    try {
      const result = await checkServerStatus({ data: { url: server.url } })
      setStatus(result.online ? 'online' : 'offline')
      if (!result.online) {
        setError(result.error)
      }
    } catch {
      setStatus('offline')
      setError('Failed to check status')
    }
  }

  // Status variant for the Status component
  const statusVariant = {
    online: 'success',
    offline: 'error',
    checking: 'warning',
    unknown: 'default',
  }[status] as 'success' | 'error' | 'warning' | 'default'

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3 min-w-0">
        {/* Server type icon */}
        <div className="p-2 rounded-md bg-muted">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="min-w-0">
          {/* Server name and type badge */}
          <div className="flex items-center gap-2">
            <span className="font-medium">{server.name}</span>
            <Badge variant="outline" className="text-xs">
              {server.type.toUpperCase()}
            </Badge>
          </div>

          {/* Connection info (URL or command) */}
          <p className="text-xs text-muted-foreground truncate max-w-md" title={connectionInfo}>
            {connectionInfo}
          </p>

          {/* Error message if any */}
          {error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status indicator */}
        {server.type !== 'stdio' && (
          <Status variant={statusVariant}>
            <StatusIndicator />
            <StatusLabel className="capitalize">{status}</StatusLabel>
          </Status>
        )}

        {/* Check status button (HTTP/SSE only) */}
        {showStatusCheck && server.type !== 'stdio' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCheckStatus}
            disabled={status === 'checking'}
          >
            Check
          </Button>
        )}

        {/* External link for HTTP servers */}
        {server.type === 'http' && server.url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(server.url, '_blank')}
            title="Open in browser"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}