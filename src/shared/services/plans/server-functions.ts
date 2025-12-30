/**
 * Plan Server Functions
 *
 * Server-side functions for plan data access via TanStack Start.
 */

import { createServerFn } from '@tanstack/react-start'
import { findPlans, getPlan } from './plan-discovery'

/**
 * Get all plans
 */
export const getPlans = createServerFn({ method: 'GET' }).handler(async () => {
  return findPlans()
})

/**
 * Get a single plan by ID
 */
export const getPlanById = createServerFn({ method: 'GET' })
  .inputValidator((data: { planId: string }) => data)
  .handler(async ({ data }: { data: { planId: string } }) => {
    return getPlan(data.planId)
  })