"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Invoice } from "@/hooks/use-fee-collection";
import { InvoicePaymentDialog } from "./InvoicePaymentDialog";
import { StudentDetails, CashierProfile } from "@/hooks/use-fee-collection";

interface OutstandingInvoicesProps {
  invoices: Invoice[];
  studentRecords: StudentDetails[];
  cashierProfile: CashierProfile | null;
  onSuccess: () => void;
  logActivity: (action: string, details: object, studentId: string) => Promise<void>;
}

export function OutstandingInvoices({ invoices, studentRecords, cashierProfile, onSuccess, logActivity }: OutstandingInvoicesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);

  const handlePayClick = (invoice: Invoice) => {
    setInvoiceToPay(invoice);
    setDialogOpen(true);
  };

  if (invoices.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Outstanding Invoices</CardTitle>
          <CardDescription>Collect payments for generated invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Total</TableHead><TableHead>Balance</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.batch_description}</TableCell>
                  <TableCell>{invoice.total_amount.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">{(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)}</TableCell>
                  <TableCell><Button size="sm" onClick={() => handlePayClick(invoice)}>Collect Payment</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {invoiceToPay && (
        <InvoicePaymentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          invoice={invoiceToPay}
          studentRecords={studentRecords}
          cashierProfile={cashierProfile}
          onSuccess={onSuccess}
          logActivity={logActivity}
        />
      )}
    </>
  );
}