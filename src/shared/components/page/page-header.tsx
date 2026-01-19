import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "@tanstack/react-router"
import { cn } from "@/shared/lib/utils.ts"
import { SidebarTrigger } from "@/shared/components/ui/sidebar.tsx"
import { Button } from "@/shared/components/ui/button.tsx"
// import { getUsageInfo } from "@/shared/services/usage/client"
const getUsageInfo: any = () => Promise.resolve({})
import { ArrowLeft, GaugeIcon } from "lucide-react"

function UsageIndicator() {
    const [threshold, setThreshold] = useState<number | null>(null)

    useEffect(() => {
        getUsageInfo().then((info: any) => {
            if (info) {
                setThreshold(info.tokenThreshold)
            }
        })
    }, [])

    if (threshold === null) return null

    const percentage = Math.round(threshold * 100)

    return (
        <div className="flex items-center gap-2 text-sm">
            <GaugeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Threshold:</span>
            <span className="font-medium">{percentage}%</span>
        </div>
    )
}

function PageHeader({ className, children, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="page-header"
            className={cn(
                "flex flex-row justify-between items-center gap-2 px-6 py-4 w-full border-b",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function PageHeaderContent({
    className,
    hideSidebarTrigger = false,
    showBackButton = false,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    hideSidebarTrigger?: boolean
    showBackButton?: boolean
}) {
    const router = useRouter()

    const handleBack = () => {
        router.history.back()
    }

    return (
        <div
            data-slot="page-header-content"
            className={cn("flex flex-row gap-2 items-center", className)}
            {...props}
        >
            {!showBackButton && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="h-8 w-8 p-0"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <PageHeaderSeparator />
                </>
            )}
            {!hideSidebarTrigger && (
                <>
                    <SidebarTrigger className="-ml-1" />
                    <PageHeaderSeparator />
                </>
            )}
            {children}
        </div>
    )
}

function PageHeaderSeparator({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="page-header-separator"
            className={cn("flex items-center self-stretch", className)}
            {...props}
        >
            <div className="bg-background flex items-start justify-center h-full px-2">
                <div className="h-full w-px bg-border dark:bg-border-dark" />
            </div>
        </div>
    )
}

function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
    return (
        <h1
            data-slot="page-title"
            className={cn(
                "text-base font-bold uppercase tracking-[0.24px] leading-4",
                className
            )}
            {...props}
        />
    )
}

function PageDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            data-slot="page-description"
            className={cn(
                "text-sm font-medium text-muted-foreground",
                className
            )}
            {...props}
        />
    )
}

function PageActions({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="page-actions"
            className={cn("flex flex-row gap-2 items-center", className)}
            {...props}
        />
    )
}

export {
    PageHeader,
    PageHeaderContent,
    PageHeaderSeparator,
    PageTitle,
    PageDescription,
    PageActions,
    UsageIndicator,
}