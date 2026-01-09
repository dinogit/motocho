import { createFileRoute } from '@tanstack/react-router'
import {getProjects} from "@/shared/services/transcripts/client";
import {Page} from "@/features/transcripts/page.tsx";

export const Route = createFileRoute('/transcripts/')({
    loader: () => getProjects(),
    component: Page,
})

