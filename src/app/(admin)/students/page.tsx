"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StudentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>Manage student information.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Student management features will be implemented here.</p>
      </CardContent>
    </Card>
  );
}