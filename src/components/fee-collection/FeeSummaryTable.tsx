"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

export function FeeSummaryTable({ data }: FeeSummaryTableProps) {
  if (!data) return null;

  const { years, feeTypes, cellData, yearlyTotals, overallTotals } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full border">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background border-r">Fee Type</TableHead>
                {years.map(year => (
                  <TableHead key={year} className="text-center whitespace-nowrap">{year}</TableHead>
                ))}
                <TableHead className="text-center font-bold border-l">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeTypes.map(feeType => (
                <TableRow key={feeType}>
                  <TableCell className="font-medium sticky left-0 z-10 bg-background border-r">{feeType}</TableCell>
                  {years.map(year => {
                    const cell = cellData[year]?.[feeType] || { total: 0, paid: 0, pending: 0 };
                    return (
                      <TableCell key={year} className="text-center">
                        {cell.total > 0 ? (
                          <div className="text-xs space-y-1">
                            <div><span className="font-semibold">T:</span> {cell.total.toFixed(2)}</div>
                            <div className="text-green-600"><span className="font-semibold">P:</span> {cell.paid.toFixed(2)}</div>
                            <div className="text-red-600"><span className="font-semibold">B:</span> {cell.pending.toFixed(2)}</div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-semibold border-l">
                    {(() => {
                      const rowTotal = years.reduce((sum, year) => sum + (cellData[year]?.[feeType]?.total || 0), 0);
                      const rowPaid = years.reduce((sum, year) => sum + (cellData[year]?.[feeType]?.paid || 0), 0);
                      const rowPending = years.reduce((sum, year) => sum + (cellData[year]?.[feeType]?.pending || 0), 0);
                       return (
                          <div className="text-xs space-y-1">
                            <div><span className="font-semibold">T:</span> {rowTotal.toFixed(2)}</div>
                            <div className="text-green-600"><span className="font-semibold">P:</span> {rowPaid.toFixed(2)}</div>
                            <div className="text-red-600"><span className="font-semibold">B:</span> {rowPending.toFixed(2)}</div>
                          </div>
                        );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
              
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell className="sticky left-0 z-10 bg-muted/50 border-r">Concession</TableCell>
                {years.map(year => (
                  <TableCell key={year} className="text-center text-orange-600">
                    - {yearlyTotals[year].concession.toFixed(2)}
                  </TableCell>
                ))}
                <TableCell className="text-center text-orange-600 border-l">
                  - {overallTotals.concession.toFixed(2)}
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/50 font-bold text-sm">
                <TableCell className="sticky left-0 z-10 bg-muted/50 border-r">Fee Due</TableCell>
                {years.map(year => {
                  const yearTotal = yearlyTotals[year];
                  const payable = yearTotal.total - yearTotal.concession;
                  return (
                    <TableCell key={year} className="text-center">
                      <div className="text-xs space-y-1">
                        <div><span className="font-semibold">T:</span> {payable.toFixed(2)}</div>
                        <div className="text-green-600"><span className="font-semibold">P:</span> {yearTotal.paid.toFixed(2)}</div>
                        <div className="text-red-600"><span className="font-semibold">B:</span> {yearTotal.pending.toFixed(2)}</div>
                      </div>
                    </TableCell>
                  );
                })}
                <TableCell className="text-center border-l">
                  <div className="text-xs space-y-1">
                    <div><span className="font-semibold">T:</span> {(overallTotals.total - overallTotals.concession).toFixed(2)}</div>
                    <div className="text-green-600"><span className="font-semibold">P:</span> {overallTotals.paid.toFixed(2)}</div>
                    <div className="text-red-600"><span className="font-semibold">B:</span> {overallTotals.pending.toFixed(2)}</div>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}