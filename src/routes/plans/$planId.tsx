import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { PlanViewPage } from '@/features/plans/plan-view-page'
import type { Plan } from '@/shared/types/plans'

export const Route = createFileRoute('/plans/$planId')({
  loader: async ({ params }) => {
    const plan = await invoke<Plan | null>('get_plan_by_id', { planId: params.planId })
    if (!plan) {
      throw new Error(`Plan not found: ${params.planId}`)
    }
    return { plan }
  },
  component: PlanViewPage,
})
