"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Print } from "lucide-react";

type Payment = { id: string; created_at: string; fee_type: string; amount: number; };

interface PaymentHistoryCardProps {
  payments: Payment[];
}

export function PaymentHistoryCard({ payments }: PaymentHistoryCardProps) {
  return (
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
  );
}