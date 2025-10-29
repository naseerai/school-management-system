"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/admin/header";
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<'admin' | 'cashier' | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: cashierProfile } = await supabase
        .from('cashiers')
        .select('password_change_required, name')
        .eq('user_id', session.user.id)
        .single();

      let role: 'admin' | 'cashier' = 'admin';
      if (cashierProfile) {
        role = 'cashier';
        setUserName(cashierProfile.name);
        if (cashierProfile.password_change_required && pathname !== '/change-password') {
          router.push('/change-password');
          return;
        }
      } else {
        setUserName(session.user.email || 'Admin');
      }
      
      setUserRole(role);
      setIsLoading(false);
    };

    checkUserStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  useEffect(() => {
    if (userRole) {
      const adminOnlyPages = [
        '/dashboard', 
        '/students',
        '/fees', 
        '/invoices', 
        '/cashiers', 
        '/departments', 
        '/expenses', 
        '/academic-years',
        '/activity-logs',
        '/settings'
      ];
      const cashierOnlyPages: string[] = [];

      const currentPageIsAdminOnly = adminOnlyPages.some(p => pathname.startsWith(p));
      const currentPageIsCashierOnly = cashierOnlyPages.some(p => pathname.startsWith(p));

      if (userRole === 'cashier' && currentPageIsAdminOnly) {
        router.push('/fee-collection');
      } else if (userRole === 'admin' && currentPageIsCashierOnly) {
        router.push('/dashboard');
      }
    }
  }, [userRole, pathname, router]);

  if (isLoading || !userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar userRole={userRole} isExpanded={isSidebarExpanded} />
      <div className={cn(
        "flex flex-col sm:gap-4 sm:py-4 transition-all duration-300 print:p-0",
        isSidebarExpanded ? "sm:pl-56 print:!pl-0" : "sm:pl-14 print:!pl-0"
      )}>
        <Header userName={userName} userRole={userRole} isSidebarExpanded={isSidebarExpanded} onToggleSidebar={() => setIsSidebarExpanded(prev => !prev)} />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}