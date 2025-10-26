"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import * as z from "zod";

import { supabase } from "@/integrations/supabase/client";
import { StudentSearchForm } from "@/components/fee-collection/StudentSearchForm";
import { StudentDetailsCard } from "@/components/fee-collection/StudentDetailsCard";
import { FinancialSummary } from "@/components/fee-collection/FinancialSummary";
import { YearlyFeeSummary } from "@/components/fee-collection/YearlyFeeSummary";
import { PaymentFormCard } from "@/components/fee-collection/PaymentFormCard";
import { PaymentHistoryCard } from "@/components/fee-collection/PaymentHistoryCard";
import { EditConcessionDialog } from "@/components/fee-collection/EditConcessionDialog";

// Schemas
const searchSchema = z.object({
  academic_year_id: z.string().optional(),
  roll_number: z.string().min(1, "Please enter a roll number"),
});

const paymentSchema = z.object({
  fee_type: z.string().min(1, "Fee type is required"),
  other_fee_description: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi"]),
  notes: z.string().optional(),
});

const editConcessionSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be a non-negative number"),
});

// Types
type AcademicYear = { id: string; year_name: string; is_active: boolean; };
type FeeItem = { id: string; name: string; amount: number; concession: number };
type StudentDetails = {
  id: string; name: string; roll_number: string; class: string; section: string; studying_year: string;
  student_types: { name: string } | null;
  fee_details: { [year: string]: FeeItem[] };
  academic_years: AcademicYear | null;
};
type Payment = {
  id: string; student_id: string; amount: number; fee_type: string; payment_method: string; created_at: string; notes: string | null;
};
type Invoice = {
  id: string;
  due_date: string;
  status: 'paid' | 'unpaid';
  total_amount: number;
  batch_description: string;
};
type CashierProfile = {
  id: string;
  has_discount_permission: boolean;
};
type YearlySummary = {
    year: string;
    feeItems: FeeItem[];
    totalDue: number;
    totalConcession: number;
    totalPaid: number;
    balance: number;
    studentRecordForYear: StudentDetails | undefined;
};

// Calculation Logic
const calculateFinancials = (studentRecords: StudentDetails[], allPayments: Payment[], allInvoices: Invoice[]) => {
    if (studentRecords.length === 0) {
        return { yearlySummaries: [], overallSummary: { totalDue: 0, totalConcession: 0, totalPaid: 0, balance: 0, outstandingInvoiceTotal: 0 } };
    }

    const masterFeeDetails = studentRecords[studentRecords.length - 1].fee_details || {};
    const studentIdToYearMap = new Map(studentRecords.map(r => [r.id, r.studying_year]));

    const paymentsByYear: { [year: string]: number } = {};
    allPayments.forEach(p => {
        const studyingYear = studentIdToYearMap.get(p.student_id);
        if (studyingYear) {
            paymentsByYear[studyingYear] = (paymentsByYear[studyingYear] || 0) + p.amount;
        }
    });

    const yearlySummaries: YearlySummary[] = Object.entries(masterFeeDetails).map(([year, feeItems]) => {
        const totalDue = feeItems.reduce((sum, item) => sum + item.amount, 0);
        const totalConcession = feeItems.reduce((sum, item) => sum + (item.concession || 0), 0);
        const totalPaid = paymentsByYear[year] || 0;
        const balance = totalDue - totalConcession - totalPaid;
        const studentRecordForYear = studentRecords.find(r => r.studying_year === year);

        return { year, feeItems, totalDue, totalConcession, totalPaid, balance, studentRecordForYear };
    });

    const overallTotalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const { totalDue: overallTotalDue, totalConcession: overallTotalConcession } = yearlySummaries.reduce(
        (acc, summary) => ({
            totalDue: acc.totalDue + summary.totalDue,
            totalConcession: acc.totalConcession + summary.totalConcession,
        }),
        { totalDue: 0, totalConcession: 0 }
    );
    
    const outstandingInvoiceTotal = allInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const feeStructureBalance = overallTotalDue - overallTotalConcession - overallTotalPaid;
    
    const overallSummary = {
        totalDue: overallTotalDue,
        totalConcession: overallTotalConcession,
        totalPaid: overallTotalPaid,
        outstandingInvoiceTotal: outstandingInvoiceTotal,
        balance: feeStructureBalance + outstandingInvoiceTotal,
    };

    return { yearlySummaries, overallSummary };
};

