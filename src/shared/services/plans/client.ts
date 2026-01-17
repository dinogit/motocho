/**
 * TypeScript client for plans Tauri commands
 * Communicates with src-tauri/src/commands/plans.rs
 */

import { invoke } from '@tauri-apps/api/core'
import type { Plan, PlanSummary } from '@/shared/types/plans'

/**
 * Get all plans from ~/.claude/plans/
 */
export async function getPlans(): Promise<PlanSummary[]> {
  try {
    const plans = await invoke<PlanSummary[]>('get_plans')
    return plans.map((p) => ({
      ...p,
      lastModified: new Date(p.lastModified),
    }))
  } catch (error) {
    console.error('Failed to get plans:', error)
    return []
  }
}

/**
 * Get a specific plan by ID
 */
export async function getPlanById(planId: string): Promise<Plan | null> {
  try {
    const plan = await invoke<Plan>('get_plan_by_id', { planId })
    return {
      ...plan,
      lastModified: new Date(plan.lastModified),
    }
  } catch (error) {
    console.error('Failed to get plan:', error)
    return null
  }
}
