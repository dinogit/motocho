/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { SettingsDashboardData, ClaudeSettings, ProjectSettings } from './types'

export async function getSettingsData(_projectPath?: string): Promise<SettingsDashboardData | null> {
  console.warn('[Phase 1] getSettingsData not yet implemented')
  return null
}

export async function updateGlobalSettings(_settings: ClaudeSettings): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] updateGlobalSettings not yet implemented')
  return null
}

export async function updateProjectSettings(_projectPath: string, _settings: ProjectSettings): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] updateProjectSettings not yet implemented')
  return null
}

export async function setModel(_model: string, _scope: string, _projectPath?: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] setModel not yet implemented')
  return null
}

export async function toggleThinking(_enabled: boolean, _scope: string, _projectPath?: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] toggleThinking not yet implemented')
  return null
}

export async function clearModel(_scope: string, _projectPath?: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] clearModel not yet implemented')
  return null
}