export default function FeeCollectionPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [studentRecords, setStudentRecords] = useState<StudentDetails[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [cashierProfile, setCashierProfile] = useState<CashierProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editConcessionDialogOpen, setEditConcessionDialogOpen] = useState(false);
  const [concessionContext, setConcessionContext] = useState<{ fee: FeeItem; studentRecord: StudentDetails } | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSessionUser(user);

      if (user) {
        const { data: profile } = await supabase.from('cashiers').select('id, has_discount_permission').eq('user_id', user.id).single();
        setCashierProfile(profile);
      }

      const { data, error } = await supabase.from("academic_years").select("*").order("year_name", { ascending: false });
      if (error) toast.error("Failed to fetch academic years.");
      else setAcademicYears(data || []);
    };
    fetchInitialData();
  }, []);

  const fetchStudentFinancials = async (studentIds: string[]) => {
    if (studentIds.length === 0) {
        setPayments([]);
        return;
    }
    const { data, error } = await supabase.from('payments').select('*').in('student_id', studentIds).order('created_at', { ascending: false });
    if (error) toast.error("Failed to fetch payments.");
    else setPayments(data as Payment[] || []);
  };

  const fetchStudentInvoices = async (studentIds: string[]) => {
    if (studentIds.length === 0) {
      setInvoices([]);
      return;
    }
    const { data, error } = await supabase
      .from('invoices')
      .select('id, due_date, status, total_amount, batch_description')
      .in('student_id', studentIds)
      .eq('status', 'unpaid')
      .order('due_date', { ascending: true });
    
    if (error) {
      toast.error("Failed to fetch outstanding invoices.");
    } else {
      setInvoices(data as Invoice[] || []);
    }
  };

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
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
      const studentIds = data.map(s => s.id);
      await Promise.all([
        fetchStudentFinancials(studentIds),
        fetchStudentInvoices(studentIds)
      ]);
    }
    setIsSearching(false);
  };

  const refetchStudent = async () => {
    if (studentRecords.length === 0) return;
    const roll_number = studentRecords[0].roll_number;
    await onSearch({ roll_number });
  };

  const logActivity = async (action: string, details: object, studentId: string) => {
    if (!sessionUser) return;
    await supabase.from('activity_logs').insert({
      cashier_id: cashierProfile?.id,
      student_id: studentId,
      action,
      details,
    });
  };

  const onPaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    const currentYearRecord = studentRecords.find(r => r.academic_years?.is_active);
    if (!currentYearRecord || !sessionUser) {
      toast.error("Cannot process payment: No active academic year found for this student.");
      return;
    }
    setIsSubmitting(true);
    const feeTypeToRecord = values.fee_type === 'Other' ? values.other_fee_description : values.fee_type;
    
    const { error } = await supabase.from("payments").insert([{ 
        student_id: currentYearRecord.id, 
        cashier_id: cashierProfile?.id,
        amount: values.amount,
        payment_method: values.payment_method,
        notes: values.notes,
        fee_type: feeTypeToRecord,
    }]);

    if (error) {
      toast.error(`Payment failed: ${error.message}`);
    } else {
      toast.success("Payment recorded successfully!");
      await logActivity("Fee Collection", { ...values, fee_type: feeTypeToRecord }, currentYearRecord.id);
      await fetchStudentFinancials(studentRecords.map(s => s.id));
    }
    setIsSubmitting(false);
  };

  const handleEditConcessionClick = (feeItem: FeeItem, studentRecord: StudentDetails) => {
    setConcessionContext({ fee: feeItem, studentRecord });
    setEditConcessionDialogOpen(true);
  };

  const onEditConcessionSubmit = async (values: z.infer<typeof editConcessionSchema>) => {
    if (!concessionContext) return;
    const { fee, studentRecord } = concessionContext;
    setIsSubmitting(true);

    const response = await fetch(`/api/students/${studentRecord.id}/concession`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            year: studentRecord.studying_year,
            feeItemId: fee.id,
            concession: values.amount,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        toast.error(`Failed to update concession: ${result.error}`);
    } else {
        toast.success("Concession updated successfully!");
        await logActivity("Concession Edited", { fee: fee.name, amount: values.amount }, studentRecord.id);
        setEditConcessionDialogOpen(false);
        await refetchStudent();
    }
    setIsSubmitting(false);
  };

  const { yearlySummaries, overallSummary } = useMemo(
    () => calculateFinancials(studentRecords, payments, invoices),
    [studentRecords, payments, invoices]
  );

  const allFeeItems = useMemo(() => {
    if (!studentRecords) return [];
    const items = new Map<string, { label: string; value: string }>();
    studentRecords.forEach(record => {
        if (record.fee_details) {
            Object.entries(record.fee_details).forEach(([year, fees]) => {
                fees.forEach(fee => {
                    const value = `${year} - ${fee.name}`;
                    if (!items.has(value)) {
                        items.set(value, { label: value, value: value });
                    }
                });
            });
        }
    });
    return Array.from(items.values());
  }, [studentRecords]);

  return (
    <div className="space-y-6">
      <StudentSearchForm academicYears={academicYears} onSearch={onSearch} isSearching={isSearching} />

      {studentRecords.length > 0 && (
        <>
          <div className="hidden print:block text-center mb-4">
            <h1 className="text-xl font-bold">Payment Receipt</h1>
            <p>Student: {studentRecords[0].name} ({studentRecords[0].roll_number})</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>

          <StudentDetailsCard student={studentRecords[0]} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <FinancialSummary summary={overallSummary} />
              <YearlyFeeSummary yearlySummaries={yearlySummaries} cashierProfile={cashierProfile} onEditConcession={handleEditConcessionClick} />
            </div>
            <div className="space-y-6">
              <PaymentFormCard invoices={invoices} allFeeItems={allFeeItems} onSubmit={onPaymentSubmit} isSubmitting={isSubmitting} />
              <PaymentHistoryCard payments={payments} />
            </div>
          </div>
          
          <EditConcessionDialog
            open={editConcessionDialogOpen}
            onOpenChange={setEditConcessionDialogOpen}
            feeName={concessionContext?.fee.name}
            defaultAmount={concessionContext?.fee.concession || 0}
            onSubmit={onEditConcessionSubmit}
            isSubmitting={isSubmitting}
          />
        </>
      )}
    </div>
  );
}