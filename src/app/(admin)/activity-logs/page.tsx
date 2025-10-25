"use client";

import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/data-table-pagination";

type ActivityLog = {
  id: string;
  timestamp: string;
  action: string;
  details: any;
  cashiers: { name: string } | null;
  students: { name: string; roll_number: string } | null;
};

const PAGE_SIZE = 15;

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("activity_logs")
        .select("*, cashiers(name), students(name, roll_number)", { count: 'exact' })
        .order("timestamp", { ascending: false })
        .range(from, to);

      if (error) {
        toast.error("Failed to fetch activity logs.");
      } else {
        setLogs(data as ActivityLog[]);
        setTotalCount(count || 0);
      }
      setIsLoading(false);
    };
    fetchLogs();
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cashier Activity Logs</CardTitle>
        <CardDescription>
          Review the most recent actions performed by cashiers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{log.cashiers?.name || 'N/A'}</TableCell>
                  <TableCell><Badge>{log.action}</Badge></TableCell>
                  <TableCell>{log.students ? `${log.students.name} (${log.students.roll_number})` : 'N/A'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.action === 'Fee Collection' && `Amount: ${log.details.amount}, Type: ${log.details.fee_type}`}
                    {log.action === 'Concession Applied' && `Amount: ${log.details.amount}, Reason: ${log.details.notes}`}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No activity logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
}