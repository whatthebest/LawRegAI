"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Moon, Sun, LogOut, Menu, Bot, LayoutGrid } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/create-sop", label: "Create SOP" },
  { href: "/sops", label: "View SOPs" },
  { href: "/tasks", label: "My Tasks" },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const isMobile = useIsMobile();

  const userInitials = user?.name.split(' ').map(n => n[0]).join('') || 'U';

  if (isMobile) {
    return (
       <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold font-headline text-lg">
            <Bot className="h-6 w-6 text-primary" />
            <span>SOP Central</span>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map(link => (
                    <Link key={link.href} href={link.href} className="text-lg py-2 hover:text-primary transition-colors">
                        {link.label}
                    </Link>
                ))}
                <DropdownMenuSeparator />
                 <div className="flex items-center justify-between">
                    <span>Theme</span>
                    <div>
                        <Button variant="ghost" size="icon" onClick={() => setTheme("light")}><Sun className="h-[1.2rem] w-[1.2rem]"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => setTheme("dark")}><Moon className="h-[1.2rem] w-[1.2rem]"/></Button>
                    </div>
                </div>
                <Button onClick={logout} variant="outline" className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 mr-6 font-bold font-headline text-lg">
          <Bot className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline-block">SOP Central</span>
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(link => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">
                    {link.label}
                </Link>
            ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://placehold.co/100x100.png`} alt={user?.name} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
