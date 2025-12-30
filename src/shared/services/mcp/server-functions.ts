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
        // Skip if no MCP servers configured
        if (!projectConfig.mcpServers || Object.keys(projectConfig.mcpServers).length === 0) {
          continue
        }

        const servers: McpServer[] = []

        for (const [serverName, serverConfig] of Object.entries(projectConfig.mcpServers)) {
          servers.push(parseServerConfig(serverName, serverConfig))

          // Track server usage
          const existing = serverUsage.get(serverName) || []
          existing.push(projectPath)
          serverUsage.set(serverName, existing)
        }

        projects.push({
          projectPath,
          projectName: getProjectName(projectPath),
          servers,
          contextUris: projectConfig.mcpContextUris || [],
          enabledServers: projectConfig.enabledMcpjsonServers || [],
          disabledServers: projectConfig.disabledMcpjsonServers || [],
        })
      }
    }

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