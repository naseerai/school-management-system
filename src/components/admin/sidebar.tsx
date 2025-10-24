"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  FileText,
  UserCircle,
  Building,
  TrendingUp,
  Calendar,
  Settings,
  Package2,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ['admin'] },
  { href: "/students", icon: Users, label: "Students", roles: ['admin'] },
  { href: "/fees", icon: Receipt, label: "Fee Structure", roles: ['admin'] },
  { href: "/invoices", icon: FileText, label: "Invoices", roles: ['admin'] },
  { href: "/cashiers", icon: UserCircle, label: "Cashiers", roles: ['admin'] },
  { href: "/departments", icon: Building, label: "Departments", roles: ['admin'] },
  { href: "/expenses", icon: TrendingUp, label: "Expenses", roles: ['admin'] },
  { href: "/academic-years", icon: Calendar, label: "Academic Years", roles: ['admin'] },
  { href: "/activity-logs", icon: History, label: "Activity Logs", roles: ['admin'] },
  { href: "/fee-collection", icon: Receipt, label: "Fee Collection", roles: ['cashier'] },
];

export function Sidebar({ userRole }: { userRole: 'admin' | 'cashier' }) {
  const pathname = usePathname();
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <Link
            href="/dashboard"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Package2 className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Admin Portal</span>
          </Link>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    pathname.startsWith(item.href) && "bg-accent text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                  pathname === "/settings" && "bg-accent text-accent-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </aside>
  );
}