
import type { ReactNode } from 'react'
import {
    Outlet,
    createRootRoute,
    HeadContent,
    Scripts,
} from '@tanstack/react-router'
import globalCss from "@/shared/styles/globals.css?url";
import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar'
import { AppSidebar } from '@/shared/components/navigation/app-sidebar'

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'Claude Code Dashboard',
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: globalCss,
            },
        ]
    }),
    component: RootComponent,
})

function RootComponent() {
    return (
        <RootDocument>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <Outlet />
                </SidebarInset>
            </SidebarProvider>

        </RootDocument>
    )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html>
        <head>
            <HeadContent />
        </head>
        <body>
        {children}
        <Scripts />
        </body>
        </html>
    )
}