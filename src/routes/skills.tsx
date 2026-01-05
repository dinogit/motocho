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
 * The loader runs on the server and returns all skills data
 * which is then rendered by the Page component.
 */

import { createFileRoute } from '@tanstack/react-router'
import { Page } from '@/features/skills/page'
import { getSkillsData } from '@/shared/services/skills/server-functions'

export const Route = createFileRoute('/skills')({
  loader: () => getSkillsData(),
  component: Page,
})
