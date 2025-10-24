"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/admin/header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<'admin' | 'cashier' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: cashierProfile } = await supabase
        .from('cashiers')
        .select('password_change_required')
        .eq('user_id', session.user.id)
        .single();

      let role: 'admin' | 'cashier' = 'admin';
      if (cashierProfile) {
        role = 'cashier';
        if (cashierProfile.password_change_required && pathname !== '/change-password') {
          router.push('/change-password');
          return;
        }
      }
      
      setUserRole(role);
      setIsLoading(false);
    };

    checkUserStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      } else if (event === 'SIGNED_IN') {
        setIsLoading(true);
        checkUserStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  useEffect(() => {
    if (userRole) {
      const cashierOnlyPages = ['/fee-collection'];
      
      if (userRole === 'cashier' && !cashierOnlyPages.includes(pathname) && pathname !== '/change-password') {
        router.push('/fee-collection');
      } else if (userRole === 'admin' && cashierOnlyPages.includes(pathname)) {
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
      <Sidebar userRole={userRole} />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Header userRole={userRole} />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}