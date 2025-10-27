export type AcademicYear = {
  id: string;
  year_name: string;
  is_active: boolean;
  created_at: string;
};

export type FeeItem = { id: string; name: string; amount: number; concession: number };

export type StudentDetails = {
  id: string; name: string; roll_number: string; class: string; section: string; studying_year: string;
  student_types: { name: string } | null;
  fee_details: { [year: string]: FeeItem[] };
  academic_years: AcademicYear | null;
};

export type Payment = {
  id: string; student_id: string; amount: number; fee_type: string; payment_method: string; created_at: string; notes: string | null;
};

export type Invoice = {
  id: string; due_date: string; status: 'paid' | 'unpaid'; total_amount: number; paid_amount: number; batch_description: string;
};

export type CashierProfile = {
  id: string; has_discount_permission: boolean;
};