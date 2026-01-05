/**
 * MCP Server Functions
 *
 * These functions run on the server and read MCP configuration from:
 * 1. ~/.claude.json - Main Claude config with per-project MCP settings
 * 2. ~/.claude/plugins/marketplaces/ - Available MCP plugins
 *
 * The data flow:
 * 1. User configures MCP servers via Claude Code CLI or settings
 * 2. Config is saved to ~/.claude.json under projects.{path}.mcpServers
 * 3. This dashboard reads that config to display MCP status
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createServerFn } from '@tanstack/react-start'
import type {
  McpServer,
  McpServerConfig,
  ProjectMcpConfig,
  McpPlugin,
  McpDashboardData,
  McpStats,
} from './types'

// ============================================================================
// Path Constants
// ============================================================================

/** Main Claude configuration file */
const CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude.json')

/** Claude data directory */
const CLAUDE_DIR = path.join(os.homedir(), '.claude')

/** Marketplace plugins directory */
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins', 'marketplaces', 'claude-plugins-official', 'external_plugins')

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a short project name from full path
 * "/Users/john/projects/my-app" → "projects/my-app"
 */
function getProjectName(projectPath: string): string {
  const parts = projectPath.split('/').filter(Boolean)
  return parts.slice(-2).join('/')
}

/**
 * Convert raw MCP server config to typed McpServer
 * The config in .claude.json looks like:
 * {
 *   "figma": { "type": "http", "url": "https://..." },
 *   "local-tool": { "type": "stdio", "command": "node", "args": ["server.js"] }
 * }
 */
function parseServerConfig(name: string, config: McpServerConfig): McpServer {
  const base = { name }

  switch (config.type) {
    case 'http':
      return {
        ...base,
        type: 'http',
        url: config.url || '',
        headers: config.headers,
      }
    case 'sse':
      return {
        ...base,
        type: 'sse',
        url: config.url || '',
      }
    case 'stdio':
      return {
        ...base,
        type: 'stdio',
        command: config.command || '',
        args: config.args,
        env: config.env,
      }
    default:
      // Default to HTTP if type is missing
      return {
        ...base,
        type: 'http',
        url: config.url || '',
      }
  }
}

/**
 * Format plugin ID to display name
 * "context7" → "Context7"
 * "laravel-boost" → "Laravel Boost"
 */
