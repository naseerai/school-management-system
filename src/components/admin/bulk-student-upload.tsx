"use client";

import { useState } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { Download, Upload, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AcademicYear } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BulkStudentUploadProps {
  academicYears: AcademicYear[];
  studentTypes: { id: string; name: string }[];
  onSuccess: () => void;
}

export function BulkStudentUpload({ academicYears, studentTypes, onSuccess }: BulkStudentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleDownloadSample = () => {
    const headers = [
      "roll_number", "name", "class", "section", "email", "phone", 
      "student_type", "academic_year", "studying_year", "caste",
      "first_year_tuition_fee", "first_year_jvd_fee", "first_year_concession",
      "second_year_tuition_fee", "second_year_jvd_fee", "second_year_concession",
      "third_year_tuition_fee", "third_year_jvd_fee", "third_year_concession"
    ];
    const sampleData = [
      "101", "John Doe", "BSc", "A", "john.doe@example.com", "1234567890", 
      "Day Scholar", "2024-2025", "1st Year", "General",
      "50000", "20000", "5000",
      "52000", "22000", "0",
      "55000", "25000", "0"
    ];
    const csv = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_students_with_fees.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Processing CSV file...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          toast.error("CSV file is empty or invalid.", { id: toastId });
          setIsUploading(false);
          return;
        }

        const academicYearMap = new Map(academicYears.map(ay => [ay.year_name, ay.id]));
        const studentTypeMap = new Map(studentTypes.map(st => [st.name, st.id]));

        const studentsToInsert: any[] = [];
        const skippedRows: { row: number; reason: string }[] = [];

        rows.forEach((row, index) => {
          const academic_year_id = academicYearMap.get(row.academic_year?.trim());
          const student_type_id = studentTypeMap.get(row.student_type?.trim());

          if (!row.roll_number || !row.name || !row.class || !row.section || !row.studying_year) {
            skippedRows.push({ row: index + 2, reason: "Missing required fields (roll_number, name, class, section, studying_year)." });
            return;
          }
          if (!academic_year_id) {
            skippedRows.push({ row: index + 2, reason: `Invalid or missing academic year: ${row.academic_year}` });
            return;
          }
          if (!student_type_id) {
            skippedRows.push({ row: index + 2, reason: `Invalid or missing student type: ${row.student_type}` });
            return;
          }

          const fee_details: { [key: string]: any[] } = {};
          const feeYears = [
            { year: '1st Year', tuition: 'first_year_tuition_fee', jvd: 'first_year_jvd_fee', concession: 'first_year_concession' },
            { year: '2nd Year', tuition: 'second_year_tuition_fee', jvd: 'second_year_jvd_fee', concession: 'second_year_concession' },
            { year: '3rd Year', tuition: 'third_year_tuition_fee', jvd: 'third_year_jvd_fee', concession: 'third_year_concession' },
          ];

          feeYears.forEach(feeYear => {
            const tuitionFee = parseFloat(row[feeYear.tuition]) || 0;
            const jvdFee = parseFloat(row[feeYear.jvd]) || 0;
            const concession = parseFloat(row[feeYear.concession]) || 0;

            if (tuitionFee > 0 || jvdFee > 0 || concession > 0) {
              fee_details[feeYear.year] = [
                { id: uuidv4(), name: 'Tuition Fee', amount: tuitionFee, concession: concession },
                { id: uuidv4(), name: 'JVD Fee', amount: jvdFee, concession: 0 },
              ];
            }
          });

          studentsToInsert.push({
            roll_number: row.roll_number.trim(),
            name: row.name.trim(),
            class: row.class.trim(),
            section: row.section.trim(),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            student_type_id,
            academic_year_id,
            studying_year: row.studying_year.trim(),
            caste: row.caste?.trim() || null,
            fee_details: fee_details,
          });
        });

        if (skippedRows.length > 0) {
          const skippedRowsDescription = skippedRows.slice(0, 5).map(skipped => `Row ${skipped.row}: ${skipped.reason}`).join('\n');
          const fullDescription = `Skipped ${skippedRows.length} of ${rows.length} rows.\n\nErrors:\n${skippedRowsDescription}${skippedRows.length > 5 ? '\n...' : ''}`;
          
          toast.warning("Some rows were skipped during upload.", {
              description: <pre className="mt-2 w-full rounded-md bg-muted p-4 text-muted-foreground"><code className="text-sm">{fullDescription}</code></pre>,
              duration: 15000,
          });
        }

        if (studentsToInsert.length > 0) {
          const { error } = await supabase.from('students').insert(studentsToInsert);
          if (error) {
            toast.error(`Bulk upload failed: ${error.message}`, { id: toastId });
          } else {
            toast.success(`${studentsToInsert.length} students uploaded successfully!`, { id: toastId });
            onSuccess();
          }
        } else {
          if (skippedRows.length === 0) {
            toast.error("No valid students found in the CSV file.", { id: toastId });
          } else {
            toast.dismiss(toastId);
          }
        }

        setIsUploading(false);
        (event.target as HTMLInputElement).value = "";
      },
      error: (error) => {
        toast.error(`CSV parsing error: ${error.message}`, { id: toastId });
        setIsUploading(false);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Student Upload</CardTitle>
        <CardDescription>Upload a CSV file to add multiple students at once. Please ensure the column headers match the sample file.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={handleDownloadSample} className="gap-2">
            <Download className="h-4 w-4" />
            Download Sample CSV
          </Button>
          <div className="flex items-center gap-2">
            <label htmlFor="csv-upload" className="sr-only">Upload CSV</label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="cursor-pointer"
            />
            {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p><strong>Required Columns:</strong> roll_number, name, class, section, student_type, academic_year, studying_year</p>
          <p><strong>Optional Columns:</strong> email, phone, caste, and fee columns (e.g., first_year_tuition_fee)</p>
        </div>
      </CardContent>
    </Card>
  );
}