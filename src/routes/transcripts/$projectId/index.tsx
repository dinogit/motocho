/**
 * Project Sessions Route
 *
 * Route: /transcripts/$projectId
 *
 * Displays all sessions for a project with efficiency statistics:
 * - Project cost (total spent)
 * - Lines written (via Write/Edit tools)
 * - Time spent (Claude processing time)
 * - Session list with individual stats
 */

import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/projects/page'
import { getProjectSessions, getProjectStats } from '@/shared/services/transcripts/client'

export const Route = createFileRoute('/transcripts/$projectId/')({
  loader: async ({ params }) => {
    // Load sessions and stats in parallel for better performance
    const [sessions, stats] = await Promise.all([
      getProjectSessions({ data: params.projectId }),
      getProjectStats({ data: params.projectId }),
    ])
    return { sessions, stats }
  },
  component: Page,
})