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
  Wrench,
  Search,
  Plug,
  FolderOpen,
  FileText,
  FileClock,
  Sparkles,
  Bot,
  Settings,
  Terminal,
  Webhook,
  Package,
  ClipboardList,
} from "lucide-react"

import { NavMain, type NavItem } from "@/shared/components/navigation/nav-main"
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
    title: "Tools",
    url: "/claude-code",
    icon: Wrench,
  },
  {
    title: "MCP",
    url: "/mcp",
    icon: Plug,
  },
  {
    title: "Skills",
    url: "/skills",
    icon: Sparkles,
  },
  {
    title: "Agents",
    url: "/agents",
    icon: Bot,
  },
  {
    title: "Commands",
    url: "/commands",
    icon: Terminal,
  },
  {
    title: "Plugins",
    url: "/plugins",
    icon: Package,
  },
  {
    title: "Hooks",
    url: "/hooks",
    icon: Webhook,
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
]

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
        console.log("[AppSidebar] Nav items updated with projects")
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
                <span className="text-base font-semibold">Claude Code UI</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {/* Theme Selector */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span>Theme</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="mr-2 h-4 w-4" />
                  <span>System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          {/* Auth Status */}
          <SidebarMenuItem>
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}