function formatPluginName(id: string): string {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ============================================================================
// Data Reading Functions
// ============================================================================

/**
 * Read the main Claude configuration file
 * This contains all user settings including per-project MCP configs
 */
async function readClaudeConfig(): Promise<Record<string, unknown> | null> {
  try {
    const content = await fs.promises.readFile(CLAUDE_CONFIG_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Read MCP plugin configuration from marketplace
 * Each plugin has a .mcp.json file with server configuration
 */
async function readPluginConfig(pluginId: string): Promise<Record<string, McpServerConfig> | null> {
  try {
    const configPath = path.join(PLUGINS_DIR, pluginId, '.mcp.json')
    const content = await fs.promises.readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Read project-level .mcp.json file
 * Projects can have their own .mcp.json with server configurations
 */
async function readProjectMcpJson(projectPath: string): Promise<Record<string, McpServerConfig> | null> {
  try {
    const configPath = path.join(projectPath, '.mcp.json')
    const content = await fs.promises.readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content)
    // .mcp.json has structure: { mcpServers: { ... } }
    return parsed.mcpServers || null
  } catch {
    return null
  }
}

// ============================================================================
// Server Functions (exposed to client)
// ============================================================================

/**
 * Get all MCP data for the dashboard
 *
 * This is the main entry point that aggregates:
 * - Per-project MCP configurations
 * - Available marketplace plugins
 * - Global MCP servers
 * - Usage statistics
 */
export const getMcpData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<McpDashboardData> => {
    const config = await readClaudeConfig()

    // Track which servers are used across projects
    const serverUsage = new Map<string, string[]>()

    // Collect ALL projects for destination dropdown
    const allProjects: Array<{ path: string; name: string }> = []

    // ========================================================================
    // Parse per-project MCP configurations
    // ========================================================================
    const projects: ProjectMcpConfig[] = []

    if (config?.projects && typeof config.projects === 'object') {
      const projectsConfig = config.projects as Record<string, {
        mcpServers?: Record<string, McpServerConfig>
        mcpContextUris?: string[]
        enabledMcpjsonServers?: string[]
        disabledMcpjsonServers?: string[]
      }>

      for (const [projectPath, projectConfig] of Object.entries(projectsConfig)) {
        // Skip home directory for allProjects
        if (projectPath !== os.homedir()) {
          allProjects.push({ path: projectPath, name: getProjectName(projectPath) })
        }

        const servers: McpServer[] = []
        const disabledServers = projectConfig.disabledMcpjsonServers || []

        // Add servers from ~/.claude.json mcpServers
        if (projectConfig.mcpServers) {
          for (const [serverName, serverConfig] of Object.entries(projectConfig.mcpServers)) {
            servers.push(parseServerConfig(serverName, serverConfig))

            // Track server usage
            const existing = serverUsage.get(serverName) || []
            existing.push(projectPath)
            serverUsage.set(serverName, existing)
          }
        }

        // Also read from project's .mcp.json file
        const projectMcpJson = await readProjectMcpJson(projectPath)
        if (projectMcpJson) {
          for (const [serverName, serverConfig] of Object.entries(projectMcpJson)) {
            // Skip if already added from ~/.claude.json
            if (servers.some(s => s.name === serverName)) continue

            const server = parseServerConfig(serverName, serverConfig)
            server.fromMcpJson = true
            server.disabled = disabledServers.includes(serverName)
            servers.push(server)

            // Track server usage
            const existing = serverUsage.get(serverName) || []
            existing.push(projectPath)
            serverUsage.set(serverName, existing)
          }
        }

        // Skip if no MCP servers configured (for main list)
        if (servers.length === 0) {
          continue
        }

        projects.push({
          projectPath,
          projectName: getProjectName(projectPath),
          servers,
          contextUris: projectConfig.mcpContextUris || [],
          enabledServers: projectConfig.enabledMcpjsonServers || [],
          disabledServers,
        })
      }
    }

    // Sort allProjects
    allProjects.sort((a, b) => a.name.localeCompare(b.name))

    // ========================================================================
    // Parse global MCP servers (configured at home directory level)
    // ========================================================================
    const globalServers: McpServer[] = []

    if (config?.projects && typeof config.projects === 'object') {
      const homeConfig = (config.projects as Record<string, {
        mcpServers?: Record<string, McpServerConfig>
      }>)[os.homedir()]

      if (homeConfig?.mcpServers) {
        for (const [serverName, serverConfig] of Object.entries(homeConfig.mcpServers)) {
          globalServers.push(parseServerConfig(serverName, serverConfig))
        }
      }
    }

    // ========================================================================
    // Read available marketplace plugins
    // ========================================================================
    const plugins: McpPlugin[] = []

    try {
      const pluginDirs = await fs.promises.readdir(PLUGINS_DIR, { withFileTypes: true })

      for (const dir of pluginDirs) {
        if (!dir.isDirectory()) continue

        const pluginId = dir.name
        const serverConfig = await readPluginConfig(pluginId)

        if (serverConfig) {
          // Check if this plugin is installed in any project
          const activeProjects = serverUsage.get(pluginId) || []

          plugins.push({
            id: pluginId,
            name: formatPluginName(pluginId),
            serverConfig,
            isInstalled: activeProjects.length > 0,
            activeInProjects: activeProjects.map(getProjectName),
          })
        }
      }
    } catch {
      // Plugins directory might not exist
    }

    // ========================================================================
    // Calculate statistics
    // ========================================================================
    const stats: McpStats = {
      totalServers: serverUsage.size + globalServers.length,
      projectsWithMcp: projects.length,
      availablePlugins: plugins.length,
      installedPlugins: plugins.filter(p => p.isInstalled).length,
      topServers: Array.from(serverUsage.entries())
        .map(([name, projects]) => ({ name, projectCount: projects.length }))
        .sort((a, b) => b.projectCount - a.projectCount)
        .slice(0, 5),
    }

    return {
      projects,
      allProjects,
      plugins,
      globalServers,
      stats,
    }
  }
)

/**
 * Check if an HTTP MCP server is online
 *
 * This makes a lightweight request to the server to check connectivity.
 * Note: Some servers require authentication, so we just check for any response.
 */
export const checkServerStatus = createServerFn({ method: 'GET' })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }): Promise<{ online: boolean; error?: string }> => {
    try {
      // Use AbortController for timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      await fetch(data.url, {
        method: 'HEAD', // Lightweight request
        signal: controller.signal,
      })

      clearTimeout(timeout)

      // Any response (even 401/403) means server is online
      return { online: true }
    } catch (error) {
      return {
        online: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  })

// ============================================================================
// Write Functions (modify ~/.claude.json)
// ============================================================================

/**
 * Helper to read and write Claude config safely
 */
async function writeClaudeConfig(config: Record<string, unknown>): Promise<void> {
  await fs.promises.writeFile(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Toggle an MCP server enabled/disabled for a project
 *
 * Uses disabledMcpjsonServers array in ~/.claude.json
 */
export const toggleMcpServer = createServerFn({ method: 'POST' })
  .inputValidator((d: { projectPath: string; serverName: string; enabled: boolean }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { projectPath, serverName, enabled } = data

    try {
      const config = await readClaudeConfig()
      if (!config) {
        return { success: false, error: 'Could not read Claude config' }
      }

      // Ensure projects structure exists
      if (!config.projects || typeof config.projects !== 'object') {
        return { success: false, error: 'No projects in config' }
      }

      const projects = config.projects as Record<string, Record<string, unknown>>
      if (!projects[projectPath]) {
        return { success: false, error: 'Project not found in config' }
      }

      const projectConfig = projects[projectPath]
      const disabledServers = (projectConfig.disabledMcpjsonServers as string[]) || []

      if (enabled) {
        // Remove from disabled list
        projectConfig.disabledMcpjsonServers = disabledServers.filter(s => s !== serverName)
      } else {
        // Add to disabled list
        if (!disabledServers.includes(serverName)) {
          projectConfig.disabledMcpjsonServers = [...disabledServers, serverName]
        }
      }

      await writeClaudeConfig(config)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle server',
      }
    }
  })

/**
 * Add a new MCP server to a project
 */
export const addMcpServer = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    projectPath: string
    serverName: string
    serverConfig: McpServerConfig
  }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { projectPath, serverName, serverConfig } = data

    try {
      const config = await readClaudeConfig()
      if (!config) {
        return { success: false, error: 'Could not read Claude config' }
      }

      // Ensure projects structure exists
      if (!config.projects || typeof config.projects !== 'object') {
        config.projects = {}
      }

      const projects = config.projects as Record<string, Record<string, unknown>>
      if (!projects[projectPath]) {
        projects[projectPath] = {}
      }

      const projectConfig = projects[projectPath]
      if (!projectConfig.mcpServers || typeof projectConfig.mcpServers !== 'object') {
        projectConfig.mcpServers = {}
      }

      const mcpServers = projectConfig.mcpServers as Record<string, McpServerConfig>

      // Check if server already exists
      if (mcpServers[serverName]) {
        return { success: false, error: `Server "${serverName}" already exists` }
      }

      // Add the server
      mcpServers[serverName] = serverConfig

      await writeClaudeConfig(config)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add server',
      }
    }
  })

