'use client'

import { Link } from '@tanstack/react-router'
import { Webhook, ArrowRight } from 'lucide-react'
import {
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from '@/shared/components/page/page-header'
import { Badge } from '@/shared/components/ui/badge'
import { HOOK_TYPES } from './lib/hooks-data'

export function Page() {
  return (
    <div className="space-y-8">
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Hooks</PageTitle>
          <PageDescription>
            Extend Claude Code with custom scripts at key lifecycle points
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-6">
        {HOOK_TYPES.map((hook) => (
          <Link
            key={hook.id}
            to={"/hooks/$id"}
            params={{ id: hook.id }}
            className="group border rounded-lg p-5 hover:border-primary/50 hover:bg-muted/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
             <div className="flex flex-row space-x-2">
                 <Webhook className="h-5 w-5 text-chart-1" />
                 <h3 className="font-semibold mb-1">{hook.name}</h3>
             </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>


            <p className="text-sm text-muted-foreground mb-3">{hook.trigger}</p>

            <Badge variant="secondary" className="text-xs">
              {hook.event}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}
