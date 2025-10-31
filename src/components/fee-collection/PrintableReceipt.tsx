"use client";

import React from 'react';
import { Payment, StudentDetails } from "@/types";
import { numberToWords } from '@/lib/utils';

interface PrintableReceiptProps {
  student: StudentDetails;
  payment: Payment;
  copyType: "School Management Copy" | "Student Copy";
}

export function PrintableReceipt({ student, payment, copyType }: PrintableReceiptProps) {
  const paymentDate = new Date(payment.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="receipt-container border border-black p-4 text-sm text-black bg-white">
      <header className="text-center mb-4 border-b border-black pb-2">
        <h1 className="text-2xl font-bold">SCHOOL/COLLEGE NAME</h1>
        <p className="text-xs">123 Education Lane, Knowledge City, 500001</p>
        <p className="text-xs">Phone: (123) 456-7890</p>
      </header>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">FEE RECEIPT</h2>
        <p className="font-medium text-xs border border-black px-2 py-1">{copyType}</p>
      </div>

      <section className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 border-b border-black pb-2">
        <div><strong>Receipt No:</strong> {payment.id.substring(0, 8).toUpperCase()}</div>
        <div><strong>Payment Date:</strong> {paymentDate}</div>
        <div><strong>Student Name:</strong> {student.name}</div>
        <div><strong>Roll No:</strong> {student.roll_number}</div>
        <div><strong>Class:</strong> {student.class} - {student.section}</div>
        <div><strong>Academic Year:</strong> {student.academic_years?.year_name || 'N/A'}</div>
      </section>

      <section className="flex-grow mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="p-1 text-left font-bold w-12">S.No.</th>
              <th className="p-1 text-left font-bold">Particulars</th>
              <th className="p-1 text-right font-bold w-32">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-1 align-top">1.</td>
              <td className="p-1 align-top">{payment.fee_type}</td>
              <td className="p-1 text-right align-top">{payment.amount.toFixed(2)}</td>
            </tr>
            {payment.notes && (
              <tr>
                <td></td>
                <td className="p-1 text-xs text-gray-600">({payment.notes})</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <footer className="pt-2 border-t-2 border-black">
        <div className="flex justify-end mb-2">
          <div className="w-1/2">
            <div className="flex justify-between font-bold">
              <span>Total Amount:</span>
              <span>₹{payment.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="mb-8">
          <p><strong>Amount in Words:</strong> {numberToWords(payment.amount)}</p>
        </div>
        <div className="flex justify-between items-end text-xs">
          <p>This is a computer-generated receipt.</p>
          <div className="text-center">
            <div className="h-10"></div>
            <p className="border-t border-black pt-1">Authorized Signatory</p>
          </div>
        </div>
      </footer>
    </div>
  );
}