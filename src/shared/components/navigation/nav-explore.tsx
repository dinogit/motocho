import {
  Wrench,
  Plug,
  Sparkles,
  Bot,
  Terminal,
  Package,
  Webhook,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../ui/sidebar";

const links: { title: string; url: string; icon: LucideIcon }[] = [
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
];

export function NavExplore() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Explore</SidebarGroupLabel>
      <SidebarMenu>
        {links.map((link) => (
          <SidebarMenuItem key={link.url}>
            <SidebarMenuButton asChild tooltip={link.title}>
              <Link to={link.url}>
                <link.icon className="size-4" />
                <span>{link.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}