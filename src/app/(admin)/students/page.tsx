"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Search, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/data-table-pagination";

type Student = {
  id: string;
  roll_number: string;
  name: string;
  class: string;
  section: string;
  student_types: { name: string } | null;
};

const PAGE_SIZE = 10;

export default function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("students")
        .select("id, roll_number, name, class, section, student_types(name)", { count: 'exact' });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,roll_number.ilike.%${searchTerm}%`);
      }
      
      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error) {
        toast.error("Failed to fetch students.");
      } else if (data) {
        const mappedStudents = data.map((item: any) => ({
          id: item.id,
          roll_number: item.roll_number,
          name: item.name,
          class: item.class,
          section: item.section,
          student_types: item.student_types ? {
            name: item.student_types.name
          } : null
        }));
        setStudents(mappedStudents);
        setTotalCount(count || 0);
      }
      setIsLoading(false);
    };

    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Students</CardTitle>
            <CardDescription>Manage student records.</CardDescription>
          </div>
          <Link href="/students/add">
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Student
              </span>
            </Button>
          </Link>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or roll number..."
            className="w-full rounded-lg bg-background pl-8 md:w-[300px]"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Student Type</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : students.length > 0 ? (
              students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.roll_number}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.class}-{student.section}</TableCell>
                  <TableCell>{student.student_types?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/students/${student.id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </CardContent>
    </Card>
  );
}