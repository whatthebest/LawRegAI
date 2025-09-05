"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarTrigger } from "./ui/sidebar";

export default function Header() {
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-start">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search bar could go here */}
          </div>

          {/* 👇 Sidebar + Logo รวมอยู่ด้วยกัน */}
          <nav className="flex items-center gap-3">
            <SidebarTrigger />
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-bold text-lg"
            >
              <Bot className="h-6 w-6 text-primary" />
              <span className="hidden sm:inline-block">Conpliance Standard Assurance</span>
            </Link>
          </nav>
        </div>

        {/* Mobile trigger */}
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
      </div>
    </header>
  );
}