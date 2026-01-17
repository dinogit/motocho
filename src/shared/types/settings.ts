export interface ClaudeSettings {
  model?: string
  thinking?: boolean
  [key: string]: any
}

export interface ProjectSettings {
  model?: string
  thinking?: boolean
  [key: string]: any
}

export interface SettingsDashboardData {
  global: ClaudeSettings
  projects: Record<string, ProjectSettings>
  allProjects: { path: string; name: string }[]
}