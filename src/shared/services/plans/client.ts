/**
 * Stub client for Phase 1 - will be implemented with Tauri commands in Phase 2
 */
import type { Plan } from './types'

export async function getPlans(): Promise<Plan[]> {
  console.warn('[Phase 1] getPlans not yet implemented')
  return []
}

export async function getPlanById(_planId: string): Promise<Plan | null> {
  console.warn('[Phase 1] getPlanById not yet implemented')
  return null
}
