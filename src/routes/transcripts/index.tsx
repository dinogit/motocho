import { createFileRoute } from '@tanstack/react-router'
import {getProjects} from "@/shared/services/transcripts/server-functions.ts";
import {Page} from "@/features/transcripts/page.tsx";

export const Route = createFileRoute('/transcripts/')({
    loader: () => getProjects(),
    component: Page,
})

