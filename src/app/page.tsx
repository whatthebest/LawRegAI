
"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FilePlus2, ListChecks, CheckSquare, UserCog, Bot } from "lucide-react";

const navItems = [
  {
    href: "/create-sop",
    icon: <FilePlus2 className="w-8 h-8 text-primary" />,
    title: "Create SOP",
    description: "Start a new Standard Operating Procedure.",
  },
  {
    href: "/sops",
    icon: <ListChecks className="w-8 h-8 text-primary" />,
    title: "View SOPs",
    description: "Browse and manage existing procedures.",
  },
  {
    href: "/tasks",
    icon: <CheckSquare className="w-8 h-8 text-primary" />,
    title: "Work Tracker",
    description: "View steps and procedures assigned to you.",
  },
  {
    href: "/admin",
    icon: <UserCog className="w-8 h-8 text-primary" />,
    title: "Admin",
    description: "Manage users and system settings.",
    disabled: false,
  },
];

const NavCard = ({ href, icon, title, description, disabled }: (typeof navItems)[0]) => (
  <Link href={disabled ? "#" : href} passHref className={disabled ? "pointer-events-none" : ""}>
    <Card className={`h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${disabled ? 'bg-muted/50' : 'hover:bg-card/90'}`}>
      <CardHeader className="flex flex-col items-center justify-center text-center gap-4 p-6">
        {icon}
        <div className="space-y-1">
          <CardTitle className={`${disabled ? 'text-muted-foreground' : ''}`}>{title}</CardTitle>
          <CardDescription className={disabled ? 'text-muted-foreground' : ''}>{description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  </Link>
);


export default function HomePage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <h1 className="text-4xl md:text-5xl font-bold text-primary">
          Welcome, {user?.name}!
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          SOP Central is your hub for creating, managing, and tracking all standard operating procedures. What would you like to do today?
        </p>
      </div>
      <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {navItems.map((item) => (
          <NavCard key={item.title} {...item} />
        ))}
      </div>
    </MainLayout>
  );
}
