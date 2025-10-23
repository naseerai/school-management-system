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
import { AcademicYear } from "../academic-years/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StudentType = {
  id: string;
  name: string;
};

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
    const csv = `"roll_number","name","class","section","email","phone","student_type","academic_year","studying_year","caste"\n"101","John Doe","10","A","john.doe@example.com","1234567890","Management","2024-2025","1st Year","General"`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_students.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const studentTypesMap = new Map(studentTypes.map(st => [st.name.toLowerCase(), st.id]));
        const academicYearsMap = new Map(academicYears.map(ay => [ay.year_name, ay.id]));
        
        const studentsToInsert = rows.map(row => ({
          roll_number: row.roll_number,
          name: row.name,
          class: row.class,
          section: row.section,
          email: row.email,
          phone: row.phone,
          studying_year: row.studying_year,
          caste: row.caste,
          student_type_id: studentTypesMap.get(row.student_type?.toLowerCase()),
          academic_year_id: academicYearsMap.get(row.academic_year),
        })).filter(s => s.student_type_id && s.academic_year_id);

        if (studentsToInsert.length !== rows.length) {
            toast.warning("Some rows were skipped due to invalid student types or academic years.");
        }
        if (studentsToInsert.length === 0) {
            toast.error("No valid students found in the CSV file. Please check student types and academic years.");
            setIsSubmitting(false);
            return;
        }

        const { error } = await supabase.from("students").insert(studentsToInsert);
        if (error) {
          toast.error(`Bulk upload failed: ${error.message}`);
        } else {
          toast.success(`${studentsToInsert.length} students uploaded successfully!`);
        }
        setIsSubmitting(false);
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`);
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
              <form onSubmit={form.handleSubmit(onStudentSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <div className="md:col-span-3 flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Student"}</Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="bulk" className="pt-6">
            <div className="space-y-4 max-w-md">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with student data. Make sure the columns match the sample file.
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