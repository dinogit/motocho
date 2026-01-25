/**
 * Plugin Details Route
 *
 * Route: /plugins/$marketplace/$pluginName
 *
 * Shows full plugin details including README, agents, and commands.
 */

import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { DetailPage } from '@/features/plugins/detail-page'
import type { PluginSummary } from './plugins'

interface Agent {
    name: string
    description: string
    tools: string[]
    skills: string[]
    mcpServers: string[]
    model: string
    content: string
    path: string
    agentType: string
    pluginName: string | null
}

interface PluginCommand {
    name: string
    description: string
    content: string
    path: string
}

export interface PluginDetails {
    summary: PluginSummary
    readme: string
    agents: Agent[]
    commands: PluginCommand[]
    installPath: string | null
    installedAt: string | null
    lastUpdated: string | null
}

export const Route = createFileRoute('/plugins/$marketplace/$pluginName')({
    loader: async ({ params }) => {
        try {
            return await invoke<PluginDetails>('get_plugin_details', {
                marketplace: params.marketplace,
                pluginName: params.pluginName
            })
        } catch (error) {
            console.error('Failed to get plugin details:', error)
            return null
        }
    },
    component: DetailPage,
})
