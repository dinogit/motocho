/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { McpDashboardData, McpServerConfig, ProjectRef } from './types'

export async function getMcpData(): Promise<McpDashboardData | null> {
  console.warn('[Phase 1] getMcpData not yet implemented')
  return null
}

export async function checkServerStatus(_url: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] checkServerStatus not yet implemented')
  return null
}

export async function toggleMcpServer(_projectPath: string, _serverName: string, _enabled: boolean): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] toggleMcpServer not yet implemented')
  return null
}

export async function addMcpServer(_projectPath: string, _serverName: string, _config: McpServerConfig): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] addMcpServer not yet implemented')
  return null
}

export async function copyMcpToProject(_source: string, _server: string, _dest: string): Promise<Record<string, unknown> | null> {
  console.warn('[Phase 1] copyMcpToProject not yet implemented')
  return null
}

export async function getAllProjects(): Promise<ProjectRef[]> {
  console.warn('[Phase 1] getAllProjects not yet implemented')
  return []
}
