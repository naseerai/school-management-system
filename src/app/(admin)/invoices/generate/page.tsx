"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Papa from "papaparse";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type FeeStructure = { id: string; fee_name: string; amount: number };
type StudentType = { id: string; name: string };
type ClassGroup = { id: string; name: string };

const formSchema = z.object({
  fee_structure_id: z.string().min(1, "Please select a fee type"),
  due_date: z.string().min(1, "Due date is required"),
  class_filter: z.string().min(1, "Class is required"),
  section_filter: z.string().min(1, "Section is required"),
  student_type_id_filter: z.string().min(1, "Student type is required"),
  penalty_amount: z.coerce.number().min(0, "Penalty must be 0 or more"),
});

export default function GenerateInvoicesPage() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { penalty_amount: 0, class_filter: "", section_filter: "", student_type_id_filter: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      const [feesRes, typesRes, groupsRes] = await Promise.all([
        supabase.from("fee_structures").select("id, fee_name, amount"),
        supabase.from("student_types").select("id, name"),
        supabase.from("class_groups").select("id, name"),
      ]);
      if (feesRes.error) toast.error("Failed to fetch fee types.");
      else setFeeStructures(feesRes.data || []);
      if (typesRes.error) toast.error("Failed to fetch student types.");
      else setStudentTypes(typesRes.data || []);
      if (groupsRes.error) toast.error("Failed to fetch class groups.");
      else setClassGroups(groupsRes.data || []);
    };
    fetchData();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Generating invoices...");
    
    const selectedFee = feeStructures.find(fs => fs.id === values.fee_structure_id);
    if (!selectedFee) {
      toast.error("Selected fee structure not found.", { id: toastId });
      setIsSubmitting(false);
      return;
    }

    let studentQuery = supabase
      .from('students')
      .select('id');
      
    studentQuery = studentQuery.eq('class', values.class_filter);
    studentQuery = studentQuery.eq('section', values.section_filter);
    if (values.student_type_id_filter !== 'all') {
      studentQuery = studentQuery.eq('student_type_id', values.student_type_id_filter);
    }
    
    const { data: students, error: studentError } = await studentQuery;

    if (studentError) {
      toast.error(`Failed to fetch students: ${studentError.message}`, { id: toastId });
      setIsSubmitting(false);
      return;
    }
    if (!students || students.length === 0) {
      toast.warning("No students found matching the selected criteria.", { id: toastId });
      setIsSubmitting(false);
      return;
    }

    const batch_id = uuidv4();
    const selectedStudentType = studentTypes.find(st => st.id === values.student_type_id_filter);
    const studentTypeName = values.student_type_id_filter === 'all' ? 'All Types' : selectedStudentType?.name;
    const batch_description = `${selectedFee.fee_name} for Class ${values.class_filter}-${values.section_filter} (${studentTypeName})`;

    const invoicesToInsert = students.map(student => ({
      student_id: student.id,
      due_date: values.due_date,
      status: 'unpaid',
      total_amount: selectedFee.amount,
      penalty_amount_per_day: values.penalty_amount,
      batch_id: batch_id,
      batch_description: batch_description,
    }));

    const { data: newInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoicesToInsert)
      .select('id');

    if (invoiceError || !newInvoices) {
      toast.error(`Failed to create invoices: ${invoiceError?.message || 'Unknown error'}`, { id: toastId });
      setIsSubmitting(false);
      return;
    }

    const invoiceItemsToInsert = newInvoices.map(invoice => ({
      invoice_id: invoice.id,
      description: selectedFee.fee_name,
      amount: selectedFee.amount,
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItemsToInsert);

    if (itemsError) {
      toast.error(`Invoices created, but failed to add line items: ${itemsError.message}`, { id: toastId });
    } else {
      toast.success(`${newInvoices.length} invoices generated successfully!`, { id: toastId });
      form.reset();
    }
    setIsSubmitting(false);
  };

  const handleDownloadSample = () => {
    const headers = ["fee_name", "due_date", "class", "section", "student_type", "penalty_amount_per_day"];
    const sampleData = ["Tuition Fee", "2024-12-31", "BSc", "A", "Management", "10"];
    const csv = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_invoices.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Processing CSV file...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const feeStructuresMap = new Map(feeStructures.map(fs => [fs.fee_name.toLowerCase().trim(), fs]));
        const studentTypesMap = new Map(studentTypes.map(st => [st.name.toLowerCase().trim(), st.id]));
        
        let allInvoicesToInsert: any[] = [];
        let allInvoiceItemsToInsert: any[] = [];
        const skippedRows: { row: number; reason: string }[] = [];
        const batchId = uuidv4();

        for (const [index, row] of rows.entries()) {
          const feeStructure = feeStructuresMap.get(row.fee_name?.toLowerCase().trim());
          const studentTypeId = row.student_type?.toLowerCase().trim() === 'all' ? 'all' : studentTypesMap.get(row.student_type?.toLowerCase().trim());

          if (!feeStructure || !studentTypeId) {
            skippedRows.push({ row: index + 2, reason: `Invalid fee_name or student_type.` });
            continue;
          }

          let studentQuery = supabase.from('students').select('id').eq('class', row.class).eq('section', row.section);
          if (studentTypeId !== 'all') {
            studentQuery = studentQuery.eq('student_type_id', studentTypeId);
          }
          const { data: students, error: studentError } = await studentQuery;

          if (studentError || !students || students.length === 0) {
            skippedRows.push({ row: index + 2, reason: `No students found for class ${row.class}-${row.section}.` });
            continue;
          }

          const studentTypeName = row.student_type?.toLowerCase().trim() === 'all' ? 'All Types' : row.student_type;
          const batch_description = `${feeStructure.fee_name} for Class ${row.class}-${row.section} (${studentTypeName})`;

          const invoicesForThisRow = students.map(student => ({
            student_id: student.id,
            due_date: row.due_date,
            status: 'unpaid',
            total_amount: feeStructure.amount,
            penalty_amount_per_day: parseFloat(row.penalty_amount_per_day) || 0,
            batch_id: batchId,
            batch_description: batch_description,
          }));
          
          allInvoicesToInsert.push(...invoicesForThisRow);
        }

        if (allInvoicesToInsert.length === 0) {
          toast.error("No valid invoices could be generated from the CSV.", { id: toastId });
          setIsSubmitting(false);
          return;
        }

        const { data: newInvoices, error: invoiceError } = await supabase.from('invoices').insert(allInvoicesToInsert).select('id, total_amount, batch_description');
        
        if (invoiceError || !newInvoices) {
          toast.error(`Bulk upload failed: ${invoiceError?.message}`, { id: toastId });
        } else {
          allInvoiceItemsToInsert = newInvoices.map(inv => ({
            invoice_id: inv.id,
            description: inv.batch_description.split(' for ')[0],
            amount: inv.total_amount,
          }));
          await supabase.from('invoice_items').insert(allInvoiceItemsToInsert);
          toast.success(`${newInvoices.length} invoices generated successfully!`, { id: toastId });
        }

        if (skippedRows.length > 0) {
          toast.warning(`${skippedRows.length} rows were skipped.`, { description: "Check console for details." });
          console.warn("Skipped CSV rows:", skippedRows);
        }

        setIsSubmitting(false);
        (event.target as HTMLInputElement).value = "";
      },
      error: (err) => {
        toast.error(`CSV parsing error: ${err.message}`, { id: toastId });
        setIsSubmitting(false);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <CardTitle>Generate Invoices</CardTitle>
            <CardDescription>
              Create invoices in bulk for students based on the criteria below.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Generation</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="single" className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fee_structure_id" render={({ field }) => (
                  <FormItem><FormLabel>Fee Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select fee type..." /></SelectTrigger></FormControl>
                      <SelectContent>{feeStructures.map(fs => <SelectItem key={fs.id} value={fs.id}>{fs.fee_name}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="due_date" render={({ field }) => (
                  <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="class_filter" render={({ field }) => (
                  <FormItem><FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger></FormControl>
                      <SelectContent>{classGroups.map(cg => <SelectItem key={cg.id} value={cg.name}>{cg.name}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="section_filter" render={({ field }) => (
                  <FormItem><FormLabel>Section</FormLabel><FormControl><Input placeholder="e.g., A" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="student_type_id_filter" render={({ field }) => (
                  <FormItem><FormLabel>Student Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select student type..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {studentTypes.map(st => <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="penalty_amount" render={({ field }) => (
                  <FormItem><FormLabel>Penalty Amount (per day)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Generating...' : 'Generate Invoices'}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="bulk" className="pt-6">
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file to generate invoices in bulk. Ensure the columns match the sample file.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={handleDownloadSample}>Download Sample</Button>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleBulkUpload} disabled={isSubmitting} className="cursor-pointer" />
              </div>
              {isSubmitting && <p className="text-sm text-primary">Processing file...</p>}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}