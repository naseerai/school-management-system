"use client";

import React from 'react';
import { Payment, StudentDetails } from "@/types";

interface PrintableReceiptProps {
  student: StudentDetails;
  payments: Payment[];
}

export function PrintableReceipt({ student, payments }: PrintableReceiptProps) {
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="receipt-container text-black">
      <header className="text-center mb-4">
        <h1 className="text-xl font-bold text-black">Admin Portal</h1>
        <h2 className="text-lg font-semibold text-black">Fee Receipt</h2>
      </header>
      
      <section className="mb-4 text-sm">
        <div className="flex justify-between">
          <p><strong className="font-bold text-black">Date:</strong> {new Date().toLocaleDateString()}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 mt-2">
          <p><strong className="font-bold text-black">Name:</strong> {student.name}</p>
          <p><strong className="font-bold text-black">Roll No:</strong> {student.roll_number}</p>
          <p><strong className="font-bold text-black">Class:</strong> {student.class}-{student.section}</p>
        </div>
      </section>

      <section className="flex-grow">
        <table className="w-full text-sm border-collapse border border-slate-400">
          <thead>
            <tr>
              <th className="border border-slate-300 p-1 text-left font-bold text-black">Date</th>
              <th className="border border-slate-300 p-1 text-left font-bold text-black">Description</th>
              <th className="border border-slate-300 p-1 text-right font-bold text-black">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="border border-slate-300 p-1">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="border border-slate-300 p-1">{p.fee_type}</td>
                <td className="border border-slate-300 p-1 text-right">{p.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-4 pt-2 border-t text-sm">
        <div className="text-right mb-8">
          <p className="font-bold text-black">Total Paid: {totalPaid.toFixed(2)}</p>
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <p>Student/Parent Signature</p>
          <p>Cashier Signature</p>
        </div>
      </footer>
    </div>
  );
}