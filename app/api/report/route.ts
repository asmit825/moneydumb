import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('session')?.value;

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // --- 1. FETCH BANK DATA ---
    const banksResult = await sql`
      SELECT 
        b.name, 
        b.current_balance,
        COALESCE(SUM(e.amount), 0) as pending_total
      FROM banks b
      LEFT JOIN expenses e ON b.id = e.bank_id 
        AND e.status IN ('not-paid', 'pending') 
        AND e.is_recurring = FALSE
      WHERE b.user_id = ${userId}
      GROUP BY b.id
      ORDER BY b.name ASC
    `;

    // Format Bank Data for Sheet 1
    const bankSheetData = banksResult.rows.map(b => ({
      'Bank Name': b.name,
      'Total Assets': Number(b.current_balance),
      'Pending Deductions': Number(b.pending_total),
      'Safe To Spend': Number(b.current_balance) - Number(b.pending_total)
    }));

    // --- 2. FETCH EXPENSE DATA ---
    const expensesResult = await sql`
      SELECT 
        e.due_date,
        e.name as description,
        t.name as category,
        b.name as source_bank,
        e.status,
        e.amount
      FROM expenses e
      LEFT JOIN banks b ON e.bank_id = b.id
      LEFT JOIN expense_types t ON e.type_id = t.id
      WHERE e.user_id = ${userId} 
      AND e.is_recurring = FALSE
      ORDER BY e.due_date DESC
    `;

    // Format Expense Data for Sheet 2
    const expenseSheetData = expensesResult.rows.map(e => ({
      'Due Date': new Date(e.due_date).toLocaleDateString(),
      'Description': e.description,
      'Category': e.category,
      'Source Bank': e.source_bank,
      'Status': e.status ? e.status.toUpperCase() : 'PENDING',
      'Amount': Number(e.amount)
    }));

    // --- 3. GENERATE EXCEL FILE ---
    const workbook = XLSX.utils.book_new();

    // Create Sheet 1: Bank Totals
    const ws1 = XLSX.utils.json_to_sheet(bankSheetData);
    // Set column widths for readability
    ws1['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, ws1, "Bank Totals");

    // Create Sheet 2: Expenses
    const ws2 = XLSX.utils.json_to_sheet(expenseSheetData);
    ws2['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, ws2, "All Expenses");

    // Generate Buffer
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // --- 4. CREATE FILENAME ---
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const ts = now.getTime(); // Timestamp
    const filename = `${userId}_spent_report_${dateStr}_${ts}.xlsx`;

    // --- 5. RETURN RESPONSE ---
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error) {
    console.error('Report Generation Error:', error);
    return new Response('Error generating report', { status: 500 });
  }
}