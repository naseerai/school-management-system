"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DataTablePagination } from "@/components/data-table-pagination";
import { Label } from "@/components/ui/label";

type Department = { id: string; name: string };
type Expense = {
  id: string;
  expense_date: string;
  amount: number;
  description: string | null;
  department_id: string | null;
  departments: Department | null;
};

const formSchema = z.object({
  expense_date: z.string().min(1, "Date is required"),
  department_id: z.string().min(1, "Department is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
});

const PAGE_SIZE = 10;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { expense_date: new Date().toISOString().split('T')[0], amount: 0 },
  });

  const fetchData = async () => {
    setIsLoading(true);
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [expensesRes, deptsRes] = await Promise.all([
      supabase.from("expenses").select("*, departments(id, name)", { count: 'exact' }).range(from, to),
      supabase.from("departments").select("id, name"),
    ]);

    if (expensesRes.error) toast.error("Failed to fetch expenses.");
    else {
      setExpenses(expensesRes.data as Expense[] || []);
      setTotalCount(expensesRes.count || 0);
    }

    if (deptsRes.error) toast.error("Failed to fetch departments.");
    else setDepartments(deptsRes.data || []);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const query = editingExpense
      ? supabase.from("expenses").update(values).eq("id", editingExpense.id)
      : supabase.from("expenses").insert([values]);

    const { error } = await query;

    if (error) {
      toast.error(`Operation failed: ${error.message}`);
    } else {
      toast.success(`Expense ${editingExpense ? 'updated' : 'added'} successfully!`);
      await fetchData();
      setDialogOpen(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    const { error } = await supabase.from("expenses").delete().eq("id", expenseToDelete.id);
    if (error) toast.error("Failed to delete expense.");
    else {
      toast.success("Expense deleted successfully!");
      fetchData();
    }
    setIsDeleting(false);
    setDeleteAlertOpen(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      ...expense,
      description: expense.description || "",
      department_id: expense.department_id || "",
    });
    setDialogOpen(true);
  };

  const handleDownload = async (start: string, end: string) => {
    const toastId = toast.loading("Generating report...");

    const [paymentsRes, expensesRes] = await Promise.all([
      supabase.from("payments")
        .select("created_at, amount, fee_type, notes, students(name, roll_number)")
        .gte('created_at', new Date(start).toISOString())
        .lte('created_at', new Date(end + 'T23:59:59Z').toISOString()),
      supabase.from("expenses")
        .select("expense_date, amount, description, departments(name)")
        .gte('expense_date', start)
        .lte('expense_date', end)
    ]);

    if (paymentsRes.error || expensesRes.error) {
      toast.error("Failed to fetch report data.", { id: toastId });
      return;
    }

    const paymentsData = paymentsRes.data || [];
    const expensesData = expensesRes.data || [];

    if (paymentsData.length === 0 && expensesData.length === 0) {
      toast.info("No payments or expenses recorded in the selected date range.", { id: toastId });
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;

    const reportData = [];
    reportData.push([`Report from ${start} to ${end}`]);
    reportData.push([]);

    reportData.push(["Payments (Income)"]);
    reportData.push(["Date", "Student Name", "Roll Number", "Description", "Amount"]);
    paymentsData.forEach((p: any) => {
      totalIncome += p.amount;
      reportData.push([
        new Date(p.created_at).toLocaleDateString(),
        p.students?.name || 'N/A',
        p.students?.roll_number || 'N/A',
        p.fee_type,
        p.amount.toFixed(2),
      ]);
    });
    reportData.push(["", "", "", "Total Income:", totalIncome.toFixed(2)]);
    reportData.push([]);

    reportData.push(["Expenses"]);
    reportData.push(["Date", "Department", "Description", "Amount"]);
    expensesData.forEach((e: any) => {
      totalExpense += e.amount;
      reportData.push([
        new Date(e.expense_date).toLocaleDateString(),
        e.departments?.name || "N/A",
        e.description || "",
        e.amount.toFixed(2),
      ]);
    });
    reportData.push(["", "", "Total Expense:", totalExpense.toFixed(2)]);
    reportData.push([]);

    reportData.push(["Summary"]);
    reportData.push(["Net Balance:", (totalIncome - totalExpense).toFixed(2)]);

    const csv = Papa.unparse(reportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${start}_to_${end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report downloaded successfully.", { id: toastId });
  };

  const handleDateRangeDownload = () => {
    if (!startDate || !endDate) {
      toast.error("Please select both a start and end date for the report.");
      return;
    }
    handleDownload(startDate, endDate);
  };

  const handleTodayDownload = () => {
    const today = new Date().toISOString().split('T')[0];
    handleDownload(today, today);
  };

  useEffect(() => {
    if (!dialogOpen) {
      setEditingExpense(null);
      form.reset({ expense_date: new Date().toISOString().split('T')[0], amount: 0, description: "", department_id: "" });
    }
  }, [dialogOpen, form]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Expenses & Reports</CardTitle>
              <CardDescription>Track expenses and generate financial reports.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date">From</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="end-date">To</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleDateRangeDownload}>
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Download Report</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleTodayDownload}>
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Today's Report</span>
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only">Add Expense</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingExpense ? "Edit" : "Add"} Expense</DialogTitle></DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField control={form.control} name="expense_date" render={({ field }) => (
                        <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="department_id" render={({ field }) => (
                        <FormItem><FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl>
                            <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                          </Select>
                        <FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
              ) : expenses.length > 0 ? (
                expenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>{new Date(exp.expense_date).toLocaleDateString()}</TableCell>
                    <TableCell>{exp.departments?.name || 'N/A'}</TableCell>
                    <TableCell>{exp.amount}</TableCell>
                    <TableCell>{exp.description}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleEdit(exp)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onSelect={() => { setExpenseToDelete(exp); setDeleteAlertOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center">No expenses found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
          />
        </CardContent>
      </Card>
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the expense record.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}