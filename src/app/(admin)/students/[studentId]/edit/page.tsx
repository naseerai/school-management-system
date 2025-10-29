import { EditStudentForm } from "@/components/admin/edit-student-form";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <EditStudentForm studentId={studentId} />;
}