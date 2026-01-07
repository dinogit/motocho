/**
 * Settings Server Functions
 *
 * These functions manage Claude Code settings:
 * - ~/.claude/settings.json - Global settings
 * - {project}/.claude/settings.local.json - Project settings
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createServerFn } from '@tanstack/react-start'
import type {
  ClaudeSettings,
  ProjectSettings,
  SettingsDashboardData,
} from './types'
import { AVAILABLE_MODELS } from './types'

// ============================================================================
// Path Constants
// ============================================================================

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const GLOBAL_SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json')

// ============================================================================
// Helper Functions
// ============================================================================

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function getProjectSettingsPath(projectPath: string): string {
  return path.join(projectPath, '.claude', 'settings.local.json')
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get all settings data for the dashboard
 */
export const getSettingsData = createServerFn({ method: 'GET' })
  .inputValidator((d: { projectPath?: string }) => d)
  .handler(async ({ data }): Promise<SettingsDashboardData> => {
    const globalSettings = await readJsonFile<ClaudeSettings>(GLOBAL_SETTINGS_PATH) || {}

    let projectSettings: ProjectSettings | null = null
    if (data.projectPath) {
      const projectSettingsPath = getProjectSettingsPath(data.projectPath)
      projectSettings = await readJsonFile<ProjectSettings>(projectSettingsPath)
    }

    return {
      globalSettings,
      projectSettings,
      currentProjectPath: data.projectPath || null,
      availableModels: AVAILABLE_MODELS,
    }
  })

/**
 * Update global settings
 */
export const updateGlobalSettings = createServerFn({ method: 'POST' })
  .inputValidator((d: { settings: Partial<ClaudeSettings> }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const existing = await readJsonFile<ClaudeSettings>(GLOBAL_SETTINGS_PATH) || {}
      const updated = { ...existing, ...data.settings }

      // Remove undefined/null values
      for (const key of Object.keys(updated)) {
        if (updated[key as keyof ClaudeSettings] === undefined ||
            updated[key as keyof ClaudeSettings] === null) {
          delete updated[key as keyof ClaudeSettings]
        }
      }

      await writeJsonFile(GLOBAL_SETTINGS_PATH, updated)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      }
    }
  })

/**
 * Update project settings
 */
export const updateProjectSettings = createServerFn({ method: 'POST' })
  .inputValidator((d: { projectPath: string; settings: Partial<ProjectSettings> }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const settingsPath = getProjectSettingsPath(data.projectPath)
      const existing = await readJsonFile<ProjectSettings>(settingsPath) || {}
      const updated = { ...existing, ...data.settings }

      // Remove undefined/null values
      for (const key of Object.keys(updated)) {
        if (updated[key as keyof ProjectSettings] === undefined ||
            updated[key as keyof ProjectSettings] === null) {
          delete updated[key as keyof ProjectSettings]
        }
      }

      await writeJsonFile(settingsPath, updated)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project settings',
      }
    }
  })

/**
 * Set the model preference
 */
export const setModel = createServerFn({ method: 'POST' })
  .inputValidator((d: { model: string; scope: 'global' | 'project'; projectPath?: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      if (data.scope === 'global') {
        const existing = await readJsonFile<ClaudeSettings>(GLOBAL_SETTINGS_PATH) || {}
        existing.model = data.model
        await writeJsonFile(GLOBAL_SETTINGS_PATH, existing)
      } else if (data.projectPath) {
        const settingsPath = getProjectSettingsPath(data.projectPath)
        const existing = await readJsonFile<ProjectSettings>(settingsPath) || {}
        existing.model = data.model
        await writeJsonFile(settingsPath, existing)
      } else {
        return { success: false, error: 'Project path required for project scope' }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set model',
      }
    }
  })

/**
 * Toggle extended thinking
 */
export const toggleThinking = createServerFn({ method: 'POST' })
  .inputValidator((d: { enabled: boolean; scope: 'global' | 'project'; projectPath?: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      if (data.scope === 'global') {
        const existing = await readJsonFile<ClaudeSettings>(GLOBAL_SETTINGS_PATH) || {}
        existing.alwaysThinkingEnabled = data.enabled
        await writeJsonFile(GLOBAL_SETTINGS_PATH, existing)
      } else if (data.projectPath) {
        const settingsPath = getProjectSettingsPath(data.projectPath)
        const existing = await readJsonFile<ProjectSettings>(settingsPath) || {}
        existing.alwaysThinkingEnabled = data.enabled
        await writeJsonFile(settingsPath, existing)
      } else {
        return { success: false, error: 'Project path required for project scope' }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle thinking',
      }
    }
  })

/**
 * Clear model preference (use default)
 */
export const clearModel = createServerFn({ method: 'POST' })
  .inputValidator((d: { scope: 'global' | 'project'; projectPath?: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      if (data.scope === 'global') {
        const existing = await readJsonFile<ClaudeSettings>(GLOBAL_SETTINGS_PATH) || {}
        delete existing.model
        await writeJsonFile(GLOBAL_SETTINGS_PATH, existing)
      } else if (data.projectPath) {
        const settingsPath = getProjectSettingsPath(data.projectPath)
        const existing = await readJsonFile<ProjectSettings>(settingsPath) || {}
        delete existing.model
        await writeJsonFile(settingsPath, existing)
      } else {
        return { success: false, error: 'Project path required for project scope' }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear model',
      }
    }
  })