"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AcademicYear = { id: string; year_name: string; };

const searchSchema = z.object({
  academic_year_id: z.string().optional(),
  roll_number: z.string().min(1, "Please enter a roll number"),
});

interface StudentSearchFormProps {
  academicYears: AcademicYear[];
  onSearch: (values: z.infer<typeof searchSchema>) => void;
  isSearching: boolean;
}

export function StudentSearchForm({ academicYears, onSearch, isSearching }: StudentSearchFormProps) {
  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: { academic_year_id: "", roll_number: "" },
  });

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Student Fee Collection</CardTitle>
        <CardDescription>Search for a student to collect fees.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSearch)} className="flex flex-wrap items-end gap-4">
            <FormField control={form.control} name="academic_year_id" render={({ field }) => (
              <FormItem className="w-full max-w-xs">
                <FormLabel>Academic Year (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="All years..." /></SelectTrigger></FormControl>
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
            <Button type="submit" disabled={isSearching}>{isSearching ? "Searching..." : "Search Student"}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}