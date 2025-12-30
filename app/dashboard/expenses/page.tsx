import { getExpenses, createExpense, deleteExpense, getBanks, getExpenseTypes } from '../../lib/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ExpenseLog() {
  const expenses = await getExpenses();
  const banks = await getBanks();
  const types = await getExpenseTypes();

  async function addExpenseAction(formData: FormData) {
    'use server';
    await createExpense(formData);
    redirect('/dashboard/expenses');
  }

  async function deleteExpenseAction(formData: FormData) {
    'use server';
    await deleteExpense(formData);
  }

  return (
    <div className="min-h-screen bg-retro-black text-retro-green font-mono p-4 md:p-8">
      <div className="flex justify-between items-center border-b-2 border-retro-dim pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter">EXPENSE_LOG</h1>
          <p className="text-xs text-retro-dim mt-1">&gt;&gt; TRANSACTIONS / OUTBOUND</p>
        </div>
        <Link href="/dashboard" className="text-xs border border-retro-dim px-4 py-2 hover:bg-retro-dim hover:text-retro-black transition-colors uppercase">
          &lt;&lt; BACK
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LOG NEW ENTRY FORM */}
        <div className="lg:col-span-1 border border-retro-dim bg-retro-gray/5 p-6 h-fit">
          <h2 className="text-xl font-bold mb-6 border-b border-retro-dim pb-2">LOG_TRANSACTION</h2>
          <form action={addExpenseAction} className="space-y-6">
            
            {/* Status Selection (NEW) */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Status</label>
              <select name="status" className="w-full bg-retro-gray/20 border-b border-retro-green p-2 text-retro-green focus:outline-none cursor-pointer uppercase">
                <option value="pending">PENDING (Hold Funds)</option>
                <option value="not-paid">NOT PAID (Bill in Hand)</option>
                <option value="completed">COMPLETED (Cleared)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Source Account</label>
              <select name="bankId" required className="w-full bg-retro-gray/20 border-b border-retro-green p-2 text-retro-green focus:outline-none cursor-pointer">
                {banks.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (${(Number(b.current_balance) - Number(b.pending_total)).toFixed(2)} avail)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Category</label>
              <select name="typeId" required className="w-full bg-retro-gray/20 border-b border-retro-green p-2 text-retro-green focus:outline-none cursor-pointer">
                {types.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-retro-dim">Amount</label>
                <input name="amount" type="number" step="0.01" required className="w-full bg-transparent border-b border-retro-green p-2 focus:outline-none" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-retro-dim">Date</label>
                <input name="date" type="date" required className="w-full bg-retro-gray/20 border-b border-retro-green p-2 text-retro-green focus:outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Description</label>
              <input name="description" type="text" className="w-full bg-transparent border-b border-retro-green p-2 focus:outline-none uppercase" placeholder="TARGET RUN..." />
            </div>

            <button type="submit" className="w-full bg-retro-green text-retro-black font-bold py-3 hover:bg-retro-dim hover:text-retro-green transition-colors uppercase tracking-widest cursor-pointer">
              RECORD TRANSACTION
            </button>
          </form>
        </div>

        {/* LOG LIST */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 border-b border-retro-dim pb-2">RECENT_ACTIVITY [{expenses.length}]</h2>
          
          <div className="border border-retro-dim">
            <table className="w-full text-left text-sm">
              <thead className="bg-retro-dim text-retro-black uppercase text-xs">
                <tr>
                  <th className="p-3">STS</th>
                  <th className="p-3">DATE</th>
                  <th className="p-3">DESC</th>
                  <th className="p-3">SOURCE</th>
                  <th className="p-3 text-right">AMT</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retro-dim/30">
                {expenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-retro-gray/10 transition-colors">
                    <td className="p-3">
                      {/* Status Badge */}
                      <span className={`text-[10px] px-1 py-0.5 border ${
                        exp.status === 'completed' ? 'border-retro-dim text-retro-dim' : 
                        'border-retro-amber text-retro-amber bg-retro-amber/10'
                      }`}>
                        {exp.status ? exp.status.substring(0,4) : 'PEND'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-retro-dim">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="p-3 uppercase font-bold">{exp.description}</td>
                    <td className="p-3 text-xs text-retro-dim">{exp.bank_name}</td>
                    <td className="p-3 text-right text-retro-red">-${Number(exp.amount).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <form action={deleteExpenseAction}>
                        <input type="hidden" name="id" value={exp.id} />
                        <button className="text-retro-dim hover:text-retro-red">x</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}