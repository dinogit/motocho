/**
 * Application Sidebar
 *
 * Main navigation sidebar that includes:
 * - Static navigation items (Analytics, History, MCP, etc.)
 * - Dynamic project list loaded from ~/.claude/projects
 *
 * Projects are loaded on mount and displayed as a collapsible section.
 */

import * as React from "react"
import { useState, useEffect } from "react"
import { IconChartBar } from "@tabler/icons-react"
import {
  FlipVertical2,
  Search,
  FolderOpen,
  FileText,
  FileClock,
  Settings,
  BookOpen,
  Bot,
  ClipboardList,
  SunIcon,
  MoonIcon,
} from "lucide-react"

import { NavMain, type NavItem } from "@/shared/components/navigation/nav-main"
import { NavExplore } from "@/shared/components/navigation/nav-explore"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { getProjects } from "@/shared/services/transcripts/client"

import { invoke } from "@tauri-apps/api/core"
import { LogIn, User, ChevronUp, Moon, Sun, Monitor } from "lucide-react"
import type { Project } from "@/shared/types/transcripts.ts"
import { useTheme } from "@/shared/components/effects/theme-provider"
import { Swap, SwapOff, SwapOn } from "../ui/swap"

interface AuthStatus {
  authenticated: boolean
  email: string | null
  plan: string | null
  username: string | null
}

// Static navigation items
const staticNavItems: NavItem[] = [
  {
    title: "Analytics",
    url: "/analytics",
    icon: IconChartBar,
  },
  {
    title: "Transcripts",
    url: "/transcripts",
    icon: FlipVertical2,
  },
  {
    title: "Plans",
    url: "/plans",
    icon: FileText,
  },
  {
    title: "Prompt-History",
    url: "/history",
    icon: Search,
  },
  {
    title: "File History",
    url: "/files",
    icon: FileClock,
  },
  {
    title: "Documentation",
    url: "/docs",
    icon: BookOpen,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: ClipboardList,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [navItems, setNavItems] = useState<NavItem[]>(staticNavItems)
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const { setTheme } = useTheme()

  useEffect(() => {
    async function checkAuth() {
      try {
        const status = await invoke<AuthStatus>('get_auth_status')
        setAuthStatus(status)
      } catch (error) {
        console.error("[AppSidebar] Failed to check auth:", error)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = async () => {
    try {
      await invoke('trigger_claude_login')
      // Check auth status again after a delay
      setTimeout(async () => {
        const status = await invoke<AuthStatus>('get_auth_status')
        setAuthStatus(status)
      }, 5000)
    } catch (error) {
      console.error("[AppSidebar] Failed to trigger login:", error)
    }
  }

  useEffect(() => {
    async function loadProjects() {
      try {
        const projects = await getProjects()

        if (!projects || projects.length === 0) {
          console.log("[AppSidebar] No projects found")
          return
        }

        // Convert projects to nav sub-items
        const projectSubItems = projects.map((project: Project) => ({
          title: project.displayName,
          url: `/transcripts/${project.id}`,
        }))

        // Create the Projects nav item with sub-items
        const projectsNavItem: NavItem = {
          title: "Projects",
          url: "/transcripts",
          icon: FolderOpen,
          isActive: false,
          items: projectSubItems,
        }

        // Insert Projects after Transcripts (index 1)
        const newNavItems = [...staticNavItems]
        newNavItems.splice(2, 0, projectsNavItem)

        setNavItems(newNavItems)
      } catch (error) {
        console.error("[AppSidebar] Failed to load projects:", error)
        // Keep static nav items on error - this is safe fallback
      }
    }

    loadProjects()
  }, [])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <Bot className="!size-5" />
                <span className="text-base font-semibold">Motochō</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavExplore />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>

          <SidebarMenuItem className="flex flex-row justify-between space-x-4">

            {authStatus?.authenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <User className="h-4 w-4" />
                    <span className="truncate">
                      {authStatus.email || authStatus.username || "Logged in"}
                    </span>
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  {authStatus.plan && (
                    <>
                      <DropdownMenuItem disabled>
                        <span className="text-muted-foreground">Plan: {authStatus.plan}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLogin}>
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Re-authenticate</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton onClick={handleLogin}>
                <LogIn className="h-4 w-4" />
                <span>Login to Claude</span>
              </SidebarMenuButton>
            )}

            <Swap
              animation="rotate"
              className="size-8 rounded-lg border bg-muted/50 hover:bg-muted"
              onSwappedChange={(swapped) => {
                setTheme(swapped ? "dark" : "light")
              }}
            >
              <SwapOn>
                <SunIcon className="size-4" />
              </SwapOn>
              <SwapOff>
                <MoonIcon className="size-4" />
              </SwapOff>
            </Swap>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}