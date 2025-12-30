/**
 * MCP Statistics Cards
 *
 * Displays overview statistics about MCP configuration:
 * - Total servers configured across all projects
 * - Number of projects using MCP
 * - Available marketplace plugins
 * - Installed/active plugins
 */

import { Server, FolderOpen, Package, PackageCheck } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import type { McpStats } from '@/shared/services/mcp/types'

interface StatsCardsProps {
  stats: McpStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Servers',
      value: stats.totalServers,
      icon: Server,
      description: 'MCP servers configured',
    },
    {
      label: 'Projects with MCP',
      value: stats.projectsWithMcp,
      icon: FolderOpen,
      description: 'Projects using MCP',
    },
    {
      label: 'Available Plugins',
      value: stats.availablePlugins,
      icon: Package,
      description: 'From marketplace',
    },
    {
      label: 'Installed Plugins',
      value: stats.installedPlugins,
      icon: PackageCheck,
      description: 'Active in projects',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}