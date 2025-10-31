"use client";

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { StudentDetails, Payment, Invoice } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StudentDetailsCard } from "@/components/fee-collection/StudentDetailsCard";
import { FeeSummaryTable, FeeSummaryTableData } from "@/components/fee-collection/FeeSummaryTable";
import { OutstandingInvoices } from "@/components/fee-collection/OutstandingInvoices";
import { PaymentHistory } from "@/components/fee-collection/PaymentHistory";

export default function StudentFeesPage() {
  const [rollNumber, setRollNumber] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [studentRecords, setStudentRecords] = useState<StudentDetails[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber) {
      toast.error("Please enter a Roll Number.");
      return;
    }
    setIsLoading(true);
    setStudentRecords([]);
    setPayments([]);
    setInvoices([]);

    try {
      const response = await fetch('/api/student-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNumber, academicYear }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An unknown error occurred.');
      }

      setStudentRecords(data.studentRecords || []);
      setPayments(data.payments || []);
      setInvoices(data.invoices || []);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const feeSummaryData: FeeSummaryTableData | null = useMemo(() => {
    if (studentRecords.length === 0) return null;

    const mergedFeeDetails = studentRecords.reduce<{[year: string]: any[]}>((acc, record) => {
        if (record.fee_details) {
            Object.assign(acc, record.fee_details);
        }
        return acc;
    }, {});

    const years = Object.keys(mergedFeeDetails).sort();
    const allFeeTypeNames = new Set<string>();
    Object.values(mergedFeeDetails).forEach(items => {
        (items || []).forEach(item => allFeeTypeNames.add(item.name));
    });
    const feeTypes = Array.from(allFeeTypeNames).sort();

    const paymentsByYearAndType: { [year: string]: { [feeType: string]: number } } = {};
    payments.forEach(p => {
        const parts = p.fee_type.split(' - ');
        if (parts.length >= 2) {
            const year = parts[0].trim();
            const feeType = parts.slice(1).join(' - ').trim();
            
            if (!paymentsByYearAndType[year]) {
                paymentsByYearAndType[year] = {};
            }
            
            paymentsByYearAndType[year][feeType] = (paymentsByYearAndType[year][feeType] || 0) + p.amount;
        }
    });

    const cellData: FeeSummaryTableData['cellData'] = {};
    const yearlyTotals: FeeSummaryTableData['yearlyTotals'] = {};

    years.forEach(year => {
        cellData[year] = {};
        yearlyTotals[year] = { total: 0, paid: 0, pending: 0, concession: 0 };
        const feeItemsForYear = mergedFeeDetails[year] || [];

        feeTypes.forEach(feeType => {
            const feeItem = feeItemsForYear.find(item => item.name === feeType);
            if (feeItem) {
                const total = feeItem.amount;
                const concession = feeItem.concession || 0;
                const paid = paymentsByYearAndType[year]?.[feeType] || 0;
                const pending = Math.max(0, total - concession - paid);

                cellData[year][feeType] = { total, paid, pending };

                yearlyTotals[year].total += total;
                yearlyTotals[year].paid += paid;
                yearlyTotals[year].concession += concession;
            } else {
                cellData[year][feeType] = { total: 0, paid: 0, pending: 0 };
            }
        });
        yearlyTotals[year].pending = Math.max(0, yearlyTotals[year].total - yearlyTotals[year].concession - yearlyTotals[year].paid);
    });

    const overallTotals: FeeSummaryTableData['overallTotals'] = { total: 0, paid: 0, pending: 0, concession: 0 };
    Object.values(yearlyTotals).forEach(yearTotal => {
        overallTotals.total += yearTotal.total;
        overallTotals.paid += yearTotal.paid;
        overallTotals.concession += yearTotal.concession;
    });
    overallTotals.pending = Math.max(0, overallTotals.total - overallTotals.concession - overallTotals.paid);

    return { years, feeTypes, cellData, yearlyTotals, overallTotals };
  }, [studentRecords, payments]);

  const student = studentRecords.length > 0 ? studentRecords[0] : null;

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-6xl space-y-6">
        <div className="print-hidden">
          <Card>
            <CardHeader>
              <CardTitle>Student Fee Portal</CardTitle>
              <CardDescription>Enter your details to view your fee structure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
                <div className="flex-grow">
                  <label htmlFor="roll_number" className="text-sm font-medium">Roll Number</label>
                  <Input
                    id="roll_number"
                    placeholder="Enter your roll number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>
                <div className="flex-grow">
                  <label htmlFor="academic_year" className="text-sm font-medium">Academic Year (Optional)</label>
                  <Input
                    id="academic_year"
                    placeholder="e.g., 2024-2025"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {student && (
          <div className="print-area space-y-6">
            <StudentDetailsCard student={student} />
            
            <FeeSummaryTable data={feeSummaryData} isReadOnly={true} />

            <OutstandingInvoices 
              invoices={invoices} 
              studentRecords={studentRecords} 
              cashierProfile={null} 
              onSuccess={() => {}} 
              logActivity={async () => {}} 
              isReadOnly={true} 
            />

            <PaymentHistory payments={payments} student={student} isReadOnly={true} />
          </div>
        )}
      </div>
    </div>
  );
}