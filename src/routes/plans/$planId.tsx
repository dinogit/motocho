import { createFileRoute } from '@tanstack/react-router'
import { PlanViewPage } from '@/features/plans/plan-view-page'
import { getPlanById } from '@/shared/services/plans/client'

export const Route = createFileRoute('/plans/$planId')({
  loader: async ({ params }) => {
    const plan = await getPlanById(params.planId)
    if (!plan) {
      throw new Error(`Plan not found: ${params.planId}`)
    }
    return { plan }
  },
  component: PlanViewPage,
})
