import { getBankById, getInbounds, updateBankBalance, createInbound, deleteInbound } from '../../../lib/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function BankDetail({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const bank = await getBankById(id);
  const inbounds = await getInbounds(id);

  if (!bank) {
    return <div className="p-8 text-retro-red">ERROR: BANK NOT FOUND</div>;
  }

  // Calculate the math
  const actual = Number(bank.current_balance);
  const pending = Number(bank.pending_total);
  const safe = actual - pending;

  return (
    <div className="min-h-screen bg-retro-black text-retro-green font-mono p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-retro-dim pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase">{bank.name}</h1>
          <p className="text-xs text-retro-dim mt-1">&gt;&gt; ACCOUNTS / DETAIL_VIEW</p>
        </div>
        <Link href="/dashboard/banks" className="text-xs border border-retro-dim px-4 py-2 hover:bg-retro-dim hover:text-retro-black transition-colors uppercase">
          &lt;&lt; RETURN
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Update Balance & Add Inbound */}
        <div className="space-y-8">
          
          {/* 1. Update Current Balance (UPDATED VISUALS) */}
          <div className="border border-retro-dim bg-retro-gray/5 p-6">
            <h2 className="text-xl font-bold mb-4 border-b border-retro-dim pb-2">CURRENT_STATUS</h2>
            
            {/* The Math Display */}
            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between text-retro-dim">
                <span>BANK_ACTUAL:</span>
                <span>${actual.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-retro-red">
                <span>LESS_PENDING:</span>
                <span>-${pending.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-retro-dim pt-2 font-bold text-xl text-retro-green">
                <span>SAFE_AVAIL:</span>
                <span>${safe.toFixed(2)}</span>
              </div>
            </div>

            <form action={updateBankBalance} className="space-y-4">
              <input type="hidden" name="bankId" value={bank.id} />
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-retro-dim">Update Actual</label>
                <div className="flex items-center border-b border-retro-green">
                  <span className="text-retro-green mr-2">$</span>
                  <input 
                    name="balance" 
                    type="number" 
                    step="0.01" 
                    defaultValue={actual}
                    className="w-full bg-transparent p-2 focus:outline-none text-lg font-bold text-retro-green" 
                  />
                </div>
              </div>
              <button className="w-full border border-retro-dim text-retro-dim py-2 hover:bg-retro-green hover:text-retro-black hover:border-retro-green transition-colors text-xs uppercase tracking-widest cursor-pointer">
                UPDATE BANK ACTUAL
              </button>
            </form>
          </div>

          {/* 2. Add New Inbound */}
          <div className="border border-retro-dim bg-retro-gray/5 p-6">
            <h2 className="text-xl font-bold mb-4 border-b border-retro-dim pb-2">ADD_INBOUND (+)</h2>
            <form action={createInbound} className="space-y-4">
              <input type="hidden" name="bankId" value={bank.id} />
              
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-retro-dim">Expected Date</label>
                <input name="date" type="date" required className="w-full bg-retro-gray/20 border-b border-retro-green p-2 text-retro-green focus:outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-retro-dim">Amount</label>
                <input name="amount" type="number" step="0.01" required className="w-full bg-transparent border-b border-retro-green p-2 focus:outline-none" placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-retro-dim">Note (Max 20)</label>
                <input name="note" type="text" maxLength={20} className="w-full bg-transparent border-b border-retro-green p-2 focus:outline-none uppercase" placeholder="PAYCHECK..." />
              </div>

              <button className="w-full bg-retro-green text-retro-black font-bold py-3 hover:bg-retro-dim hover:text-retro-green transition-colors uppercase tracking-widest cursor-pointer">
                LOG INBOUND
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: List of Inbounds */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 border-b border-retro-dim pb-2">FUTURE_INBOUNDS [{inbounds.length}]</h2>
          
          <div className="border border-retro-dim">
            <table className="w-full text-left text-sm">
              <thead className="bg-retro-dim text-retro-black uppercase text-xs">
                <tr>
                  <th className="p-3">DATE</th>
                  <th className="p-3">NOTE</th>
                  <th className="p-3">AMOUNT</th>
                  <th className="p-3 text-right">ACT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retro-dim/30">
                {inbounds.map((inbound: any) => (
                  <tr key={inbound.id} className="hover:bg-retro-gray/10 transition-colors">
                    <td className="p-3 font-mono">{new Date(inbound.date).toLocaleDateString()}</td>
                    <td className="p-3 uppercase">{inbound.note}</td>
                    <td className="p-3 text-retro-green">+${Number(inbound.amount).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <form action={deleteInbound}>
                        <input type="hidden" name="id" value={inbound.id} />
                        <input type="hidden" name="bankId" value={bank.id} />
                        <button className="text-xs text-retro-red hover:underline decoration-retro-red underline-offset-4 cursor-pointer">
                          [DEL]
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {inbounds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-retro-dim italic">
                      NO INBOUNDS SCHEDULED.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}