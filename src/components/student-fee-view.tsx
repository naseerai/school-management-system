"use client";

import { useMemo } from "react";
import { StudentDetails, Payment, Invoice } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentDetailsCard } from "@/components/fee-collection/StudentDetailsCard";
import { FeeSummaryTable, FeeSummaryTableData } from "@/components/fee-collection/FeeSummaryTable";
import { OutstandingInvoices } from "@/components/fee-collection/OutstandingInvoices";
import { PaymentHistory } from "@/components/fee-collection/PaymentHistory";

interface StudentFeeViewProps {
  studentRecords: StudentDetails[];
  payments: Payment[];
  invoices: Invoice[];
}

export function StudentFeeView({ studentRecords, payments, invoices }: StudentFeeViewProps) {
  const student = studentRecords[studentRecords.length - 1];

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
        const feeItemsForYear = mergedFeeDetails[year] || [];

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
  }, [studentRecords, payments]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Fee Details</CardTitle>
          <CardDescription>
            A complete overview of your fees, payments, and outstanding balances.
          </CardDescription>
        </CardHeader>
      </Card>
      
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
  );
}