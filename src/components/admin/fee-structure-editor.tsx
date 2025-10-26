"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type FeeItem = { id: string; name: string; amount: number; concession: number };
type FeeStructure = { [year: string]: FeeItem[] };

interface FeeStructureEditorProps {
  value: FeeStructure;
  onChange: (value: FeeStructure) => void;
}

const FIXED_YEARS = ['1st Year', '2nd Year', '3rd Year'];
const BASE_FEE_TYPES = ['Tuition Fee', 'JVD Fee'];

export function FeeStructureEditor({ value, onChange }: FeeStructureEditorProps) {
  const [feeTypeDialogOpen, setFeeTypeDialogOpen] = useState(false);
  const [newFeeTypeName, setNewFeeTypeName] = useState("");

  // Initialize the structure if it's empty or malformed
  useEffect(() => {
    const isInitialized = value && FIXED_YEARS.every(year => value[year]);
    if (!isInitialized) {
      const initialStructure: FeeStructure = {};
      FIXED_YEARS.forEach(year => {
        initialStructure[year] = BASE_FEE_TYPES.map(feeType => ({
          id: crypto.randomUUID(),
          name: feeType,
          amount: 0,
          concession: 0,
        }));
      });
      onChange(initialStructure);
    }
  }, []); // Run only once on mount

  const allFeeTypes = Array.from(new Set(Object.values(value || {}).flat().map(item => item.name))).sort();
  // Ensure base types are present and ordered correctly
  const otherFeeTypes = allFeeTypes.filter(ft => !BASE_FEE_TYPES.includes(ft));
  const feeTypes = [...BASE_FEE_TYPES, ...otherFeeTypes];


  const handleAddFeeType = () => {
    const trimmedFeeType = newFeeTypeName.trim();
    if (!trimmedFeeType) {
      toast.error("Fee type name cannot be empty.");
      return;
    }
    if (feeTypes.includes(trimmedFeeType)) {
      toast.error(`Fee type "${trimmedFeeType}" already exists.`);
      return;
    }
    const newValue = JSON.parse(JSON.stringify(value));
    FIXED_YEARS.forEach(year => {
      if (!newValue[year]) newValue[year] = [];
      newValue[year].push({
        id: crypto.randomUUID(),
        name: trimmedFeeType,
        amount: 0,
        concession: 0,
      });
    });
    onChange(newValue);
    setNewFeeTypeName("");
    setFeeTypeDialogOpen(false);
  };

  const handleDeleteFeeType = (feeTypeToDelete: string) => {
    if (BASE_FEE_TYPES.includes(feeTypeToDelete)) {
        toast.error(`"${feeTypeToDelete}" is a base fee type and cannot be deleted.`);
        return;
    }
    const newValue = JSON.parse(JSON.stringify(value));
    FIXED_YEARS.forEach(year => {
      newValue[year] = newValue[year].filter((item: FeeItem) => item.name !== feeTypeToDelete);
    });
    onChange(newValue);
  };

  const handleInputChange = (year: string, feeTypeName: string, field: 'amount' | 'concession', inputValue: string) => {
    const newValue = JSON.parse(JSON.stringify(value));
    const feeItem = newValue[year]?.find((item: FeeItem) => item.name === feeTypeName);
    if (feeItem) {
      feeItem[field] = parseFloat(inputValue) || 0;
      onChange(newValue);
    }
  };

  const getFeeItem = (year: string, feeType: string): FeeItem | undefined => {
    return value?.[year]?.find(item => item.name === feeType);
  };

  if (!value) {
    return <Card><CardHeader><CardTitle>Fee Structure</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fee Structure</CardTitle>
            <CardDescription>Define the fee structure for each academic year of the student's course.</CardDescription>
          </div>
          <Dialog open={feeTypeDialogOpen} onOpenChange={setFeeTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="gap-1">
                <PlusCircle className="h-4 w-4" /> Add Fee Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Fee Type</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="fee-type-name">Fee Type Name</Label>
                <Input id="fee-type-name" value={newFeeTypeName} onChange={(e) => setNewFeeTypeName(e.target.value)} placeholder="e.g., Exam Fee" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFeeTypeDialogOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleAddFeeType}>Add Fee Type</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-full border">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background border-r min-w-[200px]">Fee Type</TableHead>
                {FIXED_YEARS.map(year => (
                  <TableHead key={year} className="text-center border-l min-w-[150px]">
                    {year}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeTypes.map(feeType => (
                <TableRow key={feeType}>
                  <TableCell className="font-medium sticky left-0 z-10 bg-background border-r">
                    <div className="flex items-center justify-between">
                      {feeType}
                      {!BASE_FEE_TYPES.includes(feeType) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete "{feeType}"?</AlertDialogTitle><AlertDialogDescription>This will remove this fee type from all years. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteFeeType(feeType)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                  {FIXED_YEARS.map(year => {
                    const item = getFeeItem(year, feeType);
                    return (
                      <TableCell key={year} className="border-l">
                        <Input
                          type="number"
                          value={item?.amount || 0}
                          onChange={(e) => handleInputChange(year, feeType, 'amount', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {/* Special row for Concession */}
              <TableRow>
                <TableCell className="font-medium sticky left-0 z-10 bg-background border-r">Concession</TableCell>
                {FIXED_YEARS.map(year => {
                  const tuitionFeeItem = getFeeItem(year, 'Tuition Fee');
                  return (
                    <TableCell key={year} className="border-l">
                      <Input
                        type="number"
                        value={tuitionFeeItem?.concession || 0}
                        onChange={(e) => handleInputChange(year, 'Tuition Fee', 'concession', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}