/**
 * Agents Dashboard Page
 *
 * Displays all available agents: user-created and plugin agents.
 * All agents are dynamically loaded from ~/.claude/ directory structure.
 */

import { Sparkles, Package, Edit } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
} from '@/shared/components/page/page-header'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Route } from "@/routes/agents"

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

export function Page() {
  const data = Route.useLoaderData() as AgentsDashboardData

  return (
    <div className="space-y-8">
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Agents</PageTitle>
          <PageDescription>
            View all available agents in your Claude Code environment
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <div className="p-6 space-y-8">
        {/* User Agents */}
        {data.userAgents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">User Agents</h2>
                <Badge variant="secondary">{data.userAgents.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.userAgents.map((agent) => {
                  // Extract agent name from path (remove .md extension)
                  const agentName = agent.path.split('/').pop()?.replace('.md', '') || agent.name

                  return (
                    <Card key={agent.path}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{agent.name}</span>
                          <Badge variant="outline">{agent.model}</Badge>
                        </CardTitle>
                        {agent.description && (
                            <CardDescription className="truncate line-clamp-3 h-12">{agent.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {agent.tools.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Tools</p>
                              <div className="flex flex-wrap gap-1">
                                {agent.tools.map((tool) => (
                                    <Badge key={tool} variant="secondary" className="text-xs">
                                      {tool}
                                    </Badge>
                                ))}
                              </div>
                            </div>
                        )}
                        {agent.skills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {agent.skills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                ))}
                              </div>
                            </div>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link to="/agents/$name" params={{ name: agentName }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </section>
        )}

        {/* Plugin Agents */}
        {data.pluginAgents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Plugin Agents</h2>
                <Badge variant="secondary">{data.pluginAgents.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.pluginAgents.map((agent) => (
                    <Card key={agent.path}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{agent.name}</span>
                          <Badge variant="outline">{agent.model}</Badge>
                        </CardTitle>
                        {agent.pluginName && (
                            <div className="text-xs text-muted-foreground">
                              Plugin: {agent.pluginName}
                            </div>
                        )}
                        {agent.description && (
                            <CardDescription className="truncate line-clamp-3 h-12">{agent.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {agent.tools.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Tools</p>
                              <div className="flex flex-wrap gap-1">
                                {agent.tools.map((tool) => (
                                    <Badge key={tool} variant="secondary" className="text-xs">
                                      {tool}
                                    </Badge>
                                ))}
                              </div>
                            </div>
                        )}
                        {agent.skills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-1">Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {agent.skills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                ))}
                              </div>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                ))}
              </div>
            </section>
        )}
      </div>
    </div>
  )
}