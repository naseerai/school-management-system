"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Payment, StudentDetails } from "@/types";
import { PrintableReceipt } from "./PrintableReceipt";

interface PaymentHistoryProps {
  payments: Payment[];
  student: StudentDetails;
  isReadOnly?: boolean;
}

export function PaymentHistory({ payments, student, isReadOnly = false }: PaymentHistoryProps) {
  const [paymentToPrint, setPaymentToPrint] = useState<Payment | null>(null);

  const handlePrint = (payment: Payment) => {
    setPaymentToPrint(payment);
    setTimeout(() => {
      window.print();
      // Clear after printing
      setTimeout(() => setPaymentToPrint(null), 100);
    }, 100);
  };

  return (
    <>
      <Card className="print-hidden">
        <CardHeader>
          <CardTitle>Overall Payment History</CardTitle>
        </CardHeader>
        <CardContent>
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
              {payments.length > 0 ? (
                payments.map(p => (
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
                  <TableCell colSpan={isReadOnly ? 3 : 4} className="text-center">No payments recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {paymentToPrint && (
        <div className="print-only">
          <div className="print-container">
            <div className="receipt-wrapper">
              <PrintableReceipt student={student} payment={paymentToPrint} copyType="School Management Copy" />
            </div>
            <div className="receipt-wrapper">
              <PrintableReceipt student={student} payment={paymentToPrint} copyType="Student Copy" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}