import { Payment, StudentDetails } from "@/types";
import { numberToWords } from '@/lib/utils';

export function generateReceiptHtml(student: StudentDetails, payment: Payment): string {
  const paymentDate = new Date(payment.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const createCopy = (copyType: "School Management Copy" | "Student Copy") => `
    <div class="receipt-container">
      <header>
        <h1>SCHOOL/COLLEGE NAME</h1>
        <p>123 Education Lane, Knowledge City, 500001</p>
        <p>Phone: (123) 456-7890</p>
      </header>
      <div class="title-section">
        <h2>FEE RECEIPT</h2>
        <p class="copy-type">${copyType}</p>
      </div>
      <section class="details-grid">
        <div><strong>Receipt No:</strong> ${payment.id.substring(0, 8).toUpperCase()}</div>
        <div><strong>Payment Date:</strong> ${paymentDate}</div>
        <div><strong>Student Name:</strong> ${student.name}</div>
        <div><strong>Roll No:</strong> ${student.roll_number}</div>
        <div><strong>Class:</strong> ${student.class} - ${student.section}</div>
        <div><strong>Academic Year:</strong> ${student.academic_years?.year_name || 'N/A'}</div>
      </section>
      <section class="items-section">
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">S.No.</th>
              <th>Particulars</th>
              <th style="width: 32%;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="align-top">1.</td>
              <td class="align-top">${payment.fee_type}</td>
              <td class="align-top text-right">${payment.amount.toFixed(2)}</td>
            </tr>
            ${payment.notes ? `
              <tr>
                <td></td>
                <td class="notes">(${payment.notes})</td>
                <td></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </section>
      <footer>
        <div class="total-section">
          <div class="total-line">
            <span>Total Amount:</span>
            <span>₹${payment.amount.toFixed(2)}</span>
          </div>
        </div>
        <div class="words-section">
          <p><strong>Amount in Words:</strong> ${numberToWords(payment.amount)}</p>
        </div>
        <div class="signature-section">
          <p>This is a computer-generated receipt.</p>
          <div class="signatory">
            <div class="signature-space"></div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </footer>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fee Receipt</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        body {
          font-family: 'Roboto', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #fff;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        .print-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
        }
        .receipt-wrapper {
          height: 50%;
          box-sizing: border-box;
          page-break-inside: avoid;
          padding: 1cm;
        }
        .receipt-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 1px solid #000;
          padding: 16px;
          font-size: 14px;
          color: #000;
          background-color: #fff;
        }
        header { text-align: center; margin-bottom: 16px; border-bottom: 1px solid #000; padding-bottom: 8px; }
        header h1 { font-size: 24px; font-weight: 700; margin: 0; }
        header p { font-size: 12px; margin: 2px 0; }
        .title-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .title-section h2 { font-size: 18px; font-weight: 600; margin: 0; }
        .copy-type { font-weight: 500; font-size: 12px; border: 1px solid #000; padding: 4px 8px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 16px; border-bottom: 1px solid #000; padding-bottom: 8px; }
        .items-section { flex-grow: 1; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px; }
        th { text-align: left; font-weight: 700; }
        thead tr { border-bottom: 2px solid #000; }
        .align-top { vertical-align: top; }
        .text-right { text-align: right; }
        .notes { font-size: 12px; color: #555; }
        footer { padding-top: 8px; border-top: 2px solid #000; }
        .total-section { display: flex; justify-content: flex-end; margin-bottom: 8px; }
        .total-line { width: 50%; display: flex; justify-content: space-between; font-weight: 700; }
        .words-section { margin-bottom: 32px; }
        .signature-section { display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; }
        .signatory { text-align: center; }
        .signature-space { height: 40px; }
        .signatory p { border-top: 1px solid #000; padding-top: 4px; margin: 0; }
        @page { size: A4; margin: 0; }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="receipt-wrapper">${createCopy("School Management Copy")}</div>
        <div class="receipt-wrapper">${createCopy("Student Copy")}</div>
      </div>
    </body>
    </html>
  `;
}