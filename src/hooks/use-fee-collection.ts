"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AcademicYear } from "@/types";

// Types
type FeeItem = { id: string; name: string; amount: number; concession: number };
export type StudentDetails = {
  id: string; name: string; roll_number: string; class: string; section: string; studying_year: string;
  student_types: { name: string } | null;
  fee_details: { [year: string]: FeeItem[] };
  academic_years: AcademicYear | null;
};
export type Payment = {
  id: string; student_id: string; amount: number; fee_type: string; payment_method: string; created_at: string; notes: string | null;
};
export type Invoice = {
  id: string; due_date: string; status: 'paid' | 'unpaid'; total_amount: number; paid_amount: number; batch_description: string;
};
export type CashierProfile = {
  id: string; has_discount_permission: boolean;
};

export function useFeeCollection() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [studentRecords, setStudentRecords] = useState<StudentDetails[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [cashierProfile, setCashierProfile] = useState<CashierProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsInitializing(true);
      const { data: { user } } = await supabase.auth.getUser();
      setSessionUser(user);

      if (user) {
        const { data: profile } = await supabase.from('cashiers').select('id, has_discount_permission').eq('user_id', user.id).single();
        setCashierProfile(profile);
      }

      const { data, error } = await supabase.from("academic_years").select("*").order("year_name", { ascending: false });
      if (error) toast.error("Failed to fetch academic years.");
      else setAcademicYears(data || []);
      
      setIsInitializing(false);
    };
    fetchInitialData();
  }, []);

  const fetchStudentFinancials = useCallback(async (studentIds: string[]) => {
    if (studentIds.length === 0) {
      setPayments([]);
      setInvoices([]);
      return;
    }
    const [paymentsRes, invoicesRes] = await Promise.all([
      supabase.from('payments').select('*').in('student_id', studentIds).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').in('student_id', studentIds).eq('status', 'unpaid').order('due_date', { ascending: true })
    ]);

    if (paymentsRes.error) toast.error("Failed to fetch payments.");
    else setPayments(paymentsRes.data as Payment[] || []);

    if (invoicesRes.error) toast.error("Failed to fetch outstanding invoices.");
    else setInvoices(invoicesRes.data as Invoice[] || []);
  }, []);

  const searchStudent = useCallback(async (values: { roll_number: string; academic_year_id?: string }) => {
    setIsSearching(true);
    setStudentRecords([]);
    setPayments([]);
    setInvoices([]);
    
    let query = supabase.from("students").select("*, student_types(name), academic_years(*)").eq("roll_number", values.roll_number);
    if (values.academic_year_id) {
      query = query.eq("academic_year_id", values.academic_year_id);
    }
    
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      toast.error("Student not found.");
    } else {
      setStudentRecords(data as StudentDetails[]);
      await fetchStudentFinancials(data.map(s => s.id));
    }
    setIsSearching(false);
  }, [fetchStudentFinancials]);

  const refetchStudent = useCallback(async () => {
    if (studentRecords.length > 0) {
      await searchStudent({ roll_number: studentRecords[0].roll_number });
    }
  }, [studentRecords, searchStudent]);

  const logActivity = useCallback(async (action: string, details: object, studentId: string) => {
    if (!sessionUser || !cashierProfile) return;
    await supabase.from('activity_logs').insert({
      cashier_id: cashierProfile.id,
      student_id: studentId,
      action,
      details,
    });
  }, [sessionUser, cashierProfile]);

  return {
    state: {
      academicYears,
      isSearching,
      studentRecords,
      payments,
      invoices,
      cashierProfile,
      isInitializing,
    },
    actions: {
      searchStudent,
      refetchStudent,
      logActivity,
    },
  };
}