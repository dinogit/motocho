export interface Skill {
  name: string
  description: string
  content: string
  path: string
  enabled: boolean
}

export interface ProjectSkillsConfig {
  projectPath: string
  projectName: string
  claudeMd: string | null
  skills: Skill[]
}

export interface ProjectRef {
  path: string
  name: string
}

export interface SkillsStats {
  totalProjects: number
  projectsWithClaudeMd: number
  projectsWithSkills: number
  totalSkills: number
}

export interface SkillsDashboardData {
  projects: ProjectSkillsConfig[]
  allProjects: ProjectRef[]
  stats: SkillsStats
}

export interface BulkCopyItem {
  type: 'skill' | 'claude_md'
  source: string
  sourceProject: string
}

export interface BulkCopyResult {
  copiedCount: number
  failedItems: string[]
}