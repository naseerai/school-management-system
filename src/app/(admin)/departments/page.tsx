"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DepartmentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
        <CardDescription>Manage academic departments.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Department management features will be implemented here.</p>
      </CardContent>
    </Card>
  );
}