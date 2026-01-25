/**
 * Plugins Dashboard Page
 *
 * Displays all plugins: installed and available from marketplace.
 * Card view with name, description, agent/command counts.
 */

import { Package, Download, CheckCircle2, Bot, Terminal, Puzzle } from 'lucide-react'
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
import { Route } from "@/routes/plugins.index"
import type { PluginSummary } from '@/routes/plugins'

function PluginCard({ plugin }: { plugin: PluginSummary }) {


    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="truncate text-chart-1">{plugin.name}</span>
                    {plugin.isInstalled ? (
                        <Badge variant="outline" className="text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Installed
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                            Available
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription className="line-clamp-2 h-10">
                    {plugin.description || 'No description available'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="flex gap-4 text-sm text-muted-foreground">
                    {plugin.agentCount > 0 && (
                        <div className="flex items-center gap-1">
                            <Bot className="h-4 w-4" />
                            <span>{plugin.agentCount} agent{plugin.agentCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                    {plugin.commandCount > 0 && (
                        <div className="flex items-center gap-1">
                            <Terminal className="h-4 w-4" />
                            <span>{plugin.commandCount} cmd{plugin.commandCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                    {plugin.skillCount > 0 && (
                        <div className="flex items-center gap-1">
                            <Puzzle className="h-4 w-4" />
                            <span>{plugin.skillCount} skill{plugin.skillCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
                {plugin.installedVersion && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Version: {plugin.installedVersion}
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full">
                    <Link
                        to="/plugins/$marketplace/$pluginName"
                        params={{
                            marketplace: plugin.marketplace,
                            pluginName: plugin.id.split('@')[0]
                        }}
                    >
                        View Details
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

export function Page() {
    const data = Route.useLoaderData()

    if (!data) {
        return (
            <div className="p-6">
                <p className="text-muted-foreground">Failed to load plugins data</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <PageHeader>
                <PageHeaderContent>
                    <PageTitle>Plugins</PageTitle>
                    <PageDescription>
                        Browse installed plugins and discover new ones from the marketplace
                    </PageDescription>
                </PageHeaderContent>
            </PageHeader>

            <div className="p-6 space-y-8">
                {/* Installed Plugins */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-chart-1" />
                        <h2 className="text-xl font-semibold">Installed</h2>
                        <Badge variant="secondary">{data.totalInstalled}</Badge>
                    </div>
                    {data.installedPlugins.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {data.installedPlugins.map((plugin) => (
                                <PluginCard key={plugin.id} plugin={plugin} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No plugins installed yet.</p>
                    )}
                </section>

                {/* Available Plugins */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">Available</h2>
                        <Badge variant="secondary">{data.totalAvailable}</Badge>
                    </div>
                    {data.availablePlugins.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {data.availablePlugins.map((plugin) => (
                                <PluginCard key={plugin.id} plugin={plugin} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">All available plugins are installed.</p>
                    )}
                </section>
            </div>
        </div>
    )
}
