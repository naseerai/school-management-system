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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

const editConcessionSchema = z.object({
  amount: z.coerce.number().min(0, "Amount must be a non-negative number"),
});

// Types
type FeeItem = { id: string; name: string; amount: number; concession: number };
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editConcessionDialogOpen, setEditConcessionDialogOpen] = useState(false);
  const [feeToEdit, setFeeToEdit] = useState<FeeItem | null>(null);

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

  const refetchStudent = async () => {
    if (!student) return;
    const { data, error } = await supabase.from("students").select("*, student_types(name)").eq("id", student.id).single();
    if (error || !data) {
        toast.error("Failed to refresh student data.");
        setStudent(null);
    } else {
        setStudent(data as StudentDetails);
        await fetchStudentFinancials(data.id);
    }
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
    setIsSubmitting(true);
    const { error } = await supabase.from("payments").insert([{ ...values, student_id: student.id, cashier_id: cashierProfile?.id }]);
    if (error) {
      toast.error(`Payment failed: ${error.message}`);
    } else {
      toast.success("Payment recorded successfully!");
      await logActivity("Fee Collection", values);
      paymentForm.reset({ amount: 0, payment_method: "cash", notes: "", fee_type: "" });
      await fetchStudentFinancials(student.id);
    }
    setIsSubmitting(false);
  };

  const handleEditConcessionClick = (feeItem: FeeItem) => {
    setFeeToEdit(feeItem);
    editConcessionForm.setValue('amount', feeItem.concession || 0);
    setEditConcessionDialogOpen(true);
  };

  const onEditConcessionSubmit = async (values: z.infer<typeof editConcessionSchema>) => {
    if (!student || !feeToEdit) return;
    setIsSubmitting(true);

    const response = await fetch(`/api/students/${student.id}/concession`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            year: student.studying_year,
            feeItemId: feeToEdit.id,
            concession: values.amount,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        toast.error(`Failed to update concession: ${result.error}`);
    } else {
        toast.success("Concession updated successfully!");
        await logActivity("Concession Edited", { fee: feeToEdit.name, amount: values.amount });
        setEditConcessionDialogOpen(false);
        await refetchStudent();
    }
    setIsSubmitting(false);
  };

  const { totalDue, totalConcession, totalPaid, balance, feeItemsForCurrentYear } = useMemo(() => {
    if (!student?.fee_details || !student.studying_year) return { totalDue: 0, totalConcession: 0, totalPaid: 0, balance: 0, feeItemsForCurrentYear: [] };
    
    const feeItems = student.fee_details[student.studying_year] || [];
    const totalDue = feeItems.reduce((sum, item) => sum + item.amount, 0);
    const definedConcession = feeItems.reduce((sum, item) => sum + (item.concession || 0), 0);
    
    const paymentsOnly = payments.filter(p => p.payment_method !== 'concession');
    const additionalConcessions = payments.filter(p => p.payment_method === 'concession');

    const totalPaid = paymentsOnly.reduce((sum, pmt) => sum + pmt.amount, 0);
    const totalAdditionalConcession = additionalConcessions.reduce((sum, pmt) => sum + pmt.amount, 0);
    
    const totalConcession = definedConcession + totalAdditionalConcession;
    const balance = totalDue - totalConcession - totalPaid;
    
    return { totalDue, totalConcession, totalPaid, balance, feeItemsForCurrentYear: feeItems };
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
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Concession</TableHead>
                        <TableHead className="text-right">Payable</TableHead>
                        {cashierProfile?.has_discount_permission && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItemsForCurrentYear.length > 0 ? feeItemsForCurrentYear.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.amount.toFixed(2)}</TableCell>
                          <TableCell>{(item.concession || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">{(item.amount - (item.concession || 0)).toFixed(2)}</TableCell>
                          {cashierProfile?.has_discount_permission && (
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => handleEditConcessionClick(item)}>
                                Edit
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={cashierProfile?.has_discount_permission ? 5 : 4} className="text-center">No fee structure defined for this year.</TableCell></TableRow>}
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
                  <div className="flex justify-between"><span>Total Concession:</span><span className="font-medium text-orange-600">{totalConcession.toFixed(2)}</span></div>
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
            </div>
          </div>
          <Dialog open={editConcessionDialogOpen} onOpenChange={setEditConcessionDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Concession for {feeToEdit?.name}</DialogTitle>
                </DialogHeader>
                <Form {...editConcessionForm}>
                    <form onSubmit={editConcessionForm.handleSubmit(onEditConcessionSubmit)} className="space-y-4">
                        <FormField
                            control={editConcessionForm.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <Label>Concession Amount</Label>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
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