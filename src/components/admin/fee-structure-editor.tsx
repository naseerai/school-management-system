"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Pencil } from "lucide-react";
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

export function FeeStructureEditor({ value, onChange }: FeeStructureEditorProps) {
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [newYearName, setNewYearName] = useState("");

  const handleAddYear = () => {
    const trimmedYear = newYearName.trim();
    if (!trimmedYear) {
      toast.error("Year name cannot be empty.");
      return;
    }
    if (value[trimmedYear]) {
      toast.error(`Year "${trimmedYear}" already exists.`);
      return;
    }
    onChange({ ...value, [trimmedYear]: [] });
    setNewYearName("");
    setYearDialogOpen(false);
  };

  const handleDeleteYear = (year: string) => {
    const { [year]: _, ...rest } = value;
    onChange(rest);
  };

  const handleFeeChange = (year: string, updatedFees: FeeItem[]) => {
    onChange({ ...value, [year]: updatedFees });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fee Structure</CardTitle>
            <CardDescription>Define the fee structure for each academic year of the student's course.</CardDescription>
          </div>
          <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <PlusCircle className="h-4 w-4" /> Add Year
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Year</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="year-name">Year Name</Label>
                <Input id="year-name" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} placeholder="e.g., 1st Year" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setYearDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddYear}>Add Year</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(value).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No years added. Click "Add Year" to start.</p>
        )}
        {Object.entries(value).map(([year, fees]) => (
          <YearFeeCard
            key={year}
            year={year}
            fees={fees}
            onDeleteYear={() => handleDeleteYear(year)}
            onFeeChange={(updatedFees) => handleFeeChange(year, updatedFees)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function YearFeeCard({ year, fees, onDeleteYear, onFeeChange }: { year: string; fees: FeeItem[]; onDeleteYear: () => void; onFeeChange: (fees: FeeItem[]) => void; }) {
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeItem | null>(null);
  const [feeName, setFeeName] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeConcession, setFeeConcession] = useState("");

  const openAddDialog = () => {
    setEditingFee(null);
    setFeeName("");
    setFeeAmount("");
    setFeeConcession("0");
    setFeeDialogOpen(true);
  };

  const openEditDialog = (fee: FeeItem) => {
    setEditingFee(fee);
    setFeeName(fee.name);
    setFeeAmount(String(fee.amount));
    setFeeConcession(String(fee.concession || 0));
    setFeeDialogOpen(true);
  };

  const handleSaveFee = () => {
    const amount = parseFloat(feeAmount);
    const concession = parseFloat(feeConcession) || 0;
    if (!feeName.trim() || isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid fee name and a non-negative amount.");
      return;
    }

    if (editingFee) {
      onFeeChange(fees.map(f => f.id === editingFee.id ? { ...f, name: feeName, amount, concession } : f));
    } else {
      onFeeChange([...fees, { id: crypto.randomUUID(), name: feeName, amount, concession }]);
    }
    setFeeDialogOpen(false);
  };

  const handleDeleteFee = (id: string) => {
    onFeeChange(fees.filter(f => f.id !== id));
  };

  return (
    <div className="border rounded-lg">
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
        <h4 className="font-semibold">{year}</h4>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onDeleteYear}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Concession</TableHead>
              <TableHead className="text-right">Payable</TableHead>
              <TableHead className="w-[100px]"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.length > 0 ? fees.map(fee => (
              <TableRow key={fee.id}>
                <TableCell>{fee.name}</TableCell>
                <TableCell>{fee.amount.toFixed(2)}</TableCell>
                <TableCell>{(fee.concession || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">{(fee.amount - (fee.concession || 0)).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEditDialog(fee)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDeleteFee(fee.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No fees added for this year.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Button variant="link" size="sm" className="mt-2 gap-1" onClick={openAddDialog}>
          <PlusCircle className="h-4 w-4" /> Add Fee Item
        </Button>
      </div>
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingFee ? "Edit" : "Add"} Fee Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fee-name">Fee Name</Label>
              <Input id="fee-name" value={feeName} onChange={(e) => setFeeName(e.target.value)} placeholder="e.g., Tuition Fee" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-amount">Amount</Label>
              <Input id="fee-amount" type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="e.g., 50000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-concession">Concession</Label>
              <Input id="fee-concession" type="number" value={feeConcession} onChange={(e) => setFeeConcession(e.target.value)} placeholder="e.g., 5000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFee}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}