/**
 * Copy an MCP server configuration to another project
 */
export const copyMcpToProject = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    sourceProject: string
    serverName: string
    destinationProject: string
  }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { sourceProject, serverName, destinationProject } = data

    try {
      const config = await readClaudeConfig()
      if (!config) {
        return { success: false, error: 'Could not read Claude config' }
      }

      const projects = config.projects as Record<string, Record<string, unknown>>
      if (!projects) {
        return { success: false, error: 'No projects in config' }
      }

      // Get source server config
      const sourceConfig = projects[sourceProject]
      if (!sourceConfig?.mcpServers) {
        return { success: false, error: 'Source project has no MCP servers' }
      }

      const sourceMcpServers = sourceConfig.mcpServers as Record<string, McpServerConfig>
      const serverToCopy = sourceMcpServers[serverName]
      if (!serverToCopy) {
        return { success: false, error: `Server "${serverName}" not found in source project` }
      }

      // Ensure destination project exists
      if (!projects[destinationProject]) {
        projects[destinationProject] = {}
      }

      const destConfig = projects[destinationProject]
      if (!destConfig.mcpServers || typeof destConfig.mcpServers !== 'object') {
        destConfig.mcpServers = {}
      }

      const destMcpServers = destConfig.mcpServers as Record<string, McpServerConfig>

      // Check if server already exists at destination
      if (destMcpServers[serverName]) {
        return { success: false, error: `Server "${serverName}" already exists in destination` }
      }

      // Copy the server config
      destMcpServers[serverName] = { ...serverToCopy }

      await writeClaudeConfig(config)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to copy server',
      }
    }
  })

/**
 * Get all projects for destination dropdown
 */
export const getAllProjects = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<{ path: string; name: string }>> => {
    const config = await readClaudeConfig()
    const allProjects: Array<{ path: string; name: string }> = []

    if (config?.projects && typeof config.projects === 'object') {
      for (const projectPath of Object.keys(config.projects)) {
        // Skip home directory
        if (projectPath === os.homedir()) continue
        allProjects.push({
          path: projectPath,
          name: getProjectName(projectPath),
        })
      }
    }

    return allProjects.sort((a, b) => a.name.localeCompare(b.name))
  }
)