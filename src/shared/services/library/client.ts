/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { LibrarySkill, LibrarySearchParams, SaveSkillInput } from './types'

export async function saveSkill(_projectId: string, _skill: SaveSkillInput): Promise<LibrarySkill | null> {
  console.warn('[Phase 1] saveSkill not yet implemented')
  return null
}

export async function listSkills(_projectId: string, _params?: LibrarySearchParams): Promise<LibrarySkill[]> {
  console.warn('[Phase 1] listSkills not yet implemented')
  return []
}

export async function getSkill(_projectId: string, _skillId: string): Promise<LibrarySkill | null> {
  console.warn('[Phase 1] getSkill not yet implemented')
  return null
}

export async function deleteSkill(_projectId: string, _skillId: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] deleteSkill not yet implemented')
  return null
}

export async function getLibraryTags(_projectId: string): Promise<string[]> {
  console.warn('[Phase 1] getLibraryTags not yet implemented')
  return []
}
