import { createFileRoute } from '@tanstack/react-router'
import { HookDetailPage } from '@/features/hooks/hook-detail-page'
import { HOOK_TYPES } from '@/features/hooks/lib/hooks-data'

export const Route = createFileRoute('/hooks/$id')({
  loader: ({ params }) => {
    const hook = HOOK_TYPES.find((h) => h.id === params.id)
    if (!hook) {
      throw new Error(`Hook not found: ${params.id}`)
    }
    return { hook }
  },
  component: HookDetailPage,
})