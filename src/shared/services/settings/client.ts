/**
 * TypeScript client for settings Tauri commands
 * Communicates with src-tauri/src/commands/settings.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { SettingsDashboardData, ClaudeSettings, ProjectSettings } from './types'

/**
 * Get settings data (global and project-specific)
 */
export async function getSettingsData(projectPath?: string): Promise<SettingsDashboardData | null> {
  try {
    return await invoke<SettingsDashboardData>('get_settings_data', { project_path: projectPath })
  } catch (error) {
    console.error('Failed to get settings data:', error)
    return null
  }
}

/**
 * Update global settings
 */
export async function updateGlobalSettings(settings: ClaudeSettings): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('update_global_settings', { settings })
  } catch (error) {
    console.error('Failed to update global settings:', error)
    return null
  }
}

/**
 * Update project-specific settings
 */
export async function updateProjectSettings(
  projectPath: string,
  settings: ProjectSettings,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('update_project_settings', {
      project_path: projectPath,
      settings,
    })
  } catch (error) {
    console.error('Failed to update project settings:', error)
    return null
  }
}

/**
 * Set model for global or project scope
 */
export async function setModel(
  model: string,
  scope: string,
  projectPath?: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('set_model', {
      model,
      scope,
      project_path: projectPath,
    })
  } catch (error) {
    console.error('Failed to set model:', error)
    return null
  }
}

/**
 * Toggle thinking enabled for global or project scope
 */
export async function toggleThinking(
  enabled: boolean,
  scope: string,
  projectPath?: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('toggle_thinking', {
      enabled,
      scope,
      project_path: projectPath,
    })
  } catch (error) {
    console.error('Failed to toggle thinking:', error)
    return null
  }
}

/**
 * Clear model setting for global or project scope
 */
export async function clearModel(scope: string, projectPath?: string): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('clear_model', {
      scope,
      project_path: projectPath,
    })
  } catch (error) {
    console.error('Failed to clear model:', error)
    return null
  }
}
