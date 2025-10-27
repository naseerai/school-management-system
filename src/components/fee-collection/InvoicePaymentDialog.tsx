"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Invoice, StudentDetails, CashierProfile } from "@/hooks/use-fee-collection";

const invoicePaymentSchema = z.object({
  payment_year: z.string().min(1, "Please select a year"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi"]),
  notes: z.string().optional(),
});

interface InvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  studentRecords: StudentDetails[];
  cashierProfile: CashierProfile | null;
  onSuccess: () => void;
  logActivity: (action: string, details: object, studentId: string) => Promise<void>;
}

export function InvoicePaymentDialog({ open, onOpenChange, invoice, studentRecords, cashierProfile, onSuccess, logActivity }: InvoicePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof invoicePaymentSchema>>({
    resolver: zodResolver(invoicePaymentSchema),
  });

  const masterFeeDetails = studentRecords.length > 0 ? studentRecords[studentRecords.length - 1].fee_details || {} : {};
  const currentYearRecord = studentRecords.find(r => r.academic_years?.is_active);

  useEffect(() => {
    if (invoice) {
      const remainingBalance = invoice.total_amount - (invoice.paid_amount || 0);
      form.reset({
        payment_year: currentYearRecord?.studying_year || '',
        amount: parseFloat(remainingBalance.toFixed(2)),
        payment_method: "cash",
        notes: ""
      });
    }
  }, [invoice, currentYearRecord, form]);

  const onSubmit = async (values: z.infer<typeof invoicePaymentSchema>) => {
    if (!studentRecords[0] || !cashierProfile) {
      toast.error("Cannot process payment. Missing context.");
      return;
    }
    setIsSubmitting(true);

    const paymentData = {
      student_id: studentRecords[0].id,
      cashier_id: cashierProfile.id,
      amount: values.amount,
      payment_method: values.payment_method,
      fee_type: `${values.payment_year} - Invoice: ${invoice.batch_description}`,
      notes: values.notes,
    };

    const { error: paymentError } = await supabase.from('payments').insert(paymentData);
    if (paymentError) {
      toast.error(`Payment failed: ${paymentError.message}`);
      setIsSubmitting(false);
      return;
    }

    const newPaidAmount = (invoice.paid_amount || 0) + values.amount;
    const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'unpaid';

    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({ paid_amount: newPaidAmount, status: newStatus })
      .eq('id', invoice.id);

    if (invoiceError) {
      toast.error(`Payment recorded, but failed to update invoice status: ${invoiceError.message}`);
    } else {
      toast.success("Invoice payment recorded successfully!");
      await logActivity("Invoice Payment", { description: invoice.batch_description, amount: values.amount }, studentRecords[0].id);
    }

    onOpenChange(false);
    onSuccess();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Collect Invoice Payment</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <p><strong>Description:</strong> {invoice?.batch_description}</p>
          <p><strong>Total Amount:</strong> {invoice?.total_amount.toFixed(2)}</p>
          <p><strong>Remaining Balance:</strong> {((invoice?.total_amount || 0) - (invoice?.paid_amount || 0)).toFixed(2)}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="payment_year" render={({ field }) => (
              <FormItem><FormLabel>Academic Year</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.keys(masterFeeDetails).map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem><FormLabel>Amount to Collect</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="payment_method" render={({ field }) => (
              <FormItem><FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem></SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Confirm Payment"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}