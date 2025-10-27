"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Payment, StudentDetails } from "@/types";

interface PaymentHistoryProps {
  payments: Payment[];
  student: StudentDetails;
}

export function PaymentHistory({ payments, student }: PaymentHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Payment History</CardTitle>
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
  );
}