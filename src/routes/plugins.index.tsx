/**
 * Plugins Index Route
 *
 * Route: /plugins/
 *
 * This is the default view when navigating to /plugins.
 * It loads plugins data and displays the list page.
 */

import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/plugins/page'
import type { PluginsDashboardData } from './plugins'

export const Route = createFileRoute('/plugins/')({
    loader: async () => {
        try {
            return await invoke<PluginsDashboardData>('get_plugins_data')
        } catch (error) {
            console.error('Failed to get plugins data:', error)
            return null
        }
    },
    component: Page,
})
