import { getBanks, updateAllBalances } from '../../lib/actions';
import Link from 'next/link';

export default async function DailyAudit() {
  const banks = await getBanks();

  async function saveAllAction(formData: FormData) {
    'use server';
    await updateAllBalances(formData);
  }

  return (
    <div className="min-h-screen bg-retro-black text-retro-green font-mono p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-retro-dim pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-retro-amber">DAILY_AUDIT</h1>
          <p className="text-xs text-retro-dim mt-1">&gt;&gt; RECONCILE / ACTUALS</p>
        </div>
        <Link href="/dashboard" className="text-xs border border-retro-dim px-4 py-2 hover:bg-retro-dim hover:text-retro-black transition-colors uppercase">
          [CANCEL]
        </Link>
      </div>

      <div className="max-w-2xl mx-auto border border-retro-dim bg-retro-gray/5 p-8">
        <p className="text-sm text-retro-dim mb-6 uppercase tracking-widest border-b border-retro-dim pb-2">
          Input actual values from banking apps:
        </p>

        <form action={saveAllAction} className="space-y-6">
          <div className="space-y-4">
            {banks.map((bank: any) => (
              <div key={bank.id} className="flex items-center justify-between group hover:bg-retro-gray/10 p-2 transition-colors">
                <label className="text-sm font-bold w-1/3 uppercase truncate" htmlFor={bank.id}>
                  {bank.name}
                </label>
                
                <div className="flex items-center w-1/3 justify-end border-b border-retro-dim group-focus-within:border-retro-amber">
                  <span className="text-retro-dim mr-2">$</span>
                  <input 
                    id={bank.id}
                    name={`balance_${bank.id}`} // Unique name for the server action
                    type="number" 
                    step="0.01" 
                    defaultValue={bank.current_balance}
                    className="bg-transparent text-right font-mono text-lg text-retro-green focus:outline-none w-full"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-retro-dim mt-6">
            <button className="w-full bg-retro-green text-retro-black font-bold py-4 hover:bg-retro-amber transition-colors uppercase tracking-widest text-lg cursor-pointer shadow-[0_0_15px_rgba(51,255,0,0.2)]">
              CONFIRM ACTUALS & UPDATE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}