"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ActivityLogsPage() {
  const [isLoading] = useState(false);
  const logs = []; // Placeholder for logs data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cashier Activity Logs</CardTitle>
        <CardDescription>
          Review all actions performed by cashiers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <Input placeholder="Filter by Cashier..." className="max-w-xs" />
          <Input type="date" className="max-w-xs" />
          <Input type="date" className="max-w-xs" />
          <Button>Filter</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length > 0 ? (
              <TableRow>
                <TableCell>Data will appear here</TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No activity logs found. Logging needs to be implemented for actions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}