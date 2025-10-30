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
  const [mergedFeeDetails, setMergedFeeDetails] = useState<any>(null);

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
    setMergedFeeDetails(null);

    const { data: allStudentRecords, error } = await supabase
      .from('students')
      .select('*, student_types(name), academic_years(*)')
      .eq('roll_number', rollNumber)
      .order('created_at', { ascending: true });

    if (error || !allStudentRecords || allStudentRecords.length === 0) {
      toast.error("Student not found.");
      setIsLoading(false);
      return;
    }

    if (academicYear) {
      const recordInYear = allStudentRecords.find(s => s.academic_years?.year_name === academicYear);
      if (!recordInYear) {
        toast.error(`Student with roll number ${rollNumber} was not enrolled in academic year ${academicYear}.`);
        setIsLoading(false);
        return;
      }
    }

    const merged = allStudentRecords.reduce<{[year: string]: any[]}>((acc, record) => {
        if (record.fee_details) {
            Object.assign(acc, record.fee_details);
        }
        return acc;
    }, {});
    setMergedFeeDetails(merged);
    setStudentRecords(allStudentRecords as StudentDetails[]);
    
    const studentIds = allStudentRecords.map(s => s.id);

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

        {studentRecords.length > 0 && mergedFeeDetails && (
          <div className="print-area">
            <StudentFeeView 
              studentRecords={studentRecords} 
              allFeeDetails={mergedFeeDetails}
              payments={payments} 
              invoices={invoices} 
            />
          </div>
        )}
      </div>
    </div>
  );
}