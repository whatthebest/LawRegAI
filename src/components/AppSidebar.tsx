"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/create-sop", label: "Create SOP", icon: FilePlus2 },
  { href: "/sops", label: "View SOPs", icon: ListChecks },
  { href: "/tasks", label: "Project Tracker", icon: CheckSquare },
  { href: "/template-document", label: "Template Documents", icon: FileText },
  { href: "/admin", label: "Admin", icon: UserCog },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const pathname = usePathname();

  const userInitials =
    user?.name ? user.name.split(" ").map((n) => n[0]).join("") : "U";

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === href;
    if (href === "/tasks")
      return pathname.startsWith(href) || pathname.startsWith("/projects");
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
          {navLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              {/* IMPORTANT: asChild + exactly ONE child element */}
              <SidebarMenuButton
                asChild
                isActive={isLinkActive(link.href)}
                tooltip={link.label}
              >
                <Link href={link.href}>
                  {/* Wrap icon + text into ONE element so Slot sees a single child */}
                  <span className="inline-flex items-center gap-2">
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
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

          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
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
