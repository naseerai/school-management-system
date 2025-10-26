"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialSummaryProps {
  summary: {
    totalDue: number;
    totalConcession: number;
    totalPaid: number;
    outstandingInvoiceTotal: number;
    balance: number;
  };
}

export function FinancialSummary({ summary }: FinancialSummaryProps) {
  return (
    <Card className="print:hidden">
      <CardHeader><CardTitle>Overall Financial Summary</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div><p className="font-medium">Total Due</p><p>{summary.totalDue.toFixed(2)}</p></div>
        <div><p className="font-medium text-orange-600">Total Concession</p><p className="text-orange-600">{summary.totalConcession.toFixed(2)}</p></div>
        <div><p className="font-medium text-green-600">Total Paid</p><p className="text-green-600">{summary.totalPaid.toFixed(2)}</p></div>
        <div><p className="font-medium text-red-600">Outstanding Invoices</p><p className="text-red-600">{summary.outstandingInvoiceTotal.toFixed(2)}</p></div>
        <div><p className="font-bold text-base">Overall Balance</p><p className="font-bold text-base">{summary.balance.toFixed(2)}</p></div>
      </CardContent>
    </Card>
  );
}