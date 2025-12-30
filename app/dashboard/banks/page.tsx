import { getBanks, createBank, deleteBank } from '../../lib/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ManageBanks() {
  const banks = await getBanks();

  async function addBankAction(formData: FormData) {
    'use server';
    await createBank(formData);
    redirect('/dashboard/banks');
  }

  async function deleteBankAction(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteBank(id);
    redirect('/dashboard/banks');
  }

  return (
    <div className="min-h-screen bg-retro-black text-retro-green font-mono p-4 md:p-8">
      <div className="flex justify-between items-center border-b-2 border-retro-dim pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter">BANK_MANAGER</h1>
          <p className="text-xs text-retro-dim mt-1">&gt;&gt; SYSTEM_ROOT / ACCOUNTS</p>
        </div>
        <Link href="/dashboard" className="text-xs border border-retro-dim px-4 py-2 hover:bg-retro-dim hover:text-retro-black transition-colors uppercase">
          &lt;&lt; BACK
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD BANK */}
        <div className="lg:col-span-1 border border-retro-dim bg-retro-gray/5 p-6 h-fit">
          <h2 className="text-xl font-bold mb-6 border-b border-retro-dim pb-2">ADD_NEW_UNIT</h2>
          <form action={addBankAction} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Bank Name</label>
              <input name="name" type="text" required className="w-full bg-transparent border-b border-retro-green p-2 focus:outline-none focus:border-retro-amber" placeholder="CHASE_CHK" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Initial Balance</label>
              <input name="balance" type="number" step="0.01" required className="w-full bg-transparent border-b border-retro-green p-2 focus:outline-none focus:border-retro-amber" placeholder="0.00" />
            </div>
            <button type="submit" className="w-full bg-retro-green text-retro-black font-bold py-3 hover:bg-retro-dim hover:text-retro-green transition-colors uppercase tracking-widest cursor-pointer">
              INITIALIZE ACCOUNT
            </button>
          </form>
        </div>

        {/* BANK LIST WITH SAFE BALANCE */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 border-b border-retro-dim pb-2">LIQUIDITY_MONITOR [{banks.length}]</h2>
          
          <div className="border border-retro-dim">
            <table className="w-full text-left text-sm">
              <thead className="bg-retro-dim text-retro-black uppercase text-xs">
                <tr>
                  <th className="p-3">ACCOUNT</th>
                  <th className="p-3 text-right text-retro-dim">BANK_BAL</th>
                  <th className="p-3 text-right text-retro-red">PENDING</th>
                  <th className="p-3 text-right text-retro-green">SAFE_TO_SPEND</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retro-dim/30">
                {banks.map((bank: any) => {
                   const actual = Number(bank.current_balance);
                   const pending = Number(bank.pending_total);
                   const safe = actual - pending;
                   
                   return (
                    <tr key={bank.id} className="hover:bg-retro-gray/10 transition-colors group">
                      <td className="p-3 font-bold uppercase">{bank.name}</td>
                      <td className="p-3 text-right text-retro-dim">${actual.toFixed(2)}</td>
                      <td className="p-3 text-right text-retro-red">
                        {pending > 0 ? `-$${pending.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-3 text-right text-retro-green font-bold text-lg">
                        ${safe.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <form action={deleteBankAction}>
                          <input type="hidden" name="id" value={bank.id} />
                          <button className="text-xs text-retro-dim hover:text-retro-red">[DEL]</button>
                        </form>
                      </td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}