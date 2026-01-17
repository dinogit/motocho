/**
 * Skills Route
 *
 * Route: /skills
 *
 * This route loads skills and CLAUDE.md data from:
 * - ~/.claude/projects/ (project list)
 * - {project}/CLAUDE.md (project instructions)
 * - {project}/.claude/skills/ (project skills)
 *
 * - {project}/.claude/mcp/ (project mcp data)
 *
 * The loader runs on the server and returns all mcp data
 * which is then rendered by the Page component.
 */

import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { Page } from '@/features/skills/page'
import type { SkillsDashboardData } from '@/shared/types/skills'

export const Route = createFileRoute('/skills')({
  loader: async () => {
    try {
      return await invoke<SkillsDashboardData>('get_skills_data')
    } catch (error) {
      console.error('Failed to get skills data:', error)
      return null
    }
  },
  component: Page,
})
