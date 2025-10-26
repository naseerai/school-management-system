"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Invoice = { id: string; total_amount: number; batch_description: string; };
type FeeItemOption = { label: string; value: string; };

const paymentSchema = z.object({
  fee_type: z.string().min(1, "Fee type is required"),
  other_fee_description: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "upi"]),
  notes: z.string().optional(),
}).refine(data => !(data.fee_type === 'Other' && !data.other_fee_description?.trim()), {
    message: "Description is required for 'Other' fee type.",
    path: ["other_fee_description"],
});

interface PaymentFormCardProps {
  invoices: Invoice[];
  allFeeItems: FeeItemOption[];
  onSubmit: (values: z.infer<typeof paymentSchema>) => void;
  isSubmitting: boolean;
}

export function PaymentFormCard({ invoices, allFeeItems, onSubmit, isSubmitting }: PaymentFormCardProps) {
  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, payment_method: "cash", notes: "", fee_type: "", other_fee_description: "" },
  });
  const watchedFeeType = form.watch("fee_type");

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Others</CardTitle>
        <CardDescription>Collect for outstanding invoices or other fees.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {invoices.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Outstanding Invoices</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.map(invoice => (<TableRow key={invoice.id}><TableCell>{invoice.batch_description}</TableCell><TableCell className="text-right">{invoice.total_amount.toFixed(2)}</TableCell></TableRow>))}
              </TableBody>
            </Table>
          </div>
        )}
        <div>
          <h3 className="font-semibold mb-4 text-sm pt-4 border-t">Collect New Payment</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="fee_type" render={({ field }) => (
                <FormItem><FormLabel>Fee Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select fee type..." /></SelectTrigger></FormControl>
                    <SelectContent>{allFeeItems.map(ft => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}<SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              {watchedFeeType === 'Other' && (
                <FormField control={form.control} name="other_fee_description" render={({ field }) => (
                  <FormItem><FormLabel>Fee Description</FormLabel><FormControl><Input placeholder="e.g., Fine for late submission" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              )}
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="payment_method" render={({ field }) => (
                <FormItem><FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Collect Payment"}</Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}