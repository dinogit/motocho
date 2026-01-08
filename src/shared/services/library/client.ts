/**
 * TypeScript client for library Tauri commands
 * Communicates with src-tauri/src/commands/library.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { LibrarySkill, LibrarySearchParams, SaveSkillInput } from './types'

/**
 * Save a new skill to the library
 */
export async function saveSkill(projectPath: string, skill: SaveSkillInput): Promise<LibrarySkill | null> {
  try {
    const result = await invoke<LibrarySkill>('save_skill', {
      project_path: projectPath,
      skill_input: skill,
    })
    return {
      ...result,
      createdAt: new Date(result.createdAt).toISOString(),
      updatedAt: new Date(result.updatedAt).toISOString(),
    }
  } catch (error) {
    console.error('Failed to save skill:', error)
    return null
  }
}

/**
 * List all skills in the library with optional search/filter
 */
export async function listSkills(projectPath: string, params?: LibrarySearchParams): Promise<LibrarySkill[]> {
  try {
    return await invoke<LibrarySkill[]>('list_skills', {
      project_path: projectPath,
      params,
    })
  } catch (error) {
    console.error('Failed to list skills:', error)
    return []
  }
}

/**
 * Get a specific skill by ID
 */
export async function getSkill(projectPath: string, skillId: string): Promise<LibrarySkill | null> {
  try {
    return await invoke<LibrarySkill>('get_skill', {
      project_path: projectPath,
      skill_id: skillId,
    })
  } catch (error) {
    console.error('Failed to get skill:', error)
    return null
  }
}

/**
 * Delete a skill from the library
 */
export async function deleteSkill(projectPath: string, skillId: string): Promise<boolean> {
  try {
    return await invoke<boolean>('delete_skill', {
      project_path: projectPath,
      skill_id: skillId,
    })
  } catch (error) {
    console.error('Failed to delete skill:', error)
    return false
  }
}

/**
 * Get all unique tags from the library
 */
export async function getLibraryTags(projectPath: string): Promise<string[]> {
  try {
    return await invoke<string[]>('get_library_tags', {
      project_path: projectPath,
    })
  } catch (error) {
    console.error('Failed to get library tags:', error)
    return []
  }
}
