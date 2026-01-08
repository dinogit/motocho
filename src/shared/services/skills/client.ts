/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { SkillsDashboardData, Skill } from './types'

export async function getSkillsData(): Promise<SkillsDashboardData | null> {
  console.warn('[Phase 1] getSkillsData not yet implemented')
  return null
}

export async function copySkill(_sourcePath: string, _destinationProject: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] copySkill not yet implemented')
  return null
}

export async function deleteSkill(_skillPath: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] deleteSkill not yet implemented')
  return null
}

export async function bulkCopy(_items: BulkCopyItem[], _destination: string): Promise<BulkCopyResult | null> {
  console.warn('[Phase 1] bulkCopy not yet implemented')
  return null
}

export async function toggleSkill(_skillPath: string, _enabled: boolean): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] toggleSkill not yet implemented')
  return null
}

export async function getProjectSkills(projectPath: string): Promise<Skill[]> {
  console.warn('[Phase 1] getProjectSkills not yet implemented')
  return []
}
