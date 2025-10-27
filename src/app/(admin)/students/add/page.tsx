"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Papa from "papaparse";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AcademicYear } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeeStructureEditor } from "@/components/admin/fee-structure-editor";

// Types
type FeeItem = { id: string; name: string; amount: number; concession: number };
type FeeStructure = { [year: string]: FeeItem[] };
type StudentType = { id: string; name: string };

const studentFormSchema = z.object({
  roll_number: z.string().min(1, "Roll number is required"),
  name: z.string().min(1, "Name is required"),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  phone: z.string().optional(),
  student_type_id: z.string().min(1, "Student type is required"),
  academic_year_id: z.string().min(1, "Academic year is required"),
  studying_year: z.string().min(1, "Studying year is required"),
  caste: z.string().optional(),
  fee_details: z.any().optional(),
});

export default function StudentsPage() {
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      roll_number: "",
      name: "",
      class: "",
      section: "",
      email: "",
      phone: "",
      student_type_id: "",
      academic_year_id: "",
      studying_year: "",
      caste: "",
      fee_details: {},
    },
  });

  const fetchData = async () => {
    const [typesRes, yearsRes] = await Promise.all([
      supabase.from("student_types").select("*"),
      supabase.from("academic_years").select("*").order("year_name", { ascending: false }),
    ]);

    if (typesRes.error) toast.error("Failed to fetch student types.");
    else setStudentTypes(typesRes.data || []);

    if (yearsRes.error) toast.error("Failed to fetch academic years.");
    else setAcademicYears(yearsRes.data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onStudentSubmit = async (values: z.infer<typeof studentFormSchema>) => {
    setIsSubmitting(true);
    const { error } = await supabase.from("students").insert([values]);
    if (error) {
      toast.error(`Failed to add student: ${error.message}`);
    } else {
      toast.success("Student added successfully!");
      form.reset();
    }
    setIsSubmitting(false);
  };

  const handleDownloadSample = () => {
    const headers = [
      "roll_number", "name", "class", "section", "email", "phone", 
      "student_type", "academic_year", "studying_year", "caste",
      "first_year_tuition_fee", "first_year_jvd_fee", "first_year_concession",
      "second_year_tuition_fee", "second_year_jvd_fee", "second_year_concession",
      "third_year_tuition_fee", "third_year_jvd_fee", "third_year_concession",
    ];
    const sampleData = [
      "101", "John Doe", "10", "A", "john.doe@example.com", "1234567890",
      "Management", "2024-2025", "1st Year", "General",
      "50000", "15000", "5000",
      "52000", "15000", "2000",
      "54000", "15000", "0",
    ];
    const csv = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_students_with_fees.csv");
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
        const studentTypesMap = new Map(studentTypes.map(st => [st.name.toLowerCase().trim(), st.id]));
        const academicYearsMap = new Map(academicYears.map(ay => [ay.year_name.trim(), ay.id]));
        
        const yearPrefixes = ['first', 'second', 'third', 'fourth', 'fifth'];
        const yearMappings: { [key: string]: string } = {
            first: '1st Year', second: '2nd Year', third: '3rd Year', fourth: '4th Year', fifth: '5th Year',
        };

        const studentsToUpsert: any[] = [];
        const skippedRows: { row: number; reason: string }[] = [];

        rows.forEach((row, index) => {
            const student_type_id = studentTypesMap.get(row.student_type?.toLowerCase().trim());
            const academic_year_id = academicYearsMap.get(row.academic_year?.trim());

            const studentData = {
                roll_number: row.roll_number || row.roll_no,
                name: row.name,
                class: row.class || row.class_id,
                section: row.section || row.section_id,
                email: row.email,
                phone: row.phone || row.mobile,
                studying_year: row.studying_year,
                caste: row.caste,
                student_type_id: student_type_id,
                academic_year_id: academic_year_id,
            };

            const reasons = [];
            if (!studentData.roll_number) reasons.push("Missing roll number");
            if (!studentData.name) reasons.push("Missing name");
            if (!studentData.student_type_id) reasons.push(`Student Type '${row.student_type}' not found`);
            if (!studentData.academic_year_id) reasons.push(`Academic Year '${row.academic_year}' not found`);

            if (reasons.length > 0) {
                skippedRows.push({ row: index + 2, reason: reasons.join(', ') });
                return;
            }

            const fee_details: FeeStructure = {};
            yearPrefixes.forEach(prefix => {
                const yearName = yearMappings[prefix];
                const feeItems: FeeItem[] = [];

                const tuitionFee = parseFloat(row[`${prefix}_year_tuition_fee`]);
                const jvdFee = parseFloat(row[`${prefix}_year_jvd_fee`]);
                const concession = parseFloat(row[`${prefix}_year_concession`]);

                if (!isNaN(tuitionFee)) {
                    feeItems.push({ id: crypto.randomUUID(), name: 'Tuition Fee', amount: tuitionFee, concession: !isNaN(concession) ? concession : 0 });
                }
                if (!isNaN(jvdFee)) {
                    feeItems.push({ id: crypto.randomUUID(), name: 'JVD Fee', amount: jvdFee, concession: 0 });
                }
                if (feeItems.length > 0) fee_details[yearName] = feeItems;
            });

            studentsToUpsert.push({ ...studentData, fee_details });
        });

        if (skippedRows.length > 0) {
            const skippedRowsDescription = skippedRows.slice(0, 5).map(skipped => `Row ${skipped.row}: ${skipped.reason}`).join('\n');
            const fullDescription = `Skipped ${skippedRows.length} of ${rows.length} rows.\n\nErrors:\n${skippedRowsDescription}${skippedRows.length > 5 ? '\n...' : ''}`;
            
            toast.warning("Some rows were skipped during upload.", {
                description: <pre className="mt-2 w-full rounded-md bg-muted p-4 text-muted-foreground"><code className="text-sm">{fullDescription}</code></pre>,
                duration: 15000,
            });
        }

        if (studentsToUpsert.length === 0) {
            if (skippedRows.length === 0) {
                toast.error("No valid students found in the CSV file to process.", { id: toastId });
            } else {
                toast.dismiss(toastId);
            }
            setIsSubmitting(false);
            return;
        }

        const { error } = await supabase.from("students").upsert(studentsToUpsert, {
          onConflict: 'roll_number,academic_year_id'
        });

        if (error) {
          toast.error(`Bulk upload failed: ${error.message}`, { id: toastId });
        } else {
          toast.success(`${studentsToUpsert.length} students uploaded/updated successfully!`, { id: toastId });
        }
        setIsSubmitting(false);
        (event.target as HTMLInputElement).value = "";
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`, { id: toastId });
        setIsSubmitting(false);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>Add single students or bulk upload via CSV.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Add Single Student</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="single" className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onStudentSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="roll_number" render={({ field }) => (
                    <FormItem><FormLabel>Roll Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="class" render={({ field }) => (
                    <FormItem><FormLabel>Class</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="section" render={({ field }) => (
                    <FormItem><FormLabel>Section</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="studying_year" render={({ field }) => (
                    <FormItem><FormLabel>Studying Year</FormLabel><FormControl><Input placeholder="e.g., 1st Year" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="academic_year_id" render={({ field }) => (
                    <FormItem><FormLabel>Academic Year</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select academic year..." /></SelectTrigger></FormControl>
                        <SelectContent>{academicYears.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.year_name}</SelectItem>)}</SelectContent>
                      </Select>
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="student_type_id" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Student Type</FormLabel>
                      <StudentTypeCombobox studentTypes={studentTypes} value={field.value} onChange={field.onChange} onNewTypeAdded={fetchData} />
                    <FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="caste" render={({ field }) => (
                    <FormItem><FormLabel>Caste</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                
                <FormField
                  control={form.control}
                  name="fee_details"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FeeStructureEditor value={field.value || {}} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Student"}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="bulk" className="pt-6">
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with student data, including their multi-year fee structure. Make sure the columns match the sample file.
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

function StudentTypeCombobox({ studentTypes, value, onChange, onNewTypeAdded }: { studentTypes: StudentType[], value: string, onChange: (value: string) => void, onNewTypeAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNewType = async () => {
    const trimmedName = newTypeName.trim();
    if (!trimmedName) return;
    setIsAdding(true);

    const { data: existingType } = await supabase.from("student_types").select("id").ilike("name", trimmedName).single();
    if (existingType) {
      toast.error(`Student type "${trimmedName}" already exists.`);
      setIsAdding(false);
      return;
    }

    const { data, error } = await supabase.from("student_types").insert({ name: trimmedName }).select().single();
    if (error) {
      toast.error(`Failed to add type: ${error.message}`);
    } else {
      toast.success("New student type added!");
      onNewTypeAdded();
      onChange(data.id);
      setDialogOpen(false);
      setNewTypeName("");
    }
    setIsAdding(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {value ? studentTypes.find((st) => st.id === value)?.name : "Select student type..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Search student type..." />
            <CommandList>
              <CommandEmpty>No student type found.</CommandEmpty>
              <CommandGroup>
                {studentTypes.map((st) => (
                  <CommandItem key={st.id} value={st.name} onSelect={() => { onChange(st.id); setOpen(false); }}>
                    <Check className={cn("mr-2 h-4 w-4", value === st.id ? "opacity-100" : "opacity-0")} />
                    {st.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => { setOpen(false); setDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Type
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student Type</DialogTitle>
            <DialogDescription>Enter the name for the new student type.</DialogDescription>
          </DialogHeader>
          <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="e.g., Day Scholar" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNewType} disabled={isAdding}>{isAdding ? "Adding..." : "Add Type"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}