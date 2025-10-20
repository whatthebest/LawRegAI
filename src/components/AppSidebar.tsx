
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
import { Moon, Sun, LogOut, FileText, Grid3x3, Zap } from "lucide-react";
import { BrandMark } from "./BrandMark";

const navLinks = [
  { href: "/summary-bot", label: "Summary file BOT (Beta)", icon: FileText },
  { href: "/integrated-hub", label: "Integrated Hub", icon: Grid3x3 },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const pathname = usePathname();

  const userInitials =
    user?.name ? user.name.split(" ").map((n) => n[0]).join("") : "U";

  const isLinkActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-3 font-bold text-lg group-data-[collapsible=icon]:hidden"
        >
          <BrandMark size="lg" icon={Zap} />
          <span className="text-base leading-snug">
            Compliance Standard Assurance
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
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
