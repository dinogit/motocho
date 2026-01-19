/**
 * Plans List Page
 *
 * Lists all Claude Code plans stored in ~/.claude/plans/
 */

import { Link } from '@tanstack/react-router'
import { FileText, Calendar, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Route } from '@/routes/plans/index'
import type { PlanSummary } from '@/shared/types/plans'

export function PlansPage() {
  const { plans } = Route.useLoaderData() as { plans: PlanSummary[] }

  return (
    <div className="flex flex-1 flex-col">
      <div className="max-w-full mx-auto w-full p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Plans</h1>
          <p className="text-muted-foreground">
            View implementation plans created by Claude Code.
          </p>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No plans found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Plans are created when you use Claude Code's planning mode.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {plans.map((plan) => (
              <Link key={plan.id} to="/plans/$planId" params={{ planId: plan.id }}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-chart-1" />
                          {plan.title}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {plan.overview}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(plan.lastModified).toLocaleDateString()} at{' '}
                        {new Date(plan.lastModified).toLocaleTimeString()}
                      </span>
                      <span className="font-mono">{plan.id}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}