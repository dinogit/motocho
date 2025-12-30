/**
 * Library Server Functions
 *
 * Server-side functions for managing the per-project skill library.
 * Skills are stored in {projectPath}/.claude-dashboard/library/
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { createServerFn } from '@tanstack/react-start'
import type { LibrarySkill, LibraryIndex, SaveSkillInput, LibrarySearchParams } from './types'

/**
 * Decode project ID to actual filesystem path
 * "-Users-dinokljuco-projects-code-myapp" → "/Users/dinokljuco/projects/code/myapp"
 */
function decodeProjectPath(projectId: string): string {
  return projectId.replace(/^-/, '/').replace(/-/g, '/')
}

/**
 * Get the library directory path for a project
 */
function getLibraryPath(projectId: string): string {
  const projectPath = decodeProjectPath(projectId)
  return path.join(projectPath, '.claude-dashboard', 'library')
}

/**
 * Get the index.json path for a project's library
 */
function getIndexPath(projectId: string): string {
  return path.join(getLibraryPath(projectId), 'index.json')
}

/**
 * Ensure library directory exists
 */
async function ensureLibraryDir(projectId: string): Promise<void> {
  const libraryPath = getLibraryPath(projectId)
  await fs.promises.mkdir(libraryPath, { recursive: true })
}

/**
 * Read the library index, creating it if it doesn't exist
 */
async function readIndex(projectId: string): Promise<LibraryIndex> {
  const indexPath = getIndexPath(projectId)

  try {
    const content = await fs.promises.readFile(indexPath, 'utf-8')
    return JSON.parse(content) as LibraryIndex
  } catch {
    // Return empty index if file doesn't exist
    return { version: 1, skills: [] }
  }
}

/**
 * Write the library index
 */
async function writeIndex(projectId: string, index: LibraryIndex): Promise<void> {
  await ensureLibraryDir(projectId)
  const indexPath = getIndexPath(projectId)
  await fs.promises.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
}

/**
 * Generate a unique ID for a skill
 */
function generateId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Generate a filename-safe slug from a name
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Save a new skill to the library
 */
export const saveSkill = createServerFn({ method: 'POST' })
  .inputValidator((d: { projectId: string; skill: SaveSkillInput }) => d)
  .handler(async ({ data }): Promise<LibrarySkill> => {
    const { projectId, skill } = data

    const now = new Date().toISOString()
    const newSkill: LibrarySkill = {
      id: generateId(),
      name: skill.name,
      description: skill.description,
      tags: skill.tags,
      content: skill.content,
      notes: skill.notes,
      source: skill.source,
      createdAt: now,
      updatedAt: now,
    }

    // Read existing index
    const index = await readIndex(projectId)

    // Add new skill
    index.skills.push(newSkill)

    // Write updated index
    await writeIndex(projectId, index)

    // Also write as individual markdown file for readability
    const skillsDir = path.join(getLibraryPath(projectId), 'skills')
    await fs.promises.mkdir(skillsDir, { recursive: true })

    const mdContent = `# ${newSkill.name}

${newSkill.description}

## Tags
${newSkill.tags.map(t => `- ${t}`).join('\n')}

${newSkill.notes ? `## Notes\n${newSkill.notes}\n` : ''}
## Content

\`\`\`
${newSkill.content}
\`\`\`

## Source
- Project: ${newSkill.source.projectId}
- Session: ${newSkill.source.sessionId}
- Type: ${newSkill.source.type}${newSkill.source.toolName ? `\n- Tool: ${newSkill.source.toolName}` : ''}
- Saved: ${newSkill.createdAt}
`

    const mdPath = path.join(skillsDir, `${slugify(newSkill.name)}.md`)
    await fs.promises.writeFile(mdPath, mdContent, 'utf-8')

    return newSkill
  })

/**
 * List all skills in a project's library
 */
export const listSkills = createServerFn({ method: 'GET' })
  .inputValidator((d: { projectId: string; params?: LibrarySearchParams }) => d)
  .handler(async ({ data }): Promise<LibrarySkill[]> => {
    const { projectId, params } = data
    const index = await readIndex(projectId)

    let skills = index.skills

    // Filter by search query
    if (params?.query) {
      const query = params.query.toLowerCase()
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.content.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      )
    }

    // Filter by tags
    if (params?.tags && params.tags.length > 0) {
      skills = skills.filter(s =>
        params.tags!.some(tag => s.tags.includes(tag))
      )
    }

    // Sort by most recent
    skills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Limit results
    if (params?.limit) {
      skills = skills.slice(0, params.limit)
    }

    return skills
  })

/**
 * Get a single skill by ID
 */
export const getSkill = createServerFn({ method: 'GET' })
  .inputValidator((d: { projectId: string; skillId: string }) => d)
  .handler(async ({ data }): Promise<LibrarySkill | null> => {
    const index = await readIndex(data.projectId)
    return index.skills.find(s => s.id === data.skillId) || null
  })

/**
 * Delete a skill from the library
 */
export const deleteSkill = createServerFn({ method: 'POST' })
  .inputValidator((d: { projectId: string; skillId: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const { projectId, skillId } = data
    const index = await readIndex(projectId)

    const skillIndex = index.skills.findIndex(s => s.id === skillId)
    if (skillIndex === -1) {
      return { success: false }
    }

    const skill = index.skills[skillIndex]

    // Remove from index
    index.skills.splice(skillIndex, 1)
    await writeIndex(projectId, index)

    // Remove markdown file
    const mdPath = path.join(getLibraryPath(projectId), 'skills', `${slugify(skill.name)}.md`)
    try {
      await fs.promises.unlink(mdPath)
    } catch {
      // File might not exist
    }

    return { success: true }
  })

/**
 * Get all unique tags used in a project's library
 */
export const getLibraryTags = createServerFn({ method: 'GET' })
  .inputValidator((d: string) => d)
  .handler(async ({ data: projectId }): Promise<string[]> => {
    const index = await readIndex(projectId)
    const tagSet = new Set<string>()

    for (const skill of index.skills) {
      for (const tag of skill.tags) {
        tagSet.add(tag)
      }
    }

    return Array.from(tagSet).sort()
  })