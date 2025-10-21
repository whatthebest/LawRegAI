
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { FileText, Grid3x3, Zap } from "lucide-react";
import { BrandMark } from "./BrandMark";

const navLinks = [
  { href: "/summary-bot", label: "Summary file BOT (Beta)", icon: FileText },
  { href: "/integrated-hub", label: "Integrated Hub", icon: Grid3x3 },
];

export default function AppSidebar() {
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
            Regulation Change Management
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
        <SidebarSeparator />

        <div className="p-3 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
          Guest access enabled
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
