import { createFileRoute } from '@tanstack/react-router'
import {Page} from "@/features/projects/page.tsx";
import {getProjectSessions} from "@/shared/services/transcripts/server-functions.ts";

export const Route = createFileRoute('/transcripts/$projectId')({
  loader: ({ params }) => getProjectSessions({ data: params.projectId }),
  component: Page,
})