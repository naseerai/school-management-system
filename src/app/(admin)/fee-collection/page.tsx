"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Print } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AcademicYear } from "@/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Schemas
const searchSchema = z.object({
  academic_year_id: z.string().optional(),
  roll_number: z.string().min(1, "Please enter a roll number"),
});

const paymentSchema = z.object({
  fee_type: z.string().min(1, "Fee type is required"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi"]),
  notes: z.string().optional(),
});

const editConcessionSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be a non-negative number"),
});

// Types
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

  const searchForm = useForm<z.infer<typeof searchSchema>>({ resolver: zodResolver(searchSchema), defaultValues: { academic_year_id: "", roll_number: "" } });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({ resolver: zodResolver(paymentSchema), defaultValues: { amount: 0, payment_method: "cash", notes: "" } });
  const editConcessionForm = useForm<z.infer<typeof editConcessionSchema>>({ resolver: zodResolver(editConcessionSchema), defaultValues: { amount: 0 } });

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
    const { error } = await supabase.from("payments").insert([{ ...values, student_id: currentYearRecord.id, cashier_id: cashierProfile?.id }]);
    if (error) {
      toast.error(`Payment failed: ${error.message}`);
    } else {
      toast.success("Payment recorded successfully!");
      await logActivity("Fee Collection", values, currentYearRecord.id);
      paymentForm.reset({ amount: 0, payment_method: "cash", notes: "", fee_type: "" });
      await fetchStudentFinancials(studentRecords.map(s => s.id));
    }
    setIsSubmitting(false);
  };

  const handleEditConcessionClick = (feeItem: FeeItem, studentRecord: StudentDetails) => {
    setConcessionContext({ fee: feeItem, studentRecord });
    editConcessionForm.setValue('amount', feeItem.concession || 0);
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

  const currentYearRecord = useMemo(() => studentRecords.find(r => r.academic_years?.is_active), [studentRecords]);
  const feeItemsForCurrentYear = useMemo(() => {
    if (!currentYearRecord) return [];
    return currentYearRecord.fee_details?.[currentYearRecord.studying_year] || [];
  }, [currentYearRecord]);

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardHeader><CardTitle>Student Fee Collection</CardTitle><CardDescription>Search for a student to collect fees.</CardDescription></CardHeader>
        <CardContent>
          <Form {...searchForm}>
            <form onSubmit={searchForm.handleSubmit(onSearch)} className="flex flex-wrap items-end gap-4">
              <FormField control={searchForm.control} name="academic_year_id" render={({ field }) => (
                <FormItem className="w-full max-w-xs"><FormLabel>Academic Year (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="All years..." /></SelectTrigger></FormControl>
                    <SelectContent>{academicYears.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.year_name}</SelectItem>)}</SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={searchForm.control} name="roll_number" render={({ field }) => (
                <FormItem className="w-full max-w-xs"><FormLabel>Roll Number</FormLabel><FormControl><Input placeholder="Enter roll number..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" disabled={isSearching}>{isSearching ? "Searching..." : "Search Student"}</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {studentRecords.length > 0 && (
        <>
          <div className="hidden print:block text-center mb-4">
            <h1 className="text-xl font-bold">Payment Receipt</h1>
            <p>Student: {studentRecords[0].name} ({studentRecords[0].roll_number})</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
          </div>

          <Card>
            <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="font-medium">Name</p><p>{studentRecords[0].name}</p></div>
              <div><p className="font-medium">Roll No</p><p>{studentRecords[0].roll_number}</p></div>
              <div><p className="font-medium">Class</p><p>{studentRecords[0].class}</p></div>
              <div><p className="font-medium">Student Type</p><p>{studentRecords[0].student_types?.name}</p></div>
            </CardContent>
          </Card>

          {invoices.length > 0 && (
            <Card className="print:hidden">
              <CardHeader>
                <CardTitle>Outstanding Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.batch_description}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{invoice.total_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6 print:hidden">
              <Card>
                <CardHeader><CardTitle>Overall Financial Summary</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div><p className="font-medium">Total Due</p><p>{overallSummary.totalDue.toFixed(2)}</p></div>
                    <div><p className="font-medium text-orange-600">Total Concession</p><p className="text-orange-600">{overallSummary.totalConcession.toFixed(2)}</p></div>
                    <div><p className="font-medium text-green-600">Total Paid</p><p className="text-green-600">{overallSummary.totalPaid.toFixed(2)}</p></div>
                    <div><p className="font-medium text-red-600">Outstanding Invoices</p><p className="text-red-600">{overallSummary.outstandingInvoiceTotal.toFixed(2)}</p></div>
                    <div><p className="font-bold text-base">Overall Balance</p><p className="font-bold text-base">{overallSummary.balance.toFixed(2)}</p></div>
                </CardContent>
              </Card>

              <Accordion type="single" collapsible className="w-full" defaultValue={currentYearRecord?.studying_year}>
                {yearlySummaries.map((summary) => (
                    <AccordionItem value={summary.year} key={summary.year}>
                      <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                          <span>{summary.year}</span>
                          <Badge variant={summary.balance > 0 ? "destructive" : "default"}>
                            Balance: {summary.balance.toFixed(2)}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Card className="border-none shadow-none">
                          <CardContent className="pt-4">
                            <Table>
                              <TableHeader><TableRow><TableHead>Fee Type</TableHead><TableHead>Amount</TableHead><TableHead>Concession</TableHead><TableHead className="text-right">Payable</TableHead>{cashierProfile?.has_discount_permission && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
                              <TableBody>
                                {summary.feeItems.length > 0 ? summary.feeItems.map(item => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.amount.toFixed(2)}</TableCell>
                                    <TableCell>{(item.concession || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">{(item.amount - (item.concession || 0)).toFixed(2)}</TableCell>
                                    {cashierProfile?.has_discount_permission && summary.studentRecordForYear && <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleEditConcessionClick(item, summary.studentRecordForYear!)}>Edit</Button></TableCell>}
                                  </TableRow>
                                )) : <TableRow><TableCell colSpan={cashierProfile?.has_discount_permission ? 5 : 4} className="text-center">No fee structure defined for this year.</TableCell></TableRow>}
                              </TableBody>
                            </Table>
                            <div className="grid grid-cols-4 gap-4 text-sm mt-4 border-t pt-4">
                                <div><p className="font-medium">Yearly Due</p><p>{summary.totalDue.toFixed(2)}</p></div>
                                <div><p className="font-medium text-orange-600">Yearly Concession</p><p className="text-orange-600">{summary.totalConcession.toFixed(2)}</p></div>
                                <div><p className="font-medium text-green-600">Yearly Paid</p><p className="text-green-600">{summary.totalPaid.toFixed(2)}</p></div>
                                <div><p className="font-medium">Yearly Balance</p><p>{summary.balance.toFixed(2)}</p></div>
                            </div>
                          </CardContent>
                        </Card>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </div>
            <div className="space-y-6">
              <Card className="print:hidden">
                <CardHeader><CardTitle>Collect Payment for {currentYearRecord?.academic_years?.year_name}</CardTitle></CardHeader>
                <CardContent>
                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                      <FormField control={paymentForm.control} name="fee_type" render={({ field }) => (
                        <FormItem><FormLabel>Fee Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select fee type..." /></SelectTrigger></FormControl>
                            <SelectContent>{feeItemsForCurrentYear.map(ft => <SelectItem key={ft.id} value={ft.name}>{ft.name}</SelectItem>)}</SelectContent>
                          </Select>
                        <FormMessage /></FormItem>
                      )} />
                      <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={paymentForm.control} name="payment_method" render={({ field }) => (
                        <FormItem><FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem></SelectContent>
                          </Select>
                        <FormMessage /></FormItem>
                      )} />
                      <FormField control={paymentForm.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Collect Payment"}</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Overall Payment History</CardTitle>
                  <Button variant="outline" size="icon" onClick={() => window.print()} className="print:hidden">
                    <Print className="h-4 w-4" />
                    <span className="sr-only">Print</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payments.length > 0 ? payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{p.fee_type}</TableCell>
                          <TableCell className="text-right">{p.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={3} className="text-center">No payments recorded.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
          <Dialog open={editConcessionDialogOpen} onOpenChange={setEditConcessionDialogOpen} className="print:hidden">
            <DialogContent>
                <DialogHeader><DialogTitle>Edit Concession for {concessionContext?.fee.name}</DialogTitle></DialogHeader>
                <Form {...editConcessionForm}>
                    <form onSubmit={editConcessionForm.handleSubmit(onEditConcessionSubmit)} className="space-y-4">
                        <FormField control={editConcessionForm.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Concession Amount</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditConcessionDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Concession"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}