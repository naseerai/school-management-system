"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Print } from "lucide-react";
import { Payment, StudentDetails } from "@/types";
import { PrintableReceipt } from "./PrintableReceipt";

interface PaymentHistoryProps {
  payments: Payment[];
  student: StudentDetails;
}

export function PaymentHistory({ payments, student }: PaymentHistoryProps) {
  return (
    <>
      <Card className="print:hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Overall Payment History</CardTitle>
          </div>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Print className="h-4 w-4" />
            <span className="sr-only">Print Receipt</span>
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
      <div className="hidden print:block print-only">
        <div className="print-container">
          <PrintableReceipt student={student} payments={payments} />
          <PrintableReceipt student={student} payments={payments} />
        </div>
      </div>
    </>
  );
}