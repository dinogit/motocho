/**
 * MCP Dashboard Page
 */

import { useLoaderData } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { StatsCards } from './components/stats-cards'
import { GlobalServers } from './components/global-servers'
import { ProjectSection } from './components/project-section'
import { PluginCard } from './components/plugin-card'
import { AddServerDialog } from './components/add-server-dialog'
import type { McpDashboardData } from '@/shared/services/mcp/types'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'

export function Page() {
  const data = useLoaderData({ from: '/mcp' }) as McpDashboardData
  const allProjects = data.allProjects

  function handleRefresh() {
    window.location.reload()
  }

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>MCP Servers</PageTitle>
          <PageHeaderSeparator />
          <PageDescription>
            Model Context Protocol servers and integrations
          </PageDescription>
        </PageHeaderContent>
        <AddServerDialog allProjects={allProjects} onSuccess={handleRefresh} />
      </PageHeader>
      <div className="flex flex-col gap-6 p-6">
        {/* Statistics overview */}
        <StatsCards stats={data.stats} />

        {/* Main content tabs */}
        <Tabs defaultValue="projects" className="w-full">
          <TabsList>
            <TabsTrigger value="projects">
              Projects ({data.projects.length})
            </TabsTrigger>
            <TabsTrigger value="plugins">
              Plugins ({data.plugins.length})
            </TabsTrigger>
            {data.globalServers.length > 0 && (
              <TabsTrigger value="global">
                Global ({data.globalServers.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Projects tab - shows per-project MCP configurations */}
          <TabsContent value="projects" className="mt-4">
            {data.projects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No projects with MCP servers configured.</p>
                <p className="text-sm mt-1">
                  Configure MCP servers in your project's Claude settings.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.projects.map((project) => (
                  <ProjectSection
                    key={project.projectPath}
                    project={project}
                    allProjects={allProjects}
                    defaultOpen={data.projects.length <= 3}
                    onRefresh={handleRefresh}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Plugins tab - shows marketplace plugins */}
          <TabsContent value="plugins" className="mt-4">
            {data.plugins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No marketplace plugins found.</p>
                <p className="text-sm mt-1">
                  Plugins are located in ~/.claude/plugins/marketplaces/
                </p>
              </div>
            ) : (
              <>
                {/* Installed plugins first */}
                {data.plugins.some(p => p.isInstalled) && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">Installed</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.plugins
                        .filter(p => p.isInstalled)
                        .map(plugin => (
                          <PluginCard key={plugin.id} plugin={plugin} />
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Available plugins */}
                {data.plugins.some(p => !p.isInstalled) && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Available</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {data.plugins
                        .filter(p => !p.isInstalled)
                        .map(plugin => (
                          <PluginCard key={plugin.id} plugin={plugin} />
                        ))
                      }
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Global servers tab */}
          {data.globalServers.length > 0 && (
            <TabsContent value="global" className="mt-4">
              <GlobalServers
                servers={data.globalServers}
                allProjects={allProjects}
                onRefresh={handleRefresh}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Educational footer */}
        <div className="mt-8 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground mb-2">About MCP</h3>
          <p>
            MCP (Model Context Protocol) allows Claude to connect to external services.
            Servers can be configured per-project in your Claude settings, or globally
            for use across all projects.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>HTTP servers</strong> connect to cloud APIs (Figma, GitHub, etc.)</li>
            <li><strong>SSE servers</strong> provide real-time streaming data</li>
            <li><strong>stdio servers</strong> run local tools and scripts</li>
          </ul>
          <p className="mt-2">
            Configuration is stored in <code className="text-xs bg-muted px-1 py-0.5 rounded">~/.claude.json</code>
          </p>
        </div>
      </div>
    </>
  )
}