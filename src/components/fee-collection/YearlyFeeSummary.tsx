"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type FeeItem = { id: string; name: string; amount: number; concession: number };
type StudentDetails = { id: string; studying_year: string; };
type CashierProfile = { has_discount_permission: boolean; };
type YearlySummary = {
  year: string;
  feeItems: FeeItem[];
  totalDue: number;
  totalConcession: number;
  totalPaid: number;
  balance: number;
  studentRecordForYear: StudentDetails | undefined;
};

interface YearlyFeeSummaryProps {
  yearlySummaries: YearlySummary[];
  cashierProfile: CashierProfile | null;
  onEditConcession: (feeItem: FeeItem, studentRecord: StudentDetails) => void;
}

export function YearlyFeeSummary({ yearlySummaries, cashierProfile, onEditConcession }: YearlyFeeSummaryProps) {
  return (
    <div className="w-full print:hidden space-y-4">
      {yearlySummaries.map((summary) => (
        <Card key={summary.year}>
          <CardHeader>
            <div className="flex justify-between w-full">
              <CardTitle>{summary.year}</CardTitle>
              <Badge variant={summary.balance > 0 ? "destructive" : "default"}>
                Balance: {summary.balance.toFixed(2)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Fee Type</TableHead><TableHead>Amount</TableHead><TableHead>Concession</TableHead><TableHead className="text-right">Payable</TableHead>{cashierProfile?.has_discount_permission && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
              <TableBody>
                {summary.feeItems.length > 0 ? summary.feeItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.amount.toFixed(2)}</TableCell>
                    <TableCell>{(item.concession || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{(item.amount - (item.concession || 0)).toFixed(2)}</TableCell>
                    {cashierProfile?.has_discount_permission && summary.studentRecordForYear && <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onEditConcession(item, summary.studentRecordForYear!)}>Edit</Button></TableCell>}
                  </TableRow>
                )) : <TableRow><TableCell colSpan={cashierProfile?.has_discount_permission ? 5 : 4} className="text-center">No fee structure defined for this year.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="grid grid-cols-4 gap-4 text-sm mt-4 border-t pt-4">
              <div><p className="font-medium">Yearly Due</p><p>{summary.totalDue.toFixed(2)}</p></div>
              <div><p className="font-medium text-orange-600">Yearly Concession</p><p className="text-orange-600">{summary.totalConcession.toFixed(2)}</p></div>
              <div><p className="font-medium text-green-600">Yearly Paid</p><p className="text-green-600">{summary.totalPaid.toFixed(2)}</p></div>
              <div><p className="font-medium">Yearly Balance</p><p>{summary.balance.toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}