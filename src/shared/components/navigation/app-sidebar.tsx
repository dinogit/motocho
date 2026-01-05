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
  Sparkles, Workflow,
} from "lucide-react"

import { NavMain, type NavItem } from "@/shared/components/navigation/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar"
import { getProjects } from "@/shared/services/transcripts/server-functions"
import type { Project } from "@/shared/services/transcripts/types"

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
    title: "History",
    url: "/history",
    icon: Search,
  },
  {
    title: "File History",
    url: "/files",
    icon: FileClock,
  },
  {
    title: "Claude Code Tools",
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
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [navItems, setNavItems] = useState<NavItem[]>(staticNavItems)

  useEffect(() => {
    async function loadProjects() {
      try {
        const projects = await getProjects()

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
        console.error("Failed to load projects:", error)
        // Keep static nav items on error
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
                <Workflow className="!size-5" />
                <span className="text-base font-semibold">CC Workflow</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
    </Sidebar>
  )
}