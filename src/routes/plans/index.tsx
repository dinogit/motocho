import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { PlansPage } from '@/features/plans/page'
import type { Plan } from '@/shared/types/plans'

export const Route = createFileRoute('/plans/')({
  loader: async () => {
    const plans = await invoke<Plan[]>('get_plans')
    return { plans }
  },
  component: PlansPage,
})
