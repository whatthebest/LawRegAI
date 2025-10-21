"use client";

import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";

type MainLayoutProps = {
  children: React.ReactNode;
  hideSidebar?: boolean;
};

export default function MainLayout({ children, hideSidebar = false }: MainLayoutProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Compliance Standard & Assurance ...</p>
      </div>
    );
  }

  if (hideSidebar) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header showSidebarTrigger={false} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <SidebarInset>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
