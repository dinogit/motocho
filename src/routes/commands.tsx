/**
 * Commands Route
 *
 * Route: /commands
 *
 * This route loads all available CLI commands from the Rust backend
 * The loader runs on the server and returns commands data
 * which is then rendered by the Page component.
 */

import { createFileRoute } from '@tanstack/react-router'
import { getCommandsData } from '@/shared/services/commands/client'
import {Page} from '@/features/commands/page'

export const Route = createFileRoute('/commands')({
  loader: async () => {
    return await getCommandsData()
  },
  component: Page,
})
