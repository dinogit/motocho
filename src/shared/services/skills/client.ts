/**
 * TypeScript client for skills Tauri commands
 * Communicates with src-tauri/src/commands/skills.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { SkillsDashboardData, Skill, BulkCopyItem, BulkCopyResult } from '@/shared/types/skills'

/**
 * Get all skills data for the dashboard
 */
export async function getSkillsData(): Promise<SkillsDashboardData | null> {
  try {
    return await invoke<SkillsDashboardData>('get_skills_data')
  } catch (error) {
    console.error('Failed to get skills data:', error)
    return null
  }
}

/**
 * Copy a skill to another project
 */
export async function copySkill(
  sourcePath: string,
  destinationProject: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('copy_skill', {
      sourcePath,
      destinationProject,
    })
  } catch (error) {
    console.error('Failed to copy skill:', error)
    return null
  }
}

/**
 * Delete a skill directory
 */
export async function deleteSkill(skillPath: string): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('delete_skill_file', {
      skillPath,
    })
  } catch (error) {
    console.error('Failed to delete skill:', error)
    return null
  }
}

/**
 * Toggle skill enabled/disabled
 */
export async function toggleSkill(
  skillPath: string,
  enabled: boolean,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('toggle_skill', {
      skillPath,
      enabled,
    })
  } catch (error) {
    console.error('Failed to toggle skill:', error)
    return null
  }
}

/**
 * Get skills for a specific project
 */
export async function getProjectSkills(projectPath: string): Promise<Skill[]> {
  try {
    return await invoke<Skill[]>('get_project_skills_cmd', {
      projectPath,
    })
  } catch (error) {
    console.error('Failed to get project skills:', error)
    return []
  }
}

/**
 * Bulk copy skills and CLAUDE.md to a destination project
 */
export async function bulkCopy(
  items: BulkCopyItem[],
  destination: string,
): Promise<BulkCopyResult | null> {
  try {
    return await invoke<BulkCopyResult>('bulk_copy', {
      items,
      destination,
    })
  } catch (error) {
    console.error('Failed to bulk copy:', error)
    return null
  }
}
