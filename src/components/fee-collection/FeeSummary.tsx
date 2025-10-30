"use client";

import React from "react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { FeeSummaryTable, FeeSummaryTableData } from "@/components/fee-collection/FeeSummaryTable";
import { PaymentDialog } from "@/components/fee-collection/PaymentDialog";
import { EditConcessionDialog } from "@/components/fee-collection/EditConcessionDialog";
import { StudentDetails, Payment, CashierProfile } from "@/types";
import { PrintableReceipt } from "./PrintableReceipt";

interface FeeSummaryProps {
  studentRecords: StudentDetails[];
  payments: Payment[];
  cashierProfile: CashierProfile | null;
  onSuccess: () => void;
  logActivity: (action: string, details: object, studentId: string) => Promise<void>;
}

export function FeeSummary({ studentRecords, payments, cashierProfile, onSuccess, logActivity }: FeeSummaryProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editConcessionDialogOpen, setEditConcessionDialogOpen] = useState(false);
  const [paymentDialogInitialState, setPaymentDialogInitialState] = useState<{ fee_item_name: string, payment_year: string } | null>(null);
  const [paymentToPrint, setPaymentToPrint] = useState<Payment | null>(null);

  const handlePrint = (payment: Payment) => {
    setPaymentToPrint(payment);
    setTimeout(() => {
      window.print();
      // Clear after printing to remove the print-only content from the DOM
      setTimeout(() => setPaymentToPrint(null), 100);
    }, 100);
  };

  const handlePaymentSuccess = (newPayment: Payment) => {
    onSuccess();
    toast.success("Payment recorded successfully!");
    handlePrint(newPayment);
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

  const handlePayClick = (feeType: string) => {
    const currentRecord = studentRecords.find(r => r.academic_years?.is_active) || studentRecords[studentRecords.length - 1];
    const currentStudyingYear = currentRecord?.studying_year || "";

    setPaymentDialogInitialState({ fee_item_name: feeType, payment_year: currentStudyingYear });
    setPaymentDialogOpen(true);
  };

  const handleCollectOtherClick = () => {
    setPaymentDialogInitialState({ fee_item_name: "", payment_year: "Other" });
    setPaymentDialogOpen(true);
  };

  return (
    <>
      {paymentToPrint && studentRecords.length > 0 && (
        <div className="print-only">
          <div className="print-container">
            <div className="print-receipt">
              <PrintableReceipt student={studentRecords[0]} payments={[paymentToPrint]} />
            </div>
            <div className="print-receipt">
              <PrintableReceipt student={studentRecords[0]} payments={[paymentToPrint]} />
            </div>
          </div>
        </div>
      )}
      <FeeSummaryTable
        data={feeSummaryData}
        onPay={handlePayClick}
        onCollectOther={handleCollectOtherClick}
        hasDiscountPermission={cashierProfile?.has_discount_permission || false}
        onEditConcession={() => setEditConcessionDialogOpen(true)}
      />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        studentRecords={studentRecords}
        payments={payments}
        cashierProfile={cashierProfile}
        onSuccess={handlePaymentSuccess}
        logActivity={logActivity}
        initialState={paymentDialogInitialState}
      />
      <EditConcessionDialog
        open={editConcessionDialogOpen}
        onOpenChange={setEditConcessionDialogOpen}
        studentRecords={studentRecords}
        onSuccess={onSuccess}
        logActivity={logActivity}
      />
    </>
  );
}