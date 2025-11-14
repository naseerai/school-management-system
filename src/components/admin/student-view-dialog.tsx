"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StudentDetails } from '@/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentViewDialogProps {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentViewDialog({ studentId, open, onOpenChange }: StudentViewDialogProps) {
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      if (open && studentId) {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('students')
          .select('*, student_types(name), academic_years(*)')
          .eq('id', studentId)
          .single();

        if (error) {
          toast.error("Failed to fetch student details.");
          onOpenChange(false);
        } else {
          setStudent(data as StudentDetails);
        }
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [open, studentId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
          <DialogDescription>
            Complete information for {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : student?.name}.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : student ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 text-sm">
            <div className="font-semibold">Name:</div><div>{student.name}</div>
            <div className="font-semibold">Roll Number:</div><div>{student.roll_number}</div>
            <div className="font-semibold">Class:</div><div>{student.class}</div>
            <div className="font-semibold">Section:</div><div>{student.section}</div>
            <div className="font-semibold">Studying Year:</div><div>{student.studying_year}</div>
            <div className="font-semibold">Academic Year:</div><div>{student.academic_years?.year_name}</div>
            <div className="font-semibold">Student Type:</div><div>{student.student_types?.name}</div>
            <div className="font-semibold">Caste:</div><div>{student.caste || 'N/A'}</div>
            <div className="font-semibold">Phone:</div><div>{student.phone || 'N/A'}</div>
            <div className="font-semibold">Email:</div><div>{student.email || 'N/A'}</div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}