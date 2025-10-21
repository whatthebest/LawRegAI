"use client";

import Link from "next/link";
import { SidebarTrigger } from "./ui/sidebar";
import { BrandMark } from "./BrandMark";
import { Zap } from "lucide-react";

type HeaderProps = {
  showSidebarTrigger?: boolean;
};

export default function Header({ showSidebarTrigger = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 w-full items-center px-4 md:px-6">
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-start">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search bar could go here */}
          </div>

          {/* 👇 Sidebar + Logo รวมอยู่ด้วยกัน */}
          <nav className="flex items-center gap-3">
            {showSidebarTrigger && <SidebarTrigger />}
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-bold text-lg"
            >
              <BrandMark size="sm" icon={Zap} />
              <span className="hidden sm:inline-block text-base font-semibold text-slate-900">
                Regulation Change Management
              </span>
            </Link>
          </nav>
        </div>

        {/* Mobile trigger */}
        {showSidebarTrigger && (
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
        )}
      </div>
    </header>
  );
}
