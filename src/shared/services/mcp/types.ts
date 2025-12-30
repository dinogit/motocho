/**
 * MCP (Model Context Protocol) Types
 *
 * MCP is a protocol that allows Claude to connect to external services/tools.
 * Servers can be:
 * - HTTP: REST-like endpoints (e.g., https://mcp.figma.com/mcp)
 * - SSE: Server-Sent Events for streaming
 * - stdio: Local process communication
 *
 * Configuration is stored in:
 * - ~/.claude.json → per-project server configs
 * - ~/.claude/plugins/ → marketplace plugins with .mcp.json files
 */

// ============================================================================
// MCP Server Configuration Types
// ============================================================================

/**
 * Base configuration for all MCP server types
 */
interface McpServerBase {
  /** Human-readable name (derived from config key) */
  name: string
}

/**
 * HTTP-based MCP server (most common for cloud services)
 * Example: Figma, Sentry, GitHub Copilot
 */
export interface HttpMcpServer extends McpServerBase {
  type: 'http'
  /** Full URL to the MCP endpoint */
  url: string
  /** Optional HTTP headers (often contains auth tokens) */
  headers?: Record<string, string>
}

/**
 * Server-Sent Events MCP server (for streaming responses)
 */
export interface SseMcpServer extends McpServerBase {
  type: 'sse'
  /** SSE endpoint URL */
  url: string
}

/**
 * Standard I/O MCP server (local process)
 * Used for local tools like file system access, shell commands
 */
export interface StdioMcpServer extends McpServerBase {
  type: 'stdio'
  /** Command to execute */
  command: string
  /** Command arguments */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
}

/**
 * Union of all MCP server types
 */
export type McpServer = HttpMcpServer | SseMcpServer | StdioMcpServer

/**
 * MCP server with runtime status information
 */
export type McpServerWithStatus = McpServer & {
  /** Whether the server is currently reachable */
  status: 'online' | 'offline' | 'unknown'
  /** Last time status was checked */
  lastChecked?: Date
  /** Error message if offline */
  error?: string
}

// ============================================================================
// Project Configuration Types
// ============================================================================

/**
 * Per-project MCP configuration from ~/.claude.json
 */
export interface ProjectMcpConfig {
  /** Project directory path */
  projectPath: string
  /** Short project name (last 2 path segments) */
  projectName: string
  /** MCP servers configured for this project */
  servers: McpServer[]
  /** MCP context URIs (resources the project can access) */
  contextUris: string[]
  /** Enabled MCP JSON servers */
  enabledServers: string[]
  /** Disabled MCP JSON servers */
  disabledServers: string[]
}

// ============================================================================
// Marketplace Plugin Types
// ============================================================================

/**
 * MCP plugin from the Claude marketplace
 * Located in ~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/
 */
export interface McpPlugin {
  /** Plugin identifier (folder name) */
  id: string
  /** Display name */
  name: string
  /** Plugin description (if available) */
  description?: string
  /** Server configuration from .mcp.json */
  serverConfig: Record<string, McpServerConfig>
  /** Whether this plugin is installed/configured in any project */
  isInstalled: boolean
  /** Projects where this plugin is active */
  activeInProjects: string[]
}

/**
 * Raw server config from .mcp.json files
 */
export interface McpServerConfig {
  type: 'http' | 'sse' | 'stdio'
  url?: string
  command?: string
  args?: string[]
  headers?: Record<string, string>
  env?: Record<string, string>
}

// ============================================================================
// MCP Tool Call Types (from transcripts)
// ============================================================================

/**
 * Record of an MCP tool being called during a conversation
 */
export interface McpToolCall {
  /** Tool name (e.g., "mcp-figma-get_design_context") */
  toolName: string
  /** MCP server that handled this call */
  serverName: string
  /** When the call was made */
  timestamp: Date
  /** Project where the call occurred */
  projectPath: string
  /** Session ID */
  sessionId: string
  /** Whether the call succeeded */
  success: boolean
}

// ============================================================================
// Dashboard Data Types
// ============================================================================

/**
 * Complete MCP data for the dashboard
 */
export interface McpDashboardData {
  /** All project MCP configurations */
  projects: ProjectMcpConfig[]
  /** Available marketplace plugins */
  plugins: McpPlugin[]
  /** Global MCP servers (configured at ~ level) */
  globalServers: McpServer[]
  /** Statistics */
  stats: McpStats
}

/**
 * MCP usage statistics
 */
export interface McpStats {
  /** Total configured servers across all projects */
  totalServers: number
  /** Number of projects with MCP configured */
  projectsWithMcp: number
  /** Number of available marketplace plugins */
  availablePlugins: number
  /** Number of installed/active plugins */
  installedPlugins: number
  /** Most used servers */
  topServers: { name: string; projectCount: number }[]
}