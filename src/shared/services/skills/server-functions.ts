/**
 * Skills Server Functions
 *
 * These functions run on the server and read skills/CLAUDE.md from:
 * 1. ~/.claude.json - Contains projects with their actual paths
 * 2. {project}/CLAUDE.md - Project instructions
 * 3. {project}/.claude/skills/ - Project-specific skills
 *
 * The data flow:
 * 1. Read ~/.claude.json to get project paths (stored correctly)
 * 2. Read CLAUDE.md and .claude/skills/ from each project
 * 3. Parse skill frontmatter (name, description) from SKILL.md files
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createServerFn } from '@tanstack/react-start'
import type {
  Skill,
  ProjectSkillsConfig,
  ProjectRef,
  SkillsDashboardData,
  SkillsStats,
} from './types'

// ============================================================================
// Path Constants
// ============================================================================

/** Main Claude configuration file - contains project paths */
const CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude.json')

/**
 * Extract a short project name from full path
 * "/Users/john/projects/my-app" → "projects/my-app"
 */
function getProjectDisplayName(projectPath: string): string {
  const parts = projectPath.split('/').filter(Boolean)
  if (parts.length === 0) return 'Unknown Project'
  return parts.slice(-2).join('/')
}

/**
 * Parse YAML frontmatter from a skill file
 * Returns the frontmatter fields and the remaining content
 *
 * Format:
 * ---
 * name: skill-name
 * description: What this skill does
 * ---
 * # Rest of content
 */
function parseSkillFrontmatter(content: string): {
  name: string
  description: string
  body: string
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { name: '', description: '', body: content }
  }

  const [, frontmatter, body] = match
  const lines = frontmatter.split('\n')

  let name = ''
  let description = ''

  for (const line of lines) {
    const nameMatch = line.match(/^name:\s*(.+)$/)
    if (nameMatch) {
      name = nameMatch[1].trim()
    }

    const descMatch = line.match(/^description:\s*(.+)$/)
    if (descMatch) {
      description = descMatch[1].trim()
    }
  }

  return { name, description, body: body.trim() }
}

// ============================================================================
// Data Reading Functions
// ============================================================================

/**
 * Read the main Claude configuration file
 * This contains all projects with their correct paths
 */
async function readClaudeConfig(): Promise<Record<string, unknown> | null> {
  try {
    const content = await fs.promises.readFile(CLAUDE_CONFIG_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Read CLAUDE.md from a project directory
 */
async function readClaudeMd(projectPath: string): Promise<string | null> {
  try {
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md')
    return await fs.promises.readFile(claudeMdPath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Read all skills from a project's .claude/skills/ directory
 */
async function readProjectSkills(projectPath: string): Promise<Skill[]> {
  const skillsDir = path.join(projectPath, '.claude', 'skills')
  const skills: Skill[] = []

  try {
    const entries = await fs.promises.readdir(skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillPath = path.join(skillsDir, entry.name)
      const skillMdPath = path.join(skillPath, 'SKILL.md')

      try {
        const content = await fs.promises.readFile(skillMdPath, 'utf-8')
        const { name, description, body } = parseSkillFrontmatter(content)

        skills.push({
          name: name || entry.name,
          description,
          content: body,
          path: skillPath,
        })
      } catch {
        // SKILL.md doesn't exist or can't be read
      }
    }
  } catch {
    // .claude/skills/ doesn't exist
  }

  return skills
}

// ============================================================================
// Server Functions (exposed to client)
// ============================================================================

/**
 * Get all skills data for the dashboard
 *
 * This is the main entry point that aggregates:
 * - Per-project CLAUDE.md content
 * - Per-project skills from .claude/skills/
 * - Aggregate statistics
 */
export const getSkillsData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SkillsDashboardData> => {
    const projects: ProjectSkillsConfig[] = []
    const allProjects: ProjectRef[] = []

    // Stats counters
    let projectsWithClaudeMd = 0
    let projectsWithSkills = 0
    let totalSkills = 0

    // Read project paths from ~/.claude.json (contains correct paths)
    const config = await readClaudeConfig()

    if (config?.projects && typeof config.projects === 'object') {
      const projectsConfig = config.projects as Record<string, unknown>

      // Process each project path
      for (const projectPath of Object.keys(projectsConfig)) {
        // Skip home directory entry
        if (projectPath === os.homedir()) continue

        const projectName = getProjectDisplayName(projectPath)

        // Add to allProjects (for destination dropdown)
        allProjects.push({ path: projectPath, name: projectName })

        // Read CLAUDE.md and skills in parallel
        const [claudeMd, skills] = await Promise.all([
          readClaudeMd(projectPath),
          readProjectSkills(projectPath),
        ])

        // Skip projects with neither CLAUDE.md nor skills for main list
        if (!claudeMd && skills.length === 0) continue

        // Update stats
        if (claudeMd) projectsWithClaudeMd++
        if (skills.length > 0) projectsWithSkills++
        totalSkills += skills.length

        projects.push({
          projectPath,
          projectName,
          claudeMd,
          skills,
        })
      }
    }

    // Sort both lists by project name
    projects.sort((a, b) => a.projectName.localeCompare(b.projectName))
    allProjects.sort((a, b) => a.name.localeCompare(b.name))

    const stats: SkillsStats = {
      totalProjects: allProjects.length,
      projectsWithClaudeMd,
      projectsWithSkills,
      totalSkills,
    }

    return { projects, allProjects, stats }
  }
)

/**
 * Copy a skill from one project to another
 *
 * Copies the entire skill directory to the destination project's .claude/skills/
 */
export const copySkill = createServerFn({ method: 'POST' })
  .inputValidator((d: { sourcePath: string; destinationProject: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { sourcePath, destinationProject } = data

    try {
      // Get skill folder name from source path
      const skillName = path.basename(sourcePath)

      // Create destination path
      const destSkillsDir = path.join(destinationProject, '.claude', 'skills')
      const destPath = path.join(destSkillsDir, skillName)

      // Check if skill already exists at destination
      try {
        await fs.promises.access(destPath)
        return { success: false, error: `Skill "${skillName}" already exists in destination project` }
      } catch {
        // Skill doesn't exist, we can proceed
      }

      // Ensure destination .claude/skills/ directory exists
      await fs.promises.mkdir(destSkillsDir, { recursive: true })

      // Copy the skill directory recursively
      await copyDir(sourcePath, destPath)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to copy skill',
      }
    }
  })

/**
 * Delete a skill from a project
 *
 * Removes the entire skill directory
 */
export const deleteSkill = createServerFn({ method: 'POST' })
  .inputValidator((d: { skillPath: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { skillPath } = data

    try {
      // Verify path looks like a skill directory (contains .claude/skills/)
      if (!skillPath.includes('.claude/skills/')) {
        return { success: false, error: 'Invalid skill path' }
      }

      // Remove the skill directory recursively
      await fs.promises.rm(skillPath, { recursive: true, force: true })

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete skill',
      }
    }
  })

/**
 * Bulk copy skills and CLAUDE.md to another project
 */
export const bulkCopy = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    items: Array<{ type: 'skill' | 'claude-md'; sourcePath: string; sourceProject: string }>
    destinationProject: string
  }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; copied: number; errors: string[] }> => {
    const { items, destinationProject } = data
    const errors: string[] = []
    let copied = 0

    for (const item of items) {
      try {
        if (item.type === 'skill') {
          // Copy skill directory
          const skillName = path.basename(item.sourcePath)
          const destSkillsDir = path.join(destinationProject, '.claude', 'skills')
          const destPath = path.join(destSkillsDir, skillName)

          // Check if already exists
          try {
            await fs.promises.access(destPath)
            errors.push(`Skill "${skillName}" already exists`)
            continue
          } catch {
            // Doesn't exist, proceed
          }

          await fs.promises.mkdir(destSkillsDir, { recursive: true })
          await copyDir(item.sourcePath, destPath)
          copied++
        } else if (item.type === 'claude-md') {
          // Copy CLAUDE.md file
          const srcClaudeMd = path.join(item.sourceProject, 'CLAUDE.md')
          const destClaudeMd = path.join(destinationProject, 'CLAUDE.md')

          // Check if already exists
          try {
            await fs.promises.access(destClaudeMd)
            errors.push('CLAUDE.md already exists in destination')
            continue
          } catch {
            // Doesn't exist, proceed
          }

          await fs.promises.copyFile(srcClaudeMd, destClaudeMd)
          copied++
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    return {
      success: errors.length === 0,
      copied,
      errors,
    }
  })

/**
 * Recursively copy a directory
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true })

  const entries = await fs.promises.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}
