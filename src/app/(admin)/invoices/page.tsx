"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InvoicesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        <CardDescription>Generate and manage invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Invoice generation features will be implemented here.</p>
      </CardContent>
    </Card>
  );
}