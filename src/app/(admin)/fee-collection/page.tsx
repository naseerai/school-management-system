"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AcademicYear } from "@/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FeeSummaryTable, FeeSummaryTableData } from "@/components/fee-collection/FeeSummaryTable";

// Schemas
const searchSchema = z.object({
  academic_year_id: z.string().optional(),
  roll_number: z.string().min(1, "Please enter a roll number"),
});

const paymentSchema = z.object({
  payment_year: z.string().min(1, "Please select a year or 'Other'"),
  fee_item_name: z.string().min(1, "This field is required"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi"]),
  notes: z.string().optional(),
});

const editConcessionSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be a non-negative number"),
});

const invoicePaymentSchema = z.object({
  payment_year: z.string().min(1, "Please select a year"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi"]),
  notes: z.string().optional(),
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
  paid_amount: number;
  batch_description: string;
};
type CashierProfile = {
  id: string;
  has_discount_permission: boolean;
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
  const [concessionContext, setConcessionContext] = useState<{ feeType: string; year: string; feeItem: FeeItem; studentRecord: StudentDetails } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [invoicePaymentDialogOpen, setInvoicePaymentDialogOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const searchForm = useForm<z.infer<typeof searchSchema>>({ resolver: zodResolver(searchSchema), defaultValues: { academic_year_id: "", roll_number: "" } });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({ resolver: zodResolver(paymentSchema), defaultValues: { amount: 0, payment_method: "cash", notes: "", payment_year: "", fee_item_name: "" } });
  const editConcessionForm = useForm<z.infer<typeof editConcessionSchema>>({ resolver: zodResolver(editConcessionSchema), defaultValues: { amount: 0 } });
  const invoicePaymentForm = useForm<z.infer<typeof invoicePaymentSchema>>({ resolver: zodResolver(invoicePaymentSchema), defaultValues: { payment_year: "", amount: 0, payment_method: "cash", notes: "" } });

  const watchedPaymentYear = paymentForm.watch("payment_year");

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
      .select('id, due_date, status, total_amount, paid_amount, batch_description')
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
    if (!sessionUser || !cashierProfile) return;
    await supabase.from('activity_logs').insert({
      cashier_id: cashierProfile.id,
      student_id: studentId,
      action,
      details,
    });
  };

  const onPaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    const studentRecordForPayment = studentRecords.find(r => r.studying_year === values.payment_year) || studentRecords[studentRecords.length - 1];
    
    if (!studentRecordForPayment || !sessionUser || !cashierProfile) {
      toast.error("Cannot process payment: Student or Cashier profile not found. Please search for the student again or re-login.");
      return;
    }

    setIsSubmitting(true);

    const feeTypeForDb = values.payment_year === 'Other' 
        ? values.fee_item_name 
        : `${values.payment_year} - ${values.fee_item_name}`;

    const paymentData = {
        amount: values.amount,
        payment_method: values.payment_method,
        notes: values.notes,
        fee_type: feeTypeForDb,
        student_id: studentRecordForPayment.id,
        cashier_id: cashierProfile.id,
    };

    const { error } = await supabase.from("payments").insert([paymentData]);
    if (error) {
      toast.error(`Payment failed: ${error.message}`);
    } else {
      toast.success("Payment recorded successfully!");
      await logActivity("Fee Collection", { ...values, fee_type: feeTypeForDb }, studentRecordForPayment.id);
      setPaymentDialogOpen(false);
      paymentForm.reset({ amount: 0, payment_method: "cash", notes: "", payment_year: "", fee_item_name: "" });
      await fetchStudentFinancials(studentRecords.map(s => s.id));
    }
    setIsSubmitting(false);
  };

  const handleEditConcessionClick = (feeType: string, year: string) => {
    const studentRecord = studentRecords.find(r => r.studying_year === year);
    const feeItem = studentRecord?.fee_details[year]?.find(f => f.name === feeType);

    if (!studentRecord || !feeItem) {
        toast.error("Could not find the specific fee item to update.");
        return;
    }
    setConcessionContext({ feeType, year, feeItem, studentRecord });
    editConcessionForm.setValue('amount', feeItem.concession || 0);
    setEditConcessionDialogOpen(true);
  };

  const onEditConcessionSubmit = async (values: z.infer<typeof editConcessionSchema>) => {
    if (!concessionContext) return;
    const { feeItem, studentRecord } = concessionContext;
    
    setIsSubmitting(true);
    const response = await fetch(`/api/students/${studentRecord.id}/concession`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            year: studentRecord.studying_year,
            feeItemId: feeItem.id,
            concession: values.amount,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        toast.error(`Failed to update concession: ${result.error}`);
    } else {
        toast.success("Concession updated successfully!");
        await logActivity("Concession Edited", { fee: feeItem.name, year: studentRecord.studying_year, amount: values.amount }, studentRecord.id);
        setEditConcessionDialogOpen(false);
        await refetchStudent();
    }
    setIsSubmitting(false);
  };

  const handlePayInvoiceClick = (invoice: Invoice) => {
    setInvoiceToPay(invoice);
    const remainingBalance = invoice.total_amount - (invoice.paid_amount || 0);
    const studentYear = currentYearRecord?.studying_year;
    
    invoicePaymentForm.reset({ 
      payment_year: studentYear || '',
      amount: parseFloat(remainingBalance.toFixed(2)), 
      payment_method: "cash", 
      notes: "" 
    });
    setInvoicePaymentDialogOpen(true);
  };

  const onInvoicePaymentSubmit = async (values: z.infer<typeof invoicePaymentSchema>) => {
    if (!invoiceToPay || !studentRecords[0] || !cashierProfile) {
      toast.error("Cannot process payment. Missing context.");
      return;
    }
    setIsSubmitting(true);

    const paymentData = {
      student_id: studentRecords[0].id,
      cashier_id: cashierProfile.id,
      amount: values.amount,
      payment_method: values.payment_method,
      fee_type: `${values.payment_year} - Invoice: ${invoiceToPay.batch_description}`,
      notes: values.notes,
    };

    const { error: paymentError } = await supabase.from('payments').insert(paymentData);
    if (paymentError) {
      toast.error(`Payment failed: ${paymentError.message}`);
      setIsSubmitting(false);
      return;
    }

    const newPaidAmount = (invoiceToPay.paid_amount || 0) + values.amount;
    const newStatus = newPaidAmount >= invoiceToPay.total_amount ? 'paid' : 'unpaid';

    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ paid_amount: newPaidAmount, status: newStatus })
      .eq('id', invoiceToPay.id);

    if (invoiceError) {
      toast.error(`Payment recorded, but failed to update invoice status: ${invoiceError.message}`);
    } else {
      toast.success("Invoice payment recorded successfully!");
      await logActivity("Invoice Payment", { description: invoiceToPay.batch_description, amount: values.amount }, studentRecords[0].id);
    }

    setInvoicePaymentDialogOpen(false);
    await refetchStudent();
    setIsSubmitting(false);
  };

  const handlePayClick = (feeType: string) => {
    paymentForm.reset({
        amount: 0,
        payment_method: "cash",
        notes: "",
        payment_year: "",
        fee_item_name: feeType,
    });
    setPaymentDialogOpen(true);
  };

  const handleCollectOtherClick = () => {
      paymentForm.reset({
          amount: 0,
          payment_method: "cash",
          notes: "",
          payment_year: "Other",
          fee_item_name: "",
      });
      setPaymentDialogOpen(true);
  };

  const feeSummaryData: FeeSummaryTableData | null = useMemo(() => {
    if (studentRecords.length === 0) return null;

    const masterFeeDetails = studentRecords[studentRecords.length - 1].fee_details || {};
    const years = Object.keys(masterFeeDetails).sort();
    const allFeeTypeNames = new Set<string>();
    Object.values(masterFeeDetails).forEach(items => {
        items.forEach(item => allFeeTypeNames.add(item.name));
    });
    const feeTypes = Array.from(allFeeTypeNames).sort();

    const paymentsByFeeType: { [type: string]: number } = {};
    payments.forEach(p => {
        paymentsByFeeType[p.fee_type] = (paymentsByFeeType[p.fee_type] || 0) + p.amount;
    });

    const cellData: FeeSummaryTableData['cellData'] = {};
    const yearlyTotals: FeeSummaryTableData['yearlyTotals'] = {};

    years.forEach(year => {
        cellData[year] = {};
        yearlyTotals[year] = { total: 0, paid: 0, pending: 0, concession: 0 };
        const feeItemsForYear = masterFeeDetails[year] || [];

        feeTypes.forEach(feeType => {
            const feeItem = feeItemsForYear.find(item => item.name === feeType);
            if (feeItem) {
                const total = feeItem.amount;
                const concession = feeItem.concession || 0;
                const paid = paymentsByFeeType[`${year} - ${feeType}`] || 0;
                const pending = Math.max(0, total - concession - paid);

                cellData[year][feeType] = { total, paid, pending, concession };

                yearlyTotals[year].total += total;
                yearlyTotals[year].paid += paid;
                yearlyTotals[year].concession += concession;
            } else {
                cellData[year][feeType] = { total: 0, paid: 0, pending: 0, concession: 0 };
            }
        });
        yearlyTotals[year].pending = Math.max(0, yearlyTotals[year].total - yearlyTotals[year].concession - yearlyTotals[year].paid);
    });

    const overallTotals: FeeSummaryTableData['overallTotals'] = { total: 0, paid: 0, pending: 0, concession: 0 };
    Object.values(yearlyTotals).forEach(yearTotal => {
        overallTotals.total += yearTotal.total;
        overallTotals.paid += yearTotal.paid;
        overallTotals.concession += yearTotal.concession;
    });
    overallTotals.pending = Math.max(0, overallTotals.total - overallTotals.concession - overallTotals.paid);

    return { years, feeTypes, cellData, yearlyTotals, overallTotals };
  }, [studentRecords, payments]);

  const currentYearRecord = useMemo(() => studentRecords.find(r => r.academic_years?.is_active), [studentRecords]);
  
  const masterFeeDetails = useMemo(() => {
    if (studentRecords.length === 0) return {};
    return studentRecords[studentRecords.length - 1].fee_details || {};
  }, [studentRecords]);

  const handleFeeItemChange = (feeItemName: string) => {
    paymentForm.setValue('fee_item_name', feeItemName);
    const year = paymentForm.getValues("payment_year");
    if (!year || year === 'Other') return;

    const feeItemsForYear = masterFeeDetails[year] || [];
    const selectedFeeItem = feeItemsForYear.find(item => item.name === feeItemName);

    if (selectedFeeItem) {
        const feeTypeString = `${year} - ${feeItemName}`;
        const paidForThisItem = payments
            .filter(p => p.fee_type === feeTypeString)
            .reduce((sum, p) => sum + p.amount, 0);
        
        const balance = (selectedFeeItem.amount - (selectedFeeItem.concession || 0)) - paidForThisItem;
        
        paymentForm.setValue('amount', Math.max(0, parseFloat(balance.toFixed(2))));
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Initializing Fee Collection...</p>
      </div>
    );
  }

  if (!cashierProfile && !isInitializing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Could not load cashier profile. You may not have the required permissions to access this page. Please try logging out and back in.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Student Fee Collection</CardTitle><CardDescription>Search for a student to collect fees.</CardDescription></CardHeader>
        <CardContent>
          <fieldset disabled={isInitializing}>
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
          </fieldset>
        </CardContent>
      </Card>

      {studentRecords.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="font-medium">Name</p><p>{studentRecords[0].name}</p></div>
              <div><p className="font-medium">Roll No</p><p>{studentRecords[0].roll_number}</p></div>
              <div><p className="font-medium">Class</p><p>{studentRecords[0].class}</p></div>
              <div><p className="font-medium">Student Type</p><p>{studentRecords[0].student_types?.name}</p></div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <FeeSummaryTable 
                data={feeSummaryData} 
                onPay={handlePayClick} 
                onCollectOther={handleCollectOtherClick}
                hasDiscountPermission={cashierProfile?.has_discount_permission || false}
                onEditConcession={handleEditConcessionClick}
            />
            
            {invoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Outstanding Invoices</CardTitle>
                  <CardDescription>Collect payments for generated invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Total</TableHead><TableHead>Balance</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {invoices.map(invoice => (<TableRow key={invoice.id}><TableCell>{invoice.batch_description}</TableCell><TableCell>{invoice.total_amount.toFixed(2)}</TableCell><TableCell className="font-medium">{(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)}</TableCell><TableCell><Button size="sm" onClick={() => handlePayInvoiceClick(invoice)}>Collect Payment</Button></TableCell></TableRow>))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Overall Payment History</CardTitle></CardHeader>
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

          <Dialog open={editConcessionDialogOpen} onOpenChange={setEditConcessionDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Edit Concession for {concessionContext?.feeType} ({concessionContext?.year})</DialogTitle></DialogHeader>
                <Form {...editConcessionForm}>
                    <form onSubmit={editConcessionForm.handleSubmit(onEditConcessionSubmit)} className="space-y-4">
                        <FormField control={editConcessionForm.control} name="amount" render={({ field }) => (
                            <FormItem><Label>Concession Amount</Label><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditConcessionDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Concession"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={invoicePaymentDialogOpen} onOpenChange={setInvoicePaymentDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Collect Invoice Payment</DialogTitle></DialogHeader>
              <div className="space-y-2 text-sm">
                <p><strong>Description:</strong> {invoiceToPay?.batch_description}</p>
                <p><strong>Total Amount:</strong> {invoiceToPay?.total_amount.toFixed(2)}</p>
                <p><strong>Remaining Balance:</strong> {((invoiceToPay?.total_amount || 0) - (invoiceToPay?.paid_amount || 0)).toFixed(2)}</p>
              </div>
              <Form {...invoicePaymentForm}>
                <form onSubmit={invoicePaymentForm.handleSubmit(onInvoicePaymentSubmit)} className="space-y-4">
                  <FormField control={invoicePaymentForm.control} name="payment_year" render={({ field }) => (
                    <FormItem><FormLabel>Academic Year</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.keys(masterFeeDetails).map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={invoicePaymentForm.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount to Collect</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={invoicePaymentForm.control} name="payment_method" render={({ field }) => (
                    <FormItem><FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem></SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={invoicePaymentForm.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInvoicePaymentDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Confirm Payment"}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Collect New Payment</DialogTitle></DialogHeader>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                  <FormField control={paymentForm.control} name="payment_year" render={({ field }) => (
                    <FormItem><FormLabel>Year / Type</FormLabel>
                      <Select onValueChange={(value) => { field.onChange(value); paymentForm.setValue("fee_item_name", ""); paymentForm.setValue("amount", 0); }} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.keys(masterFeeDetails).map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />

                  {watchedPaymentYear && watchedPaymentYear !== 'Other' && (
                    <FormField control={paymentForm.control} name="fee_item_name" render={({ field }) => (
                      <FormItem><FormLabel>Fee Item</FormLabel>
                        <Select onValueChange={(value) => handleFeeItemChange(value)} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select fee item..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(masterFeeDetails[watchedPaymentYear] || []).map(item => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      <FormMessage /></FormItem>
                    )} />
                  )}

                  {watchedPaymentYear === 'Other' && (
                    <FormField control={paymentForm.control} name="fee_item_name" render={({ field }) => (
                        <FormItem><FormLabel>Fee Description</FormLabel><FormControl><Input placeholder="e.g., Fine for late submission" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}

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
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Collect Payment"}</Button>
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