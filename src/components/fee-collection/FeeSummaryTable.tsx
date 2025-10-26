"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FeeSummaryCell = {
  total: number;
  paid: number;
  pending: number;
};

export type FeeSummaryTableData = {
  years: string[];
  feeTypes: string[];
  cellData: {
    [year: string]: {
      [feeType: string]: FeeSummaryCell;
    };
  };
  yearlyTotals: {
    [year: string]: {
      total: number;
      paid: number;
      pending: number;
      concession: number;
    };
  };
  overallTotals: {
    total: number;
    paid: number;
    pending: number;
    concession: number;
  };
};

interface FeeSummaryTableProps {
  data: FeeSummaryTableData | null;
  onPay: (feeType: string) => void;
  onCollectOther: () => void;
}

export function FeeSummaryTable({ data, onPay, onCollectOther }: FeeSummaryTableProps) {
  if (!data) return null;

  const { years, feeTypes, cellData, yearlyTotals, overallTotals } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Fee Summary</CardTitle>
            <CardDescription>Detailed breakdown of fees across all academic years.</CardDescription>
        </div>
        <Button onClick={onCollectOther}>Collect Other Payment</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full border">
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="sticky left-0 z-10 bg-background border-r min-w-[150px] align-middle">Fee Type</TableHead>
                {years.map(year => (
                  <TableHead key={year} colSpan={3} className="text-center border-l">{year}</TableHead>
                ))}
                <TableHead rowSpan={2} className="border-l align-middle">Overall Balance</TableHead>
                <TableHead rowSpan={2} className="border-l align-middle">Actions</TableHead>
              </TableRow>
              <TableRow>
                {years.map(year => (
                    <React.Fragment key={`${year}-cols`}>
                        <TableHead className="text-center border-l">Total</TableHead>
                        <TableHead className="text-center">Paid</TableHead>
                        <TableHead className="text-center">Balance</TableHead>
                    </React.Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeTypes.map(feeType => (
                <TableRow key={feeType}>
                  <TableCell className="font-medium sticky left-0 z-10 bg-background border-r">{feeType}</TableCell>
                  {years.map(year => {
                    const cell = cellData[year]?.[feeType] || { total: 0, paid: 0, pending: 0 };
                    return (
                      <React.Fragment key={year}>
                        <TableCell className="text-center border-l">{cell.total.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-green-600">{cell.paid.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-red-600 font-medium">{cell.pending.toFixed(2)}</TableCell>
                      </React.Fragment>
                    );
                  })}
                  <TableCell className="text-center font-bold border-l text-red-600">
                    {(() => {
                      const rowPending = years.reduce((sum, year) => sum + (cellData[year]?.[feeType]?.pending || 0), 0);
                      return rowPending.toFixed(2);
                    })()}
                  </TableCell>
                  <TableCell className="text-center border-l">
                    <Button size="sm" variant="outline" onClick={() => onPay(feeType)}>Pay</Button>
                  </TableCell>
                </TableRow>
              ))}
              
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell className="sticky left-0 z-10 bg-muted/50 border-r">Concession</TableCell>
                {years.map(year => (
                  <TableCell key={year} colSpan={3} className="text-center text-orange-600 border-l">
                    - {yearlyTotals[year].concession.toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="text-center text-orange-600 border-l">
                  - {overallTotals.concession.toFixed(2)}
                </TableCell>
                <TableCell className="border-l"></TableCell>
              </TableRow>

              <TableRow className="bg-muted/50 font-bold text-sm">
                <TableCell className="sticky left-0 z-10 bg-muted/50 border-r">Fee Due</TableCell>
                {years.map(year => {
                  const yearTotal = yearlyTotals[year];
                  return (
                    <React.Fragment key={year}>
                        <TableCell className="text-center border-l">{(yearTotal.total - yearTotal.concession).toFixed(2)}</TableCell>
                        <TableCell className="text-center text-green-600">{yearTotal.paid.toFixed(2)}</TableCell>
                        <TableCell className="text-center text-red-600">{yearTotal.pending.toFixed(2)}</TableCell>
                    </React.Fragment>
                  );
                })}
                <TableCell className="text-center border-l text-red-600">
                  {overallTotals.pending.toFixed(2)}
                </TableCell>
                <TableCell className="border-l"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}