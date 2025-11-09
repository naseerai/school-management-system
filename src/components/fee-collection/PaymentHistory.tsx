"use client";
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { Payment, StudentDetails, CashierProfile } from "@/types";
import { generateReceiptHtml } from '@/lib/receipt-generator';
import { toast } from 'sonner';

interface PaymentHistoryProps {
  payments: Payment[];
  student: StudentDetails;
  cashierProfile?: CashierProfile | null;
  isReadOnly?: boolean;
}

export function PaymentHistory({ payments, student, cashierProfile = null, isReadOnly = false }: PaymentHistoryProps) {
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [feeTypeFilter, setFeeTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { years, feeTypes } = useMemo(() => {
    const yearSet = new Set<string>();
    const feeTypeSet = new Set<string>();
    payments.forEach(p => {
      const parts = p.fee_type.split(' - ');
      if (parts.length > 1) {
        yearSet.add(parts[0].trim());
        feeTypeSet.add(parts.slice(1).join(' - ').trim());
      } else {
        feeTypeSet.add(p.fee_type);
      }
    });
    return {
      years: Array.from(yearSet).sort(),
      feeTypes: Array.from(feeTypeSet).sort(),
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const [year, ...feeTypeParts] = p.fee_type.split(' - ');
      const feeType = feeTypeParts.join(' - ').trim();

      const yearMatch = yearFilter === 'all' || year.trim() === yearFilter;
      const feeTypeMatch = feeTypeFilter === 'all' || feeType === feeTypeFilter;
      const searchMatch = searchTerm === '' || p.fee_type.toLowerCase().includes(searchTerm.toLowerCase());

      return yearMatch && feeTypeMatch && searchMatch;
    });
  }, [payments, yearFilter, feeTypeFilter, searchTerm]);

  const handlePrint = (payment: Payment) => {
    const receiptHtml = generateReceiptHtml(student, payment, cashierProfile?.name || null);
    const printWindow = window.open('', '_blank', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      toast.error("Could not open print window. Please disable your pop-up blocker.");
    }
  };

  return (
    <Card className="print-hidden">
      <CardHeader>
        <CardTitle>Overall Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Year..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={feeTypeFilter} onValueChange={setFeeTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by Fee Type..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fee Types</SelectItem>
              {feeTypes.map(ft => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-auto flex-grow"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length > 0 ? (
              filteredPayments.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{p.fee_type}</TableCell>
                  <TableCell className="text-right">₹{p.amount.toFixed(2)}</TableCell>
                  {!isReadOnly && (
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handlePrint(p)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isReadOnly ? 3 : 4} className="text-center">No payments found for the selected filters.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}