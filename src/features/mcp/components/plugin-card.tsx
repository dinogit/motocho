/**
 * MCP Plugin Card
 *
 * Displays a marketplace MCP plugin:
 * - Plugin name and ID
 * - Installation status
 * - Server configuration type
 * - Which projects use this plugin
 *
 * Plugins are pre-configured MCP servers from Claude's marketplace.
 * Users can install them to quickly add integrations like:
 * - GitHub for repo access
 * - Slack for messaging
 * - Figma for design files
 * - And many more...
 */

import { Package, PackageCheck, Globe, Terminal, Radio } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Status, StatusIndicator, StatusLabel } from '@/shared/components/ui/status'
import type { McpPlugin } from '@/shared/types/mcp'

interface PluginCardProps {
  plugin: McpPlugin
}

export function PluginCard({ plugin }: PluginCardProps) {
  // Determine the server type from config
  const serverTypes = Object.values(plugin.serverConfig).map(c => c.type)
  const primaryType = serverTypes[0] || 'http'

  // Get icon based on type
  const TypeIcon = {
    http: Globe,
    sse: Radio,
    stdio: Terminal,
  }[primaryType]

  // Get the URL if it's an HTTP server
  const httpConfig = Object.values(plugin.serverConfig).find(c => c.type === 'http')
  const serverUrl = httpConfig?.url

  return (
    <Card className={plugin.isInstalled ? 'border-chart-1/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Plugin icon */}
            <div className={`p-2 rounded-lg ${plugin.isInstalled ? 'bg-chart-1/10' : 'bg-muted'}`}>
              {plugin.isInstalled ? (
                <PackageCheck className="h-5 w-5 text-chart-1" />
              ) : (
                <Package className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div>
              {/* Plugin name */}
              <div className="flex items-center gap-2">
                <span className="font-medium">{plugin.name}</span>
                <Status variant={plugin.isInstalled ? 'success' : 'default'}>
                  <StatusIndicator />
                  <StatusLabel>{plugin.isInstalled ? 'Installed' : 'Available'}</StatusLabel>
                </Status>
              </div>

              {/* Plugin ID */}
              <p className="text-xs text-muted-foreground font-mono">
                {plugin.id}
              </p>
            </div>
          </div>

          {/* Server type badge */}
          <Badge variant="outline" className="text-xs">
            <TypeIcon className="h-3 w-3 mr-1" />
            {primaryType.toUpperCase()}
          </Badge>
        </div>

        {/* Server URL if available */}
        {serverUrl && (
          <p className="mt-3 text-xs text-muted-foreground truncate" title={serverUrl}>
            {serverUrl}
          </p>
        )}

        {/* Active projects */}
        {plugin.isInstalled && plugin.activeInProjects.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Active in: {plugin.activeInProjects.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}