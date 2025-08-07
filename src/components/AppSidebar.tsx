
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
import { Moon, Sun, LogOut, Bot, LayoutGrid, FilePlus2, ListChecks, CheckSquare, UserCog } from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/create-sop", label: "Create SOP", icon: FilePlus2 },
  { href: "/sops", label: "View SOPs", icon: ListChecks },
  { href: "/tasks", label: "Work Tracker", icon: CheckSquare },
  { href: "/admin", label: "Admin", icon: UserCog },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const pathname = usePathname();

  const userInitials = user?.name.split(' ').map(n => n[0]).join('') || 'U';

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 font-bold text-lg group-data-[collapsible=icon]:hidden">
          <Bot className="h-6 w-6 text-primary" />
          <span>SOP Central</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navLinks.map(link => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} passHref legacyBehavior>
                 <SidebarMenuButton 
                  isActive={link.href === '/' ? pathname === link.href : pathname.startsWith(link.href)}
                  tooltip={link.label}
                 >
                    <link.icon/>
                    <span>{link.label}</span>
                  </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:p-0">
        <div className="flex flex-col gap-2 p-2 group-data-[collapsible=icon]:hidden">
           <div className="flex items-center justify-between">
              <span>Theme</span>
              <div>
                  <Button variant="ghost" size="icon" onClick={() => setTheme("light")}><Sun className="h-[1.2rem] w-[1.2rem]"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => setTheme("dark")}><Moon className="h-[1.2rem] w-[1.2rem]"/></Button>
              </div>
          </div>
        </div>

        <SidebarSeparator />
        
        <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://placehold.co/100x100.png`} alt={user?.name} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto group-data-[collapsible=icon]:hidden" onClick={logout}>
                <LogOut/>
            </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
