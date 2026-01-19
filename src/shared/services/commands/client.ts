import { invoke } from '@tauri-apps/api/core'
import type { CommandsDashboardData } from '@/shared/types/commands'

/**
 * Tauri command name for fetching commands data
 */
const GET_COMMANDS_DATA = 'get_commands_data'

/**
 * Fetches all available commands data from the Rust backend
 */
export async function getCommandsData(): Promise<CommandsDashboardData | null> {
  try {
    const data = await invoke<CommandsDashboardData>(GET_COMMANDS_DATA)
    return data
  } catch (error) {
    console.error('Failed to get commands data:', error)
    return null
  }
}

/**
 * Fetches commands data with error details
 */
export async function getCommandsDataWithError(): Promise<{
  data: CommandsDashboardData | null
  error: string | null
}> {
  try {
    const data = await invoke<CommandsDashboardData>(GET_COMMANDS_DATA)
    return { data, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { data: null, error: errorMessage }
  }
}