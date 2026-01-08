/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { UsageInfo } from './types'

export async function getUsageInfo(): Promise<UsageInfo | null> {
  console.warn('[Phase 1] getUsageInfo not yet implemented')
  return null
}
