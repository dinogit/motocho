/**
 * Plugin Detail Page
 *
 * Shows full plugin details including README, agents, commands.
 * Uses tabs to organize content.
 */

import { ArrowLeft, Bot, Terminal, FileText, Clock, FolderOpen, CheckCircle2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import {
    PageHeader,
    PageHeaderContent,
    PageTitle,
    PageDescription, PageHeaderSeparator,
} from '@/shared/components/page/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Route } from "@/routes/plugins.$marketplace.$pluginName"
import type { PluginDetails } from '@/routes/plugins.$marketplace.$pluginName'

function formatDate(dateString: string): string {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return dateString
    }
}

export function DetailPage() {
    const data = Route.useLoaderData() as PluginDetails | null

    if (!data) {
        return (
            <div className="p-6">
                <Button asChild variant="ghost" className="mb-4">
                    <Link to="/plugins">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Plugins
                    </Link>
                </Button>
                <p className="text-muted-foreground">Plugin not found or failed to load.</p>
            </div>
        )
    }

    const { summary, readme, agents, commands, installPath, installedAt, lastUpdated } = data

    return (
        <>
        <PageHeader>
            <PageHeaderContent>
                <PageTitle>{summary.name}</PageTitle>
                <PageHeaderSeparator />
                <PageDescription>
                    {summary.description}
                </PageDescription>
            </PageHeaderContent>
        </PageHeader>

            <div className="p-6">
                {/* Install Info */}
                {summary.isInstalled && (
                    <Card className="mb-6">
                        <CardContent className="pt-4">
                            <div className="flex flex-wrap gap-6 text-sm">
                                {installedAt && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>Installed: {formatDate(installedAt)}</span>
                                    </div>
                                )}
                                {lastUpdated && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>Updated: {formatDate(lastUpdated)}</span>
                                    </div>
                                )}
                                {installPath && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <FolderOpen className="h-4 w-4" />
                                        <span className="truncate max-w-md font-mono text-xs">{installPath}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Content Tabs */}
                <Tabs defaultValue="readme" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="readme" className="gap-2">
                            <FileText className="h-4 w-4" />
                            README
                        </TabsTrigger>
                        <TabsTrigger value="agents" className="gap-2">
                            <Bot className="h-4 w-4" />
                            Agents
                            {agents.length > 0 && (
                                <Badge variant="secondary" className="ml-1">{agents.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="commands" className="gap-2">
                            <Terminal className="h-4 w-4" />
                            Commands
                            {commands.length > 0 && (
                                <Badge variant="secondary" className="ml-1">{commands.length}</Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="readme" className="space-y-4">
                        <Card>
                            <CardContent className="pt-6 prose prose-invert max-w-none">
                                {readme ? (
                                    <ReactMarkdown>{readme}</ReactMarkdown>
                                ) : (
                                    <p className="text-muted-foreground">No README available for this plugin.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="agents" className="space-y-4">
                        {agents.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {agents.map((agent) => (
                                    <Card key={agent.path}>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center justify-between">
                                                <span>{agent.name}</span>
                                                <Badge variant="outline">{agent.model}</Badge>
                                            </CardTitle>
                                            {agent.description && (
                                                <CardDescription className="line-clamp-2">
                                                    {agent.description}
                                                </CardDescription>
                                            )}
                                        </CardHeader>
                                        <CardContent className="space-y-3">
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
                        ) : (
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-muted-foreground">This plugin has no agents.</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="commands" className="space-y-4">
                        {commands.length > 0 ? (
                            <div className="grid gap-4">
                                {commands.map((command) => (
                                    <Card key={command.path}>
                                        <CardHeader>
                                            <CardTitle className="text-lg font-mono">/{command.name}</CardTitle>
                                            {command.description && (
                                                <CardDescription>{command.description}</CardDescription>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            <div className="prose prose-invert max-w-none text-sm">
                                                <ReactMarkdown>{command.content}</ReactMarkdown>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-muted-foreground">This plugin has no commands.</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </>
    )
}
