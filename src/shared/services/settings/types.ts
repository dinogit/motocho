/**
 * Claude Code Settings Types
 *
 * Settings are stored in:
 * - ~/.claude/settings.json - Global user settings
 * - {project}/.claude/settings.local.json - Project-specific settings
 *
 * Model options:
 * - opus, sonnet, haiku (shorthand)
 * - claude-opus-4-5-20251101, etc. (full model ID)
 */

export type ModelShorthand = 'opus' | 'sonnet' | 'haiku'

export interface ClaudeSettings {
  /** Model preference (shorthand or full ID) */
  model?: string
  /** Enable extended thinking by default */
  alwaysThinkingEnabled?: boolean
}

export interface ProjectSettings extends ClaudeSettings {
  /** Enabled MCP servers from .mcp.json */
  enabledMcpjsonServers?: string[]
  /** Disabled MCP servers from .mcp.json */
  disabledMcpjsonServers?: string[]
  /** Enable all project MCP servers automatically */
  enableAllProjectMcpServers?: boolean
}

export interface SettingsDashboardData {
  /** Global settings from ~/.claude/settings.json */
  globalSettings: ClaudeSettings
  /** Project settings from .claude/settings.local.json */
  projectSettings: ProjectSettings | null
  /** Current project path */
  currentProjectPath: string | null
  /** Available models */
  availableModels: ModelOption[]
}

export interface ModelOption {
  /** Shorthand (opus, sonnet, haiku) */
  shorthand: ModelShorthand
  /** Full model ID */
  fullId: string
  /** Display name */
  displayName: string
  /** Description */
  description: string
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    shorthand: 'opus',
    fullId: 'claude-opus-4-5-20251101',
    displayName: 'Claude Opus 4.5',
    description: 'Most capable, highest quality',
  },
  {
    shorthand: 'sonnet',
    fullId: 'claude-sonnet-4-5-20250929',
    displayName: 'Claude Sonnet 4.5',
    description: 'Balanced performance and speed',
  },
  {
    shorthand: 'haiku',
    fullId: 'claude-haiku-3-5-20241022',
    displayName: 'Claude Haiku 3.5',
    description: 'Fastest, most economical',
  },
]