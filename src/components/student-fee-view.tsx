"use client";

import { useMemo } from "react";
import { Printer } from "lucide-react";
import { StudentDetails, Payment, Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentDetailsCard } from "@/components/fee-collection/StudentDetailsCard";
import { FeeSummaryTable, FeeSummaryTableData } from "@/components/fee-collection/FeeSummaryTable";
import { OutstandingInvoices } from "@/components/fee-collection/OutstandingInvoices";
import { PaymentHistory } from "@/components/fee-collection/PaymentHistory";

interface StudentFeeViewProps {
  student: StudentDetails;
  payments: Payment[];
  invoices: Invoice[];
}

export function StudentFeeView({ student, payments, invoices }: StudentFeeViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const feeSummaryData: FeeSummaryTableData | null = useMemo(() => {
    if (!student) return null;

    const masterFeeDetails = student.fee_details || {};
    const years = Object.keys(masterFeeDetails).sort();
    const allFeeTypeNames = new Set<string>();
    Object.values(masterFeeDetails).forEach(items => {
        items.forEach(item => allFeeTypeNames.add(item.name));
    });
    const feeTypes = Array.from(allFeeTypeNames).sort();

    const paymentsByFeeType: { [type: string]: number } = {};
    payments.forEach(p => {
        paymentsByFeeType[p.fee_type] = (paymentsByFeeType[p.fee_type] || 0) + p.amount;
    });

    const cellData: FeeSummaryTableData['cellData'] = {};
    const yearlyTotals: FeeSummaryTableData['yearlyTotals'] = {};

    years.forEach(year => {
        cellData[year] = {};
        yearlyTotals[year] = { total: 0, paid: 0, pending: 0, concession: 0 };
        const feeItemsForYear = masterFeeDetails[year] || [];

        feeTypes.forEach(feeType => {
            const feeItem = feeItemsForYear.find(item => item.name === feeType);
            if (feeItem) {
                const total = feeItem.amount;
                const concession = feeItem.concession || 0;
                const paid = paymentsByFeeType[`${year} - ${feeType}`] || 0;
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
  }, [student, payments]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Fee Details</CardTitle>
              <CardDescription>
                A complete overview of your fees, payments, and outstanding balances.
              </CardDescription>
            </div>
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 print-hidden">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </CardHeader>
      </Card>
      
      <StudentDetailsCard student={student} />
      
      <FeeSummaryTable data={feeSummaryData} isReadOnly={true} />

      <OutstandingInvoices 
        invoices={invoices} 
        studentRecords={[student]} 
        cashierProfile={null} 
        onSuccess={() => {}} 
        logActivity={async () => {}} 
        isReadOnly={true} 
      />

      <PaymentHistory payments={payments} student={student} isReadOnly={true} />
    </div>
  );
}