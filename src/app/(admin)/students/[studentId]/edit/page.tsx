"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Check, ChevronsUpDown, PlusCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { AcademicYear } from "../../academic-years/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeeStructureEditor } from "@/components/admin/fee-structure-editor";

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

export default function EditStudentPage({ params }: { params: { studentId: string } }) {
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [typesRes, yearsRes, studentRes] = await Promise.all([
        supabase.from("student_types").select("*"),
        supabase.from("academic_years").select("*").order("year_name", { ascending: false }),
        supabase.from("students").select("*").eq("id", params.studentId).single(),
      ]);

      if (typesRes.error) toast.error("Failed to fetch student types.");
      else setStudentTypes(typesRes.data || []);

      if (yearsRes.error) toast.error("Failed to fetch academic years.");
      else setAcademicYears(yearsRes.data || []);

      if (studentRes.error) {
        toast.error("Failed to fetch student data.");
        router.push("/students");
      } else {
        form.reset(studentRes.data);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [params.studentId, form, router]);

  const onStudentSubmit = async (values: z.infer<typeof studentFormSchema>) => {
    setIsSubmitting(true);
    const { error } = await supabase.from("students").update(values).eq("id", params.studentId);
    if (error) {
      toast.error(`Failed to update student: ${error.message}`);
    } else {
      toast.success("Student updated successfully!");
      router.push("/students");
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading student details...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Link href="/students" passHref>
             <Button variant="outline" size="icon" asChild>
                <a><ArrowLeft className="h-4 w-4" /></a>
             </Button>
          </Link>
          <div>
            <CardTitle>Edit Student</CardTitle>
            <CardDescription>Update the details for {form.getValues("name")}.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select academic year..." /></SelectTrigger></FormControl>
                    <SelectContent>{academicYears.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.year_name}</SelectItem>)}</SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="student_type_id" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Student Type</FormLabel>
                  <StudentTypeCombobox studentTypes={studentTypes} value={field.value} onChange={field.onChange} onNewTypeAdded={() => {}} />
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
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function StudentTypeCombobox({ studentTypes, value, onChange }: { studentTypes: StudentType[], value: string, onChange: (value: string) => void, onNewTypeAdded: () => void }) {
  const [open, setOpen] = useState(false);
  return (
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}