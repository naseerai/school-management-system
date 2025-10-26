"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FeeItem = { id: string; name: string; amount: number; concession: number };
type FeeStructure = { [year: string]: FeeItem[] };

interface FeeStructureEditorProps {
  value: FeeStructure;
  onChange: (value: FeeStructure) => void;
}

const FIXED_YEARS = ['1st Year', '2nd Year', '3rd Year'];
const FIXED_FEE_TYPES = ['Tuition Fee', 'JVD Fee'];

export function FeeStructureEditor({ value, onChange }: FeeStructureEditorProps) {

  useEffect(() => {
    const isInitialized = value && value[FIXED_YEARS[0]] && value[FIXED_YEARS[0]].length >= FIXED_FEE_TYPES.length;

    if (!isInitialized) {
      const initialStructure: FeeStructure = {};
      FIXED_YEARS.forEach(year => {
        initialStructure[year] = FIXED_FEE_TYPES.map(feeType => ({
          id: crypto.randomUUID(),
          name: feeType,
          amount: 0,
          concession: 0,
        }));
      });
      onChange(initialStructure);
    }
  }, []);

  const handleInputChange = (year: string, feeTypeName: string, field: 'amount' | 'concession', newAmount: string) => {
    const currentValue = value || {};
    const newValue = JSON.parse(JSON.stringify(currentValue));
    
    if (!newValue[year]) {
        newValue[year] = [];
    }

    let feeItem = newValue[year].find((item: FeeItem) => item.name === feeTypeName);
    
    if (!feeItem) {
        feeItem = { id: crypto.randomUUID(), name: feeTypeName, amount: 0, concession: 0 };
        newValue[year].push(feeItem);
    }

    feeItem[field] = parseFloat(newAmount) || 0;
    onChange(newValue);
  };

  const getFeeItem = (year: string, feeType: string): FeeItem | undefined => {
    return value?.[year]?.find(item => item.name === feeType);
  };

  if (!value || !value[FIXED_YEARS[0]]) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Fee Structure</CardTitle>
                  <CardDescription>Define the fee structure for each academic year of the student's course.</CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-4">Initializing fee structure...</p>
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Fee Structure</CardTitle>
          <CardDescription>Define the fee structure for each academic year of the student's course.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full border">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background border-r min-w-[200px]">Fee Type</TableHead>
                {FIXED_YEARS.map(year => (
                  <TableHead key={year} className="text-center border-l min-w-[250px]">
                    {year}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FIXED_FEE_TYPES.map(feeType => (
                <TableRow key={feeType}>
                  <TableCell className="font-medium sticky left-0 z-10 bg-background border-r">
                    {feeType}
                  </TableCell>
                  {FIXED_YEARS.map(year => {
                    const item = getFeeItem(year, feeType);
                    return (
                      <TableCell key={year} className="border-l">
                        <div className="flex gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`${year}-${feeType}-amount`} className="text-xs">Amount</Label>
                            <Input
                              id={`${year}-${feeType}-amount`}
                              type="number"
                              value={item?.amount || 0}
                              onChange={(e) => handleInputChange(year, feeType, 'amount', e.target.value)}
                              className="h-8"
                            />
                          </div>
                          {feeType === 'Tuition Fee' && (
                            <div className="space-y-1">
                              <Label htmlFor={`${year}-${feeType}-concession`} className="text-xs">Concession</Label>
                              <Input
                                id={`${year}-${feeType}-concession`}
                                type="number"
                                value={item?.concession || 0}
                                onChange={(e) => handleInputChange(year, feeType, 'concession', e.target.value)}
                                className="h-8"
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}