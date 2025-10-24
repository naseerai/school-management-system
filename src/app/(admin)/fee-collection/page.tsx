"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

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
import { AcademicYear } from "../academic-years/page";

const searchSchema = z.object({
  academic_year_id: z.string().min(1, "Please select an academic year"),
  roll_number: z.string().min(1, "Please enter a roll number"),
});

type StudentDetails = {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  studying_year: string;
  student_types: { name: string } | null;
  fee_details: any;
};

export default function FeeCollectionPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [student, setStudent] = useState<StudentDetails | null>(null);

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { academic_year_id: "", roll_number: "" },
  });

  useEffect(() => {
    const fetchYears = async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true);
      if (error) {
        toast.error("Failed to fetch active academic year.");
      } else {
        setAcademicYears(data || []);
        if (data && data.length > 0) {
          form.setValue("academic_year_id", data[0].id);
        }
      }
    };
    fetchYears();
  }, [form]);

  const onSearch = async (values: z.infer<typeof searchSchema>) => {
    setIsSearching(true);
    setStudent(null);
    const { data, error } = await supabase
      .from("students")
      .select("*, student_types(name)")
      .eq("academic_year_id", values.academic_year_id)
      .eq("roll_number", values.roll_number)
      .single();

    if (error || !data) {
      toast.error("Student not found. Please check the details and try again.");
    } else {
      setStudent(data as StudentDetails);
    }
    setIsSearching(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Fee Collection</CardTitle>
          <CardDescription>
            Search for a student by academic year and roll number to collect fees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSearch)} className="flex items-end gap-4">
              <FormField control={form.control} name="academic_year_id" render={({ field }) => (
                <FormItem className="w-full max-w-xs">
                  <FormLabel>Academic Year</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger></FormControl>
                    <SelectContent>{academicYears.map(ay => <SelectItem key={ay.id} value={ay.id}>{ay.year_name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="roll_number" render={({ field }) => (
                <FormItem className="w-full max-w-xs">
                  <FormLabel>Roll Number</FormLabel>
                  <FormControl><Input placeholder="Enter roll number..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isSearching}>
                {isSearching ? "Searching..." : "Search Student"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {student && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Student Details Card */}
            <Card>
              <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="font-medium">Name</p><p>{student.name}</p></div>
                <div><p className="font-medium">Roll No</p><p>{student.roll_number}</p></div>
                <div><p className="font-medium">Class</p><p>{student.class}</p></div>
                <div><p className="font-medium">Studying Year</p><p>{student.studying_year}</p></div>
                <div><p className="font-medium">Student Type</p><p>{student.student_types?.name || 'N/A'}</p></div>
              </CardContent>
            </Card>

            {/* Fee Structure & Payment Status Card */}
            <Card>
              <CardHeader><CardTitle>Fee Structure & Payment Status</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Fee details and payment status will be displayed here.</p>
                {/* Detailed fee structure will be implemented next */}
              </CardContent>
            </Card>

            {/* Collect Payment Card */}
            <Card>
              <CardHeader><CardTitle>Collect Payment</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Payment collection form will be implemented next.</p>
                {/* Payment form will be implemented next */}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}