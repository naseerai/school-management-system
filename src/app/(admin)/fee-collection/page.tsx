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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

const concessionSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  notes: z.string().min(1, "A reason for the concession is required"),
});

// Types
type FeeItem = { id: string; name: string; amount: number };
type FeeStructure = { [year: string]: FeeItem[] };
type StudentDetails = {
  id: string; name: string; roll_number: string; class: string; studying_year: string;
  student_types: { name: string } | null;
  fee_details: FeeStructure;
};
type Payment = {
  id: string; amount: number; fee_type: string; payment_method: string; created_at: string; notes: string | null;
};
type CashierProfile = {
  id: string;
  has_discount_permission: boolean;
};

export default function FeeCollectionPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [cashierProfile, setCashierProfile] = useState<CashierProfile | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [concessionDialogOpen, setConcessionDialogOpen] = useState(false);

  const searchForm = useForm<z.infer<typeof searchSchema>>({ resolver: zodResolver(searchSchema), defaultValues: { academic_year_id: "", roll_number: "" } });
  const paymentForm = useForm<z.infer<typeof paymentSchema>>({ resolver: zodResolver(paymentSchema), defaultValues: { amount: 0, payment_method: "cash", notes: "" } });
  const concessionForm = useForm<z.infer<typeof concessionSchema>>({ resolver: zodResolver(concessionSchema), defaultValues: { amount: 0, notes: "" } });

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSessionUser(user);

      if (user) {
        const { data: profile } = await supabase.from('cashiers').select('id, has_discount_permission').eq('user_id', user.id).single();
        setCashierProfile(profile);
      }

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
    const { data, error } = await supabase.from('payments').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
    if (error) toast.error("Failed to fetch payments.");
    else setPayments(data as Payment[] || []);
  };

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    setStudent(null);
    setPayments([]);
    const { data, error } = await supabase.from("students").select("*, student_types(name)").eq("academic_year_id", values.academic_year_id).eq("roll_number", values.roll_number).single();
    if (error || !data) toast.error("Student not found.");
    else {
      setStudent(data as StudentDetails);
      await fetchStudentFinancials(data.id);
    }
    setIsSearching(false);
  };

  const logActivity = async (action: string, details: object) => {
    if (!sessionUser || !student) return;
    await supabase.from('activity_logs').insert({
      cashier_id: cashierProfile?.id,
      student_id: student.id,
      action,
      details,
    });
  };

  const onPaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!student || !sessionUser) return;
    setIsSubmittingPayment(true);
    const { error } = await supabase.from("payments").insert([{ ...values, student_id: student.id, cashier_id: cashierProfile?.id }]);
    if (error) {
      toast.error(`Payment failed: ${error.message}`);
    } else {
      toast.success("Payment recorded successfully!");
      await logActivity("Fee Collection", values);
      paymentForm.reset({ amount: 0, payment_method: "cash", notes: "", fee_type: "" });
      await fetchStudentFinancials(student.id);
    }
    setIsSubmittingPayment(false);
  };

  const onConcessionSubmit = async (values: z.infer<typeof concessionSchema>) => {
    if (!student || !sessionUser) return;
    setIsSubmittingPayment(true);
    const concessionData = {
      student_id: student.id,
      cashier_id: cashierProfile?.id,
      amount: values.amount,
      payment_method: 'concession',
      fee_type: 'Concession',
      notes: values.notes,
    };
    const { error } = await supabase.from("payments").insert([concessionData]);
    if (error) {
      toast.error(`Concession failed: ${error.message}`);
    } else {
      toast.success("Concession applied successfully!");
      await logActivity("Concession Applied", values);
      concessionForm.reset({ amount: 0, notes: "" });
      await fetchStudentFinancials(student.id);
      setConcessionDialogOpen(false);
    }
    setIsSubmittingPayment(false);
  };

  const { totalDue, totalPaid, balance, feeItemsForCurrentYear } = useMemo(() => {
    if (!student?.fee_details || !student.studying_year) return { totalDue: 0, totalPaid: 0, balance: 0, feeItemsForCurrentYear: [] };
    
    const feeItems = student.fee_details[student.studying_year] || [];
    const totalDue = feeItems.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = payments.reduce((sum, pmt) => sum + pmt.amount, 0);
    const balance = totalDue - totalPaid;
    
    return { totalDue, totalPaid, balance, feeItemsForCurrentYear: feeItems };
  }, [student, payments]);

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
              <div><p className="font-medium">Studying Year</p><p>{student.studying_year}</p></div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle>Fee Structure for {student.studying_year}</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Fee Type</TableHead><TableHead className="text-right">Amount Due</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {feeItemsForCurrentYear.length > 0 ? feeItemsForCurrentYear.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={2} className="text-center">No fee structure defined for this year.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payments.length > 0 ? payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{new Date(p.created_at).toLocaleString()}</TableCell>
                          <TableCell>{p.fee_type}</TableCell>
                          <TableCell><Badge variant={p.payment_method === 'concession' ? 'default' : 'secondary'}>{p.payment_method.toUpperCase()}</Badge></TableCell>
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
                <CardHeader><CardTitle>Fee Summary ({student.studying_year})</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Due:</span><span className="font-medium">{totalDue.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Total Paid:</span><span className="font-medium text-green-600">{totalPaid.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Balance:</span><span>{balance.toFixed(2)}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Collect Payment</CardTitle>
                  {cashierProfile?.has_discount_permission && (
                    <Dialog open={concessionDialogOpen} onOpenChange={setConcessionDialogOpen}>
                      <DialogTrigger asChild><Button variant="secondary" size="sm">Concession</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Apply Concession</DialogTitle></DialogHeader>
                        <Form {...concessionForm}>
                          <form onSubmit={concessionForm.handleSubmit(onConcessionSubmit)} className="space-y-4">
                            <FormField control={concessionForm.control} name="amount" render={({ field }) => (
                              <FormItem><FormLabel>Concession Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={concessionForm.control} name="notes" render={({ field }) => (
                              <FormItem><FormLabel>Reason</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setConcessionDialogOpen(false)}>Cancel</Button>
                              <Button type="submit" disabled={isSubmittingPayment}>{isSubmittingPayment ? "Applying..." : "Apply Concession"}</Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
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