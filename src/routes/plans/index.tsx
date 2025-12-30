import { createFileRoute } from '@tanstack/react-router'
import { PlansPage } from '@/features/plans/page'
import { getPlans } from '@/shared/services/plans/server-functions'

export const Route = createFileRoute('/plans/')({
  loader: async () => {
    const plans = await getPlans()
    return { plans }
  },
  component: PlansPage,
})
