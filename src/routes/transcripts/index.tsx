import { createFileRoute } from '@tanstack/react-router'
import {Page} from "@/features/transcripts/page.tsx";

export const Route = createFileRoute('/transcripts/')({
    component: Page,
})

