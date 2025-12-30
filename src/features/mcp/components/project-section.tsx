/**
 * Project MCP Section
 *
 * Displays MCP configuration for a single project:
 * - Project name and path
 * - List of configured MCP servers
 * - Context URIs (resources the project can access)
 *
 * Each project can have its own set of MCP servers.
 * For example, a design project might have Figma MCP,
 * while a backend project might have database tools.
 */

import { FolderOpen, Link as LinkIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { Button } from '@/shared/components/ui/button'
import { ChevronDown } from 'lucide-react'
import { ServerCard } from './server-card'
import type { ProjectMcpConfig } from '@/shared/services/mcp/types'

interface ProjectSectionProps {
  project: ProjectMcpConfig
  /** Whether to start expanded */
  defaultOpen?: boolean
}

export function ProjectSection({ project, defaultOpen = true }: ProjectSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{project.projectName}</CardTitle>
                <CardDescription className="text-xs font-mono">
                  {project.projectPath}
                </CardDescription>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <span className="mr-1">{project.servers.length} server(s)</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Server list */}
            <div className="space-y-2">
              {project.servers.map((server) => (
                <ServerCard key={server.name} server={server} />
              ))}
            </div>

            {/* Context URIs if any */}
            {project.contextUris.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Context URIs
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {project.contextUris.map((uri, i) => (
                    <li key={i} className="font-mono truncate" title={uri}>
                      {uri}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Enabled/Disabled servers info */}
            {(project.enabledServers.length > 0 || project.disabledServers.length > 0) && (
              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                {project.enabledServers.length > 0 && (
                  <p>Enabled: {project.enabledServers.join(', ')}</p>
                )}
                {project.disabledServers.length > 0 && (
                  <p>Disabled: {project.disabledServers.join(', ')}</p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}