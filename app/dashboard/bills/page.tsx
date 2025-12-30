import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
// We use '@' to find the file from the project root, which fixes folder depth issues
import { logoutUser, getDashboardStats } from '@/app/lib/actions'; 
import Link from 'next/link';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session');

  if (!sessionId) {
    redirect('/'); 
  }

  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-retro-black text-retro-green font-mono p-4 md:p-8">
      {/* Top Navigation Bar */}
      <div className="flex justify-between items-center border-b-2 border-retro-dim pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter drop-shadow-[0_0_8px_rgba(51,255,0,0.5)]">
            SPENT_SYSTEM
          </h1>
          <p className="text-xs text-retro-dim mt-1">
            USER_ID: {sessionId.value.slice(0, 8)}... // ACCESS_LEVEL: ADMIN
          </p>
        </div>
        
        <form action={logoutUser}>
          <button className="text-xs border border-retro-red text-retro-red px-4 py-2 hover:bg-retro-red hover:text-retro-black transition-colors uppercase tracking-widest cursor-pointer">
            Terminate Session
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Module 1: Bank Accounts & Liquidity */}
        <div className="border border-retro-dim bg-retro-gray/5 p-6 hover:border-retro-green transition-colors group h-full flex flex-col justify-between">
          <Link href="/dashboard/banks" className="block cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold group-hover:drop-shadow-[0_0_5px_rgba(51,255,0,0.5)]">
                BANK_ACCOUNTS
              </h2>
              <span className="text-xs bg-retro-dim text-retro-black px-2 py-1">
                {stats.bankCount.toString().padStart(2, '0')}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-retro-dim">
                <span>TOTAL_ASSETS</span>
                <span>${stats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between text-retro-red">
                <span>LESS_PENDING</span>
                <span>-${stats.pendingOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between border-t border-retro-dim pt-2 mt-2">
                <span className="text-retro-green font-bold">SAFE_TO_SPEND</span>
                <span className="text-retro-green font-bold text-lg drop-shadow-[0_0_5px_rgba(51,255,0,0.5)]">
                  ${stats.safeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </Link>
          
          <div className="mt-6 flex justify-between items-center gap-2">
            <Link href="/dashboard/banks" className="text-xs text-retro-gray hover:text-retro-green transition-colors">
              &gt;&gt; MANAGE
            </Link>
            <Link href="/dashboard/audit" className="flex-1 text-center bg-retro-dim/20 border border-retro-dim text-retro-green py-2 text-xs uppercase hover:bg-retro-green hover:text-retro-black transition-colors font-bold">
              START DAILY AUDIT
            </Link>
          </div>
        </div>

        {/* Module 2: Expenses Log Link */}
        <div className="border border-retro-dim bg-retro-gray/5 p-6 hover:border-retro-green transition-colors group h-full relative flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">
                EXPENSE_LOG
              </h2>
              <Link href="/dashboard/types" className="text-xs border border-retro-dim px-2 py-1 hover:bg-retro-green hover:text-retro-black transition-colors z-20 relative cursor-pointer">
                CONFIG_TYPES
              </Link>
            </div>
            <p className="text-sm text-retro-dim mb-4">
              Track outgoing funds, categorize transactions, and monitor burn rate.
            </p>
          </div>
          
          <Link href="/dashboard/expenses" className="mt-6 text-xs text-retro-gray hover:text-retro-green transition-colors cursor-pointer block">
            &gt;&gt; INPUT_NEW_DATA
          </Link>
        </div>

        {/* Module 3: Pending Queue (UPDATED) */}
        <div className="border border-retro-dim bg-retro-gray/5 p-6 hover:border-retro-green transition-colors group h-full relative flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold group-hover:drop-shadow-[0_0_5px_rgba(51,255,0,0.5)]">
              PENDING_QUEUE
            </h2>
            <Link href="/dashboard/expenses" className="text-xs border border-retro-dim px-2 py-1 hover:bg-retro-green hover:text-retro-black transition-colors z-20 relative cursor-pointer">
              MANAGE_LIST
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {stats.upcomingBills.length > 0 ? (
              stats.upcomingBills.map((exp: any) => (
                <div key={exp.id} className="flex justify-between items-center text-sm border-b border-retro-dim/30 pb-1">
                  
                  {/* Days Indicator */}
                  <div className="flex flex-col items-center min-w-[3rem]">
                    <span className={`text-lg font-bold ${exp.daysUntil < 0 ? 'text-retro-red' : exp.daysUntil <= 3 ? 'text-retro-amber' : 'text-retro-green'}`}>
                      {exp.daysUntil < 0 ? 'OD' : exp.daysUntil}
                    </span>
                    <span className="text-[9px] text-retro-dim uppercase">
                      {exp.daysUntil < 0 ? 'LATE' : 'DAYS'}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="flex-1 px-3 overflow-hidden">
                    <div className="font-bold uppercase truncate">{exp.name}</div>
                    <div className="text-[10px] text-retro-dim flex items-center gap-2">
                       {exp.status === 'not-paid' ? 'NOT_PAID' : 'PENDING'}
                    </div> 
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className="text-retro-amber font-mono">
                      ${exp.amount.toFixed(0)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-retro-dim text-xs italic text-center mt-8">
                ALL TRANSACTIONS CLEARED.
              </div>
            )}
          </div>

          <Link href="/dashboard/expenses" className="mt-4 text-xs text-retro-gray hover:text-retro-green transition-colors cursor-pointer block text-center border-t border-retro-dim pt-2">
            &gt;&gt; VIEW PENDING LOG
          </Link>
        </div>

      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4 text-xs text-retro-dim opacity-50">
        SYSTEM_READY // WAITING_FOR_INPUT
      </div>
    </div>
  );
}