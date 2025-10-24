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
import { Badge } from "@/components/ui/badge";
import { AcademicYear } from "../academic-years/page";

// Schemas
const searchSchema = z.object({
  academic_year_id: z.string().min(1, "Please select an academic year"),
  roll_number: z.string().min(1, "Please enter a roll number"),
});

const paymentSchema = z.object({
  fee_type: z.string().min(1, "Fee type is required"),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi"]),
  notes: z.string().optional(),
});

// Types
type StudentDetails = {
  id: string; name: string; roll_number: string; class: string; studying_year: string;
  student_types: { name: string } | null;
  fee_details: any;
};
type Invoice = {
  id: string; due_date: string; status: string; total_amount: number; penalty_amount_per_day: number; created_at: string;
  invoice_items: { description: string; amount: number }[];
};
type Payment = {
  id: string; amount: number; fee_type: string; payment_method: string; created_at: string; notes: string | null;
};

export default function FeeCollectionPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const searchForm = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { academic_year_id: "", roll_number: "" },
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, payment_method: "cash", notes: "" },
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSessionUser(user);

      const { data, error } = await supabase.from("academic_years").select("*").eq("is_active", true);
      if (error) toast.error("Failed to fetch active academic year.");
      else {
        setAcademicYears(data || []);
        if (data && data.length > 0) searchForm.setValue("academic_year_id", data[0].id);
      }
    };
    fetchInitialData();
  }, [searchForm]);

  const fetchStudentFinancials = async (studentId: string) => {
    const [invoicesRes, paymentsRes] = await Promise.all([
      supabase.from('invoices').select('*, invoice_items(*)').eq('student_id', studentId).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
    ]);
    if (invoicesRes.error) toast.error("Failed to fetch invoices.");
    else setInvoices(invoicesRes.data as Invoice[] || []);
    if (paymentsRes.error) toast.error("Failed to fetch payments.");
    else setPayments(paymentsRes.data as Payment[] || []);
  };

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    setStudent(null);
    setInvoices([]);
    setPayments([]);
    const { data, error } = await supabase.from("students").select("*, student_types(name)").eq("academic_year_id", values.academic_year_id).eq("roll_number", values.roll_number).single();
    if (error || !data) toast.error("Student not found.");
    else {
      setStudent(data as StudentDetails);
      await fetchStudentFinancials(data.id);
    }
    setIsSearching(false);
  };

  const onPaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!student || !sessionUser) return;
    setIsSubmittingPayment(true);

    const { error: paymentError } = await supabase.from("payments").insert([{
      ...values,
      student_id: student.id,
      cashier_id: sessionUser.id,
    }]);

    if (paymentError) {
      toast.error(`Payment failed: ${paymentError.message}`);
      setIsSubmittingPayment(false);
      return;
    }

    // Find the corresponding unpaid invoice
    const targetInvoice = invoices.find(inv =>
      inv.status === 'unpaid' &&
      inv.invoice_items.some(item => item.description === values.fee_type)
    );

    // If invoice is found and payment is sufficient, update its status
    if (targetInvoice && values.amount >= targetInvoice.total_amount) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', targetInvoice.id);

      if (updateError) {
        toast.error("Payment recorded, but failed to update invoice status.");
      } else {
        toast.success("Payment recorded and invoice status updated!");
      }
    } else {
      toast.success("Payment recorded successfully!");
    }

    paymentForm.reset({ amount: 0, payment_method: "cash", notes: "" });
    await fetchStudentFinancials(student.id); // Refresh data
    setIsSubmittingPayment(false);
  };

  const { totalDue, totalPaid, balance } = useMemo(() => {
    const totalDue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPaid = payments.reduce((sum, pmt) => sum + pmt.amount, 0);
    const balance = totalDue - totalPaid;
    return { totalDue, totalPaid, balance };
  }, [invoices, payments]);

  const feeTypesForPayment = useMemo(() => {
    const types = new Set<string>();
    invoices.forEach(inv => inv.invoice_items.forEach(item => types.add(item.description)));
    return Array.from(types);
  }, [invoices]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Student Fee Collection</CardTitle><CardDescription>Search for a student to collect fees.</CardDescription></CardHeader>
        <CardContent>
          <Form {...searchForm}>
            <form onSubmit={searchForm.handleSubmit(onSearch)} className="flex flex-wrap items-end gap-4">
              <FormField control={searchForm.control} name="academic_year_id" render={({ field }) => (
                <FormItem className="w-full max-w-xs"><FormLabel>Academic Year</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger></FormControl>
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

      {student && (
        <>
          <Card>
            <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="font-medium">Name</p><p>{student.name}</p></div>
              <div><p className="font-medium">Roll No</p><p>{student.roll_number}</p></div>
              <div><p className="font-medium">Class</p><p>{student.class}</p></div>
              <div><p className="font-medium">Student Type</p><p>{student.student_types?.name || 'N/A'}</p></div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>Fee Invoices</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {invoices.length > 0 ? invoices.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{inv.invoice_items[0]?.description || 'N/A'}</TableCell>
                          <TableCell>
                            {inv.status === 'paid' ? <Badge className="bg-green-100 text-green-800">Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}
                          </TableCell>
                          <TableCell className="text-right">{inv.total_amount.toFixed(2)}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={4} className="text-center">No invoices found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Fee Type</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payments.length > 0 ? payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                          <TableCell>{p.fee_type}</TableCell>
                          <TableCell><Badge variant="secondary">{p.payment_method.toUpperCase()}</Badge></TableCell>
                          <TableCell className="text-right">{p.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={4} className="text-center">No payments recorded.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Fee Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Due:</span><span className="font-medium">{totalDue.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Total Paid:</span><span className="font-medium text-green-600">{totalPaid.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Balance:</span><span>{balance.toFixed(2)}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Collect Payment</CardTitle></CardHeader>
                <CardContent>
                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                      <FormField control={paymentForm.control} name="fee_type" render={({ field }) => (
                        <FormItem><FormLabel>Fee Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select fee type..." /></SelectTrigger></FormControl>
                            <SelectContent>{feeTypesForPayment.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}</SelectContent>
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
                      <Button type="submit" className="w-full" disabled={isSubmittingPayment}>{isSubmittingPayment ? "Processing..." : "Collect Payment"}</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}