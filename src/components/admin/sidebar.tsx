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
  { href: "/fee-collection", icon: Receipt, label: "Fee Collection", roles: ['admin', 'cashier'] },
];

export function Sidebar({ userRole, isExpanded }: { userRole: 'admin' | 'cashier', isExpanded: boolean }) {
  const pathname = usePathname();
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));
  const portalTitle = userRole === 'admin' ? 'Admin Portal' : 'Cashier Portal';
  const homeLink = userRole === 'admin' ? '/dashboard' : '/fee-collection';

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-all duration-300 print:hidden",
      isExpanded ? "w-56" : "w-14"
    )}>
      <div className="flex h-full max-h-screen flex-col">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href={homeLink} className="flex items-center gap-2 font-semibold">
            <Package2 className="h-6 w-6" />
            {isExpanded && <span className="">{portalTitle}</span>}
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className={cn("grid items-start text-sm font-medium", isExpanded ? "px-2" : "px-2 flex flex-col items-center gap-2")}>
            <TooltipProvider>
              {navItems.map((item) => (
                isExpanded ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      pathname.startsWith(item.href) && "bg-muted text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ) : (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
                          pathname.startsWith(item.href) && "bg-accent text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )
              ))}
            </TooltipProvider>
          </nav>
        </div>
        <div className="mt-auto p-2">
          <p className="text-center text-xs text-muted-foreground">
            {isExpanded ? "Sanju Animations" : "SA"}
          </p>
        </div>
      </div>
    </aside>
  );
}