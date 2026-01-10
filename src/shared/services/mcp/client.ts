/**
 * TypeScript client for MCP Tauri commands
 * Communicates with src-tauri/src/commands/mcp.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { McpDashboardData, McpServerConfig, ProjectRef } from './types'

/**
 * Get all MCP configuration and plugin data
 */
export async function getMcpData(): Promise<McpDashboardData | null> {
  try {
    return await invoke<McpDashboardData>('get_mcp_data')
  } catch (error) {
    console.error('Failed to get MCP data:', error)
    return null
  }
}

/**
 * Check if an MCP server is reachable
 */
export async function checkServerStatus(url: string): Promise<{ online: boolean; error?: string }> {
  try {
    return await invoke<{ online: boolean; error?: string }>('check_server_status', { url })
  } catch (error) {
    console.error('Failed to check server status:', error)
    return { online: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Toggle an MCP server enabled/disabled for a project
 */
export async function toggleMcpServer(
  projectPath: string,
  serverName: string,
  enabled: boolean,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('toggle_mcp_server', {
      projectPath,
      serverName,
      enabled,
    })
  } catch (error) {
    console.error('Failed to toggle MCP server:', error)
    return null
  }
}

/**
 * Add an MCP server to a project
 */
export async function addMcpServer(
  projectPath: string,
  serverName: string,
  config: McpServerConfig,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('add_mcp_server', {
      projectPath,
      serverName,
      config,
    })
  } catch (error) {
    console.error('Failed to add MCP server:', error)
    return null
  }
}

/**
 * Copy an MCP server config from one project to another
 */
export async function copyMcpToProject(
  source: string,
  server: string,
  dest: string,
): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('copy_mcp_to_project', {
      sourceProject: source,
      serverName: server,
      destProject: dest,
    })
  } catch (error) {
    console.error('Failed to copy MCP to project:', error)
    return null
  }
}

/**
 * Get all projects from ~/.claude.json
 */
export async function getAllProjects(): Promise<ProjectRef[]> {
  try {
    return await invoke<ProjectRef[]>('get_all_projects')
  } catch (error) {
    console.error('Failed to get all projects:', error)
    return []
  }
}
