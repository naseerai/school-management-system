"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StudentDetails = {
  name: string;
  roll_number: string;
  class: string;
  student_types: { name: string } | null;
};

interface StudentDetailsCardProps {
  student: StudentDetails;
}

export function StudentDetailsCard({ student }: StudentDetailsCardProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><p className="font-medium">Name</p><p>{student.name}</p></div>
        <div><p className="font-medium">Roll No</p><p>{student.roll_number}</p></div>
        <div><p className="font-medium">Class</p><p>{student.class}</p></div>
        <div><p className="font-medium">Student Type</p><p>{student.student_types?.name}</p></div>
      </CardContent>
    </Card>
  );
}