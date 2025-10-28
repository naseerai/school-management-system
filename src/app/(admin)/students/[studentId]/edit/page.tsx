import { EditStudentForm } from "@/components/admin/edit-student-form";

type PageProps = {
  params: { studentId: string };
};

export default function EditStudentPage({ params }: PageProps) {
  return <EditStudentForm studentId={params.studentId} />;
}