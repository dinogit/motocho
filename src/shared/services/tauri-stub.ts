/**
 * Temporary stub for Phase 1 - will be replaced with proper Tauri client implementation in Phase 2-4
 * This allows the app to compile and launch without the removed server-functions dependencies
 */

export async function stubCall(funcName: string, args?: unknown): Promise<unknown> {
  throw new Error(
    `[Phase 1 Stub] ${funcName} not yet implemented. Will be implemented in Phase 2-4 with Tauri commands.`
  )
}

// Generic stub functions
export const getAnalyticsData = () => stubCall('getAnalyticsData')
export const getAnalyticsSummary = () => stubCall('getAnalyticsSummary')
export const getHistory = () => stubCall('getHistory')
export const searchHistory = () => stubCall('searchHistory')
export const getProjects = () => stubCall('getProjects')
export const getProjectSessions = () => stubCall('getProjectSessions')
export const getSessionDetails = () => stubCall('getSessionDetails')
export const getPlans = () => stubCall('getPlans')
export const getPlan = () => stubCall('getPlan')
export const getAllFileChanges = () => stubCall('getAllFileChanges')
export const getMcpData = () => stubCall('getMcpData')
export const getSettingsData = () => stubCall('getSettingsData')
export const getSkillsData = () => stubCall('getSkillsData')
export const listLibrarySkills = () => stubCall('listLibrarySkills')
export const getUsageInfo = () => stubCall('getUsageInfo')
