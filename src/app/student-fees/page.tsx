"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { StudentDetails, Payment, Invoice } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StudentFeeView } from '@/components/student-fee-view';

export default function StudentFeesPage() {
  const [rollNumber, setRollNumber] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [studentRecords, setStudentRecords] = useState<StudentDetails[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber) {
      toast.error("Please enter a Roll Number.");
      return;
    }
    setIsLoading(true);
    setStudentRecords([]);
    setPayments([]);
    setInvoices([]);

    let query = supabase
      .from('students')
      .select('*, student_types(name), academic_years(*)')
      .eq('roll_number', rollNumber);

    if (academicYear) {
      const { data: ayData } = await supabase.from('academic_years').select('id').eq('year_name', academicYear).single();
      if (ayData) {
        query = query.eq('academic_year_id', ayData.id);
      } else {
        toast.error(`Academic Year "${academicYear}" not found. Please use the format YYYY-YYYY.`);
        setIsLoading(false);
        return;
      }
    }
    
    const { data, error } = await query.order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      toast.error("Student not found for the provided details.");
      setIsLoading(false);
      return;
    }

    setStudentRecords(data as StudentDetails[]);
    const studentIds = data.map(s => s.id);

    const [paymentsRes, invoicesRes] = await Promise.all([
      supabase.from('payments').select('*').in('student_id', studentIds).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').in('student_id', studentIds).eq('status', 'unpaid').order('due_date', { ascending: true })
    ]);

    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-6xl space-y-6">
        <div className="print-hidden">
          <Card>
            <CardHeader>
              <CardTitle>Student Fee Portal</CardTitle>
              <CardDescription>Enter your details to view your fee structure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
                <div className="flex-grow">
                  <label htmlFor="roll_number" className="text-sm font-medium">Roll Number</label>
                  <Input
                    id="roll_number"
                    placeholder="Enter your roll number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>
                <div className="flex-grow">
                  <label htmlFor="academic_year" className="text-sm font-medium">Academic Year (Optional)</label>
                  <Input
                    id="academic_year"
                    placeholder="e.g., 2024-2025"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Searching..." : "Search"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {studentRecords.length > 0 && (
          <div className="print-area">
            <StudentFeeView studentRecords={studentRecords} payments={payments} invoices={invoices} />
          </div>
        )}
      </div>
    </div>
  );
}