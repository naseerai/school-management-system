"use client";

import { Printer } from "lucide-react";
import { StudentDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface StudentFeeViewProps {
  student: StudentDetails;
}

export function StudentFeeView({ student }: StudentFeeViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const feeDetails = student.fee_details || {};
  const years = Object.keys(feeDetails).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fee Structure</CardTitle>
            <CardDescription>
              A detailed breakdown of your fee structure across all academic years.
            </CardDescription>
          </div>
          <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 print:hidden">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6 border-b pb-4">
          <div><p className="font-medium">Name</p><p>{student.name}</p></div>
          <div><p className="font-medium">Roll No</p><p>{student.roll_number}</p></div>
          <div><p className="font-medium">Class</p><p>{student.class} - {student.section}</p></div>
          <div><p className="font-medium">Student Type</p><p>{student.student_types?.name}</p></div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Fee Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Concession</TableHead>
              <TableHead className="text-right">Net Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.length > 0 ? (
              years.map(year => (
                feeDetails[year].map((item, index) => (
                  <TableRow key={`${year}-${item.id}`}>
                    {index === 0 && (
                      <TableCell rowSpan={feeDetails[year].length} className="font-medium align-top">
                        {year}
                      </TableCell>
                    )}
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-orange-600">
                      - {item.concession.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {(item.amount - item.concession).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No fee structure details found for this student.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}