import {
    PageDescription, PageHeader,
    PageHeaderContent,
    PageHeaderSeparator,
    PageTitle
} from "@/shared/components/page/page-header.tsx"
import { ContextOptimizationCard } from './components/context-optimization-card'

export function Page() {
    return (
        <>
            <PageHeader>
                <PageHeaderContent>
                    <PageTitle>
                        Tricks and Tips
                    </PageTitle>
                    <PageHeaderSeparator />
                    <PageDescription>
                        Useful tricks and tips for getting the most out of Claude Code.
                    </PageDescription>
                </PageHeaderContent>
            </PageHeader>
            <div className="flex flex-1 flex-col gap-6 p-6">
                <ContextOptimizationCard />
            </div>
        </>
    )
}