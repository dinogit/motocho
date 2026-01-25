import {
    Outlet,
    createRootRoute,
} from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar'
import { AppSidebar } from '@/shared/components/navigation/app-sidebar'
import {ThemeProvider} from "@/shared/components/effects/theme-provider.tsx";
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
    component: RootComponent,
})

function RootComponent() {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <Outlet />
                    <TanStackRouterDevtools
                        position="bottom-right"
                    />
                </SidebarInset>
            </ThemeProvider>
        </SidebarProvider>
    )
}