"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Payment, StudentDetails } from "@/types";
import { PrintableReceipt } from "./PrintableReceipt";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

interface PaymentHistoryProps {
  payments: Payment[];
  student: StudentDetails;
}

export function PaymentHistory({ payments, student }: PaymentHistoryProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Overall Payment History</CardTitle>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col sm:max-w-[850px]">
              <DialogHeader className="print-hidden">
                <DialogTitle>Print Preview</DialogTitle>
              </DialogHeader>
              <div className="printable-area flex-grow overflow-auto border rounded-md">
                <div className="print-container p-4">
                  <PrintableReceipt student={student} payments={payments} />
                  <hr className="my-4 border-dashed print-hidden" />
                  <PrintableReceipt student={student} payments={payments} />
                </div>
              </div>
              <DialogFooter className="print-hidden">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Confirm Print
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
    </>
  );
}