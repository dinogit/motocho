/**
 * Command types for the Commands Dashboard
 * Represents all available CLI commands with full details
 */

export interface CommandParameter {
  name: string
  type: string
  required: boolean
  description: string
  example?: string
}

export interface CommandExample {
  title: string
  description: string
  command: string
  expectedOutput?: string
}

export interface CommandUseCase {
  title: string
  description: string
  when: string
}

export interface Command {
  id: string
  name: string
  shortName: string // e.g., "clean_gone" for the display
  category: 'git' | 'development' | 'review' | 'design' | 'planning'
  description: string
  fullDescription: string
  icon: string // lucide icon name
  color: 'sky' | 'amber' | 'emerald' | 'violet' | 'rose' | 'cyan' | 'orange' | 'pink'

  // Usage details
  usage: string // How to run it
  parameters?: CommandParameter[]

  // Documentation
  examples: CommandExample[]
  useCases: CommandUseCase[]

  // Integration info
  requirements?: string[]
  relatedCommands?: string[]
  links?: {
    documentation?: string
    github?: string
  }

  // Status
  installed: boolean
  available: boolean
}

export interface CommandCategory {
  id: 'git' | 'development' | 'review' | 'design' | 'planning'
  name: string
  description: string
  icon: string
  color: string
  commandIds: string[]
}

export interface CommandsDashboardData {
  commands: Command[]
  categories: CommandCategory[]
  totalCommands: number
  installedCount: number
  lastUpdated: string
}