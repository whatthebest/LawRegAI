
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Moon,
  Sun,
  LogOut,
  Bot,
  LayoutGrid,
  FilePlus2,
  ListChecks,
  CheckSquare,
  UserCog,
  FileText,
  FolderKanban,
  BookOpen,
  Cpu,
  Shield,
  ScrollText,
  Grid3x3,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/sops", label: "SOPs Management", icon: ListChecks },
  { href: "/summary-bot", label: "Summary file BOT (Beta)", icon: FileText },
  { href: "/create-sop/workflow-beta", label: "Create SOP Workflow (Beta)", icon: FilePlus2 },
  { href: "/tasks", label: "Project Tracker", icon: CheckSquare },
  { href: "/integrated-hub", label: "Integrated Hub", icon: Grid3x3 },
  { href: "/document-management", label: "Document Management", icon: FolderKanban, comingSoon: true },
  { href: "/policy-procedure", label: "Policy and Procedure", icon: ScrollText, comingSoon: true },
  { href: "/knowledge-base", label: "Knowledge Base Management", icon: BookOpen, comingSoon: true },
  { href: "/regtech-studio", label: "RegTech Studio", icon: Cpu, comingSoon: true },
  { href: "/compliance-risk-hub", label: "Compliance Risk Management Hub", icon: Shield, comingSoon: true },
  { href: "/admin", label: "Admin", icon: UserCog, roles: ["RegTechTeam"] },
];

export default function AppSidebar() {
  const { user, isLoading, logout } = useAuth();
  const { setTheme } = useTheme();
  const pathname = usePathname();

  const userInitials =
    user?.name ? user.name.split(" ").map((n) => n[0]).join("") : "U";

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === href;
    if (href === "/tasks")
      return pathname.startsWith(href) || pathname.startsWith("/projects");
    if (href === "/create-sop/workflow-beta")
      return pathname.startsWith("/create-sop/workflow-beta");
    if (href === "/sops")
      return (
        pathname.startsWith(href) ||
        (pathname.startsWith("/create-sop") && !pathname.startsWith("/create-sop/workflow-beta")) ||
        pathname.startsWith("/template-document")
      );
    return pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg group-data-[collapsible=icon]:hidden"
        >
          <Bot className="h-20 w-20 text-primary" />
          <span>Compliance Standard Assurance</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navLinks
            .filter((link) => {
              if (!link.roles) return true;
              const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
              const userRole = norm(user?.systemRole as string);
              return link.roles.some((r) => norm(r) === userRole);
            })
            .map((link) => (
              <SidebarMenuItem key={link.href}>
                {link.comingSoon ? (
                  <SidebarMenuButton className="justify-between" disabled>
                    <span className="inline-flex items-center gap-2">
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </span>
                    <SidebarMenuBadge>
                      <Badge
                        variant="outline"
                        className="border-destructive/40 bg-destructive/10 text-destructive px-2 py-[2px] text-[8px] leading-none translate-y-2.5"
                      >
                        Coming Soon
                      </Badge>
                    </SidebarMenuBadge>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={isLinkActive(link.href)}
                    tooltip={link.label}
                  >
                    <Link href={link.href}>
                      <span className="inline-flex items-center gap-2">
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:p-0">
        <div className="flex flex-col gap-2 p-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between">
            <span>Theme</span>
            <div>
              <Button variant="ghost" size="icon" onClick={() => setTheme("light")}>
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setTheme("dark")}>
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </div>
          </div>
        </div>

        <SidebarSeparator />

        <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src="https://placehold.co/100x100.png"
              alt={user?.name}
            />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col group-data-[collapsible=icon]:hidden flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto group-data-[collapsible=icon]:hidden"
            onClick={logout}
          >
            <LogOut />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
