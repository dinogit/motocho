import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/plans/$planId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/plans/$planId"!</div>
}
