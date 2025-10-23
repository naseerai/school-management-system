"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

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

const formSchema = z.object({
  fee_type: z.string().min(1, "Fee type is required"),
  due_date: z.string().min(1, "Due date is required"),
  class: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  student_type: z.string().min(1, "Student type is required"),
  penalty_amount: z.coerce.number().min(0, "Penalty must be 0 or more"),
});

export default function InvoicesPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { penalty_amount: 0 },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log(values);
    toast.info("Invoice generation logic is not yet implemented.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Invoices</CardTitle>
        <CardDescription>
          Create invoices in bulk for students based on the criteria below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="fee_type" render={({ field }) => (
              <FormItem><FormLabel>Fee Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select fee type..." /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="tuition">Tuition Fee</SelectItem><SelectItem value="exam">Exam Fee</SelectItem></SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="due_date" render={({ field }) => (
              <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="class" render={({ field }) => (
              <FormItem><FormLabel>Class</FormLabel><FormControl><Input placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="section" render={({ field }) => (
              <FormItem><FormLabel>Section</FormLabel><FormControl><Input placeholder="e.g., A" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="student_type" render={({ field }) => (
              <FormItem><FormLabel>Student Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select student type..." /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="day_scholar">Day Scholar</SelectItem><SelectItem value="hosteler">Hosteler</SelectItem></SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="penalty_amount" render={({ field }) => (
              <FormItem><FormLabel>Penalty Amount (per day)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit">Generate Invoices</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}