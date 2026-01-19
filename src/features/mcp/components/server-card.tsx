/**
 * MCP Server Card
 *
 * Displays information about a single MCP server:
 * - Server name and type (HTTP, SSE, stdio)
 * - Connection URL or command
 * - Online/offline status (for HTTP servers)
 * - Toggle to enable/disable
 * - Copy button to copy to other projects
 *
 * Server types explained:
 * - HTTP: REST-like API calls (most cloud services like Figma, GitHub)
 * - SSE: Server-Sent Events for streaming data
 * - stdio: Local process communication (CLI tools)
 */

import { useState } from 'react'
import { Globe, Terminal, Radio, ExternalLink, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Status, StatusIndicator, StatusLabel } from '@/shared/components/ui/status'
import { checkServerStatus, toggleMcpServer, copyMcpToProject } from '@/shared/services/mcp/client'
import type { McpServer } from '@/shared/types/mcp'

interface ProjectOption {
  path: string
  name: string
}

interface ServerCardProps {
  server: McpServer
  /** Project path this server belongs to */
  projectPath: string
  /** Whether this server is disabled */
  isDisabled?: boolean
  /** All projects for copy dropdown */
  allProjects?: ProjectOption[]
  /** Whether to show the status check button (only for HTTP servers) */
  showStatusCheck?: boolean
  /** Callback when server is toggled */
  onToggle?: () => void
}

export function ServerCard({
  server,
  projectPath,
  isDisabled = false,
  allProjects = [],
  showStatusCheck = true,
  onToggle,
}: ServerCardProps) {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking' | 'unknown'>('unknown')
  const [error, setError] = useState<string>()
  const [isToggling, setIsToggling] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  // Filter out current project from copy destinations
  const copyDestinations = allProjects.filter(p => p.path !== projectPath)

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
      const result = await checkServerStatus(server.url)
      setStatus(result.online ? 'online' : 'offline')
      if (!result.online) {
        setError(result.error)
      }
    } catch {
      setStatus('offline')
      setError('Failed to check status')
    }
  }

  // Toggle server enabled/disabled
  const handleToggle = async (checked: boolean) => {
    setIsToggling(true)
    try {
      const result = await toggleMcpServer(projectPath, server.name, checked)

      if (result) {
        toast.success(checked ? `Enabled "${server.name}"` : `Disabled "${server.name}"`)
        onToggle?.()
      } else {
        toast.error('Failed to toggle server')
      }
    } catch {
      toast.error('Failed to toggle server')
    } finally {
      setIsToggling(false)
    }
  }

  // Copy server to another project
  const handleCopy = async (destinationProject: string, destinationName: string) => {
    setIsCopying(true)
    try {
      const result = await copyMcpToProject(projectPath, server.name, destinationProject)

      if (result) {
        toast.success(`Copied "${server.name}" to ${destinationName}`)
      } else {
        toast.error('Failed to copy server')
      }
    } catch {
      toast.error('Failed to copy server')
    } finally {
      setIsCopying(false)
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
    <div className={`flex items-center justify-between p-3 rounded-lg border bg-card ${isDisabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle switch */}
        <Switch
          checked={!isDisabled}
          onCheckedChange={handleToggle}
          disabled={isToggling}
        />

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
            {isDisabled && (
              <Badge variant="secondary" className="text-xs">
                Disabled
              </Badge>
            )}
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

        {/* Copy to project dropdown */}
        {copyDestinations.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isCopying}>
                {isCopying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ml-1 text-xs">Copy</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {copyDestinations.map((project) => (
                <DropdownMenuItem
                  key={project.path}
                  onClick={() => handleCopy(project.path, project.name)}
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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