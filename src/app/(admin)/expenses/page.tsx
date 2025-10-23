"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ExpensesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>Track and manage expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Expense management features will be implemented here.</p>
      </CardContent>
    </Card>
  );
}