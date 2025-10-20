
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Moon, Sun, FileText, Grid3x3, Zap } from "lucide-react";
import { BrandMark } from "./BrandMark";

const navLinks = [
  { href: "/summary-bot", label: "Summary file BOT (Beta)", icon: FileText },
  { href: "/integrated-hub", label: "Integrated Hub", icon: Grid3x3 },
];

export default function AppSidebar() {
  const { setTheme } = useTheme();
  const pathname = usePathname();

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

        <div className="p-3 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
          Guest access enabled
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
