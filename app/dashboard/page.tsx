import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logoutUser, getDashboardStats } from '@/app/lib/actions';
import { BankStackedBar, CategoryDonut, CompletionGauge, CashFlowMonitor } from './components/DashboardCharts';
import Link from 'next/link';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session');
  if (!sessionId) redirect('/'); 
  const stats = await getDashboardStats();

  // --- RESPONSIVE HEIGHT CLASSES ---
  // Mobile: Auto height (min-300px) so content doesn't overflow
  // Desktop (lg): Fixed height for perfect grid alignment
  const CARD_HEIGHT_TOP = "min-h-[300px] lg:h-[320px]";
  const CARD_HEIGHT_BOTTOM = "min-h-[260px] lg:h-[260px]";

  return (
    <div className="min-h-screen bg-retro-black text-retro-green font-mono p-3 md:p-8">
      
      {/* --- RESPONSIVE HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-retro-dim pb-4 mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tighter drop-shadow-[0_0_8px_rgba(51,255,0,0.5)]">SPENT_SYSTEM</h1>
          <p className="text-[10px] md:text-xs text-retro-dim mt-1">ID: {sessionId.value.slice(0, 8)}... // ADMIN</p>
        </div>
        
        {/* Buttons Stack on Mobile, Row on Desktop */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <a 
            href="/api/report" 
            className="flex-1 md:flex-none text-center text-[10px] md:text-xs border border-retro-amber text-retro-amber px-3 py-2 hover:bg-retro-amber hover:text-retro-black transition-colors uppercase tracking-widest"
          >
            GET_REPORT
          </a>

          <form action={logoutUser} className="flex-1 md:flex-none">
            <button className="w-full md:w-auto text-[10px] md:text-xs border border-retro-red text-retro-red px-3 py-2 hover:bg-retro-red hover:text-retro-black transition-colors uppercase tracking-widest">
              TERMINATE
            </button>
          </form>
        </div>
      </div>

      {/* --- RESPONSIVE GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* === COLUMN 1: BANKING === */}
        <div className="space-y-6">
          <div className={`${CARD_HEIGHT_TOP} border border-retro-dim bg-retro-gray/5 p-4 md:p-6 hover:border-retro-green transition-colors group flex flex-col justify-between`}>
            <Link href="/dashboard/banks" className="block cursor-pointer flex-1">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg md:text-xl font-bold group-hover:drop-shadow-[0_0_5px_rgba(51,255,0,0.5)]">BANK_ACCOUNTS</h2>
                <span className="text-xs bg-retro-dim text-retro-black px-2 py-1">{stats.bankCount.toString().padStart(2, '0')}</span>
              </div>
              <div className="space-y-2 text-sm mt-4 md:mt-8">
                <div className="flex justify-between text-retro-dim"><span>ASSETS</span><span>${stats.totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between text-retro-red"><span>PENDING</span><span>-${stats.pendingOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between border-t border-retro-dim pt-2 mt-2"><span className="text-retro-green font-bold">SAFE</span><span className="text-retro-green font-bold text-lg drop-shadow-[0_0_5px_rgba(51,255,0,0.5)]">${stats.safeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              </div>
            </Link>
            <div className="mt-6 flex flex-col md:flex-row justify-between items-stretch gap-2">
              <Link href="/dashboard/banks" className="text-xs text-center md:text-left text-retro-gray hover:text-retro-green transition-colors py-2">&gt;&gt; MANAGE</Link>
              <Link href="/dashboard/audit" className="flex-1 text-center bg-retro-dim/20 border border-retro-dim text-retro-green py-3 md:py-2 text-xs uppercase hover:bg-retro-green hover:text-retro-black transition-colors font-bold">START AUDIT</Link>
            </div>
          </div>
          <div className={`${CARD_HEIGHT_BOTTOM} border border-retro-dim bg-retro-gray/5 p-4 flex flex-col`}>
            <h3 className="text-xs font-bold text-retro-dim uppercase tracking-widest border-b border-retro-dim pb-2 mb-2">LIQUIDITY_BREAKDOWN</h3>
            <div className="flex-1 flex flex-col justify-center"><BankStackedBar banks={stats.banks} /></div>
          </div>
        </div>

        {/* === COLUMN 2: EXPENSE LOG === */}
        <div className="space-y-6">
          <div className={`${CARD_HEIGHT_TOP} border border-retro-dim bg-retro-gray/5 p-4 md:p-6 hover:border-retro-green transition-colors group relative flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg md:text-xl font-bold">EXPENSE_LOG</h2>
              <Link href="/dashboard/types" className="text-[10px] md:text-xs border border-retro-dim px-2 py-1 hover:bg-retro-green hover:text-retro-black transition-colors z-20 relative cursor-pointer">CONFIG</Link>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar border-t border-retro-dim/30 pt-2 mb-2">
              {stats.upcomingBills.length > 0 ? (
                stats.upcomingBills.map((exp: any) => (
                  <div key={exp.id} className="flex justify-between items-center text-sm border-b border-retro-dim/30 pb-2">
                    <div className="flex flex-col items-center min-w-[3rem]">
                      <span className={`text-lg font-bold ${exp.daysUntil < 0 ? 'text-retro-red' : exp.daysUntil <= 3 ? 'text-retro-amber' : 'text-retro-green'}`}>
                        {exp.daysUntil < 0 ? 'OD' : exp.daysUntil}
                      </span>
                      <span className="text-[9px] text-retro-dim uppercase">{exp.daysUntil < 0 ? 'LATE' : 'DAYS'}</span>
                    </div>
                    <div className="flex-1 px-3 overflow-hidden">
                      <div className="font-bold uppercase truncate max-w-[120px]">{exp.name}</div>
                      <div className="text-[10px] text-retro-dim flex items-center gap-2">
                        {exp.status === 'not-paid' ? 'NOT_PAID' : 'PENDING'}
                      </div> 
                    </div>
                    <div className="text-right">
                      <div className="text-retro-amber font-mono">${exp.amount.toFixed(0)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-retro-dim text-xs italic">
                  ALL CLEARED.
                </div>
              )}
            </div>

            <Link href="/dashboard/expenses" className="mt-auto text-xs text-retro-gray hover:text-retro-green transition-colors cursor-pointer block border-t border-retro-dim pt-4 text-center py-3 md:py-0 bg-retro-dim/10 md:bg-transparent">
              &gt;&gt; INPUT_NEW_DATA
            </Link>
          </div>

          <div className={`${CARD_HEIGHT_BOTTOM} border border-retro-dim bg-retro-gray/5 p-4 flex flex-col`}>
            <h3 className="text-xs font-bold text-retro-dim uppercase tracking-widest border-b border-retro-dim pb-2 mb-2">CATEGORY_SPLIT</h3>
            <div className="flex-1 flex items-center justify-center"><CategoryDonut data={stats.chartData} /></div>
          </div>
        </div>

        {/* === COLUMN 3: COVERAGE MONITOR === */}
        <div className="space-y-6">
          <div className={`${CARD_HEIGHT_TOP} border border-retro-dim bg-retro-gray/5 p-4 md:p-6 hover:border-retro-green transition-colors group relative flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg md:text-xl font-bold group-hover:drop-shadow-[0_0_5px_rgba(51,255,0,0.5)]">COVERAGE</h2>
              <span className="text-[10px] bg-retro-dim text-retro-black px-2 py-1">CURRENT_MO</span>
            </div>
            
            <div className="flex-1">
              <CashFlowMonitor 
                assets={stats.coverage.assets} 
                inbound={stats.coverage.inbound} 
                expenses={stats.coverage.expenses} 
              />
            </div>

            <Link href="/dashboard/banks" className="mt-auto text-xs text-retro-gray hover:text-retro-green transition-colors cursor-pointer block text-center border-t border-retro-dim pt-4 py-3 md:py-0 bg-retro-dim/10 md:bg-transparent">
              &gt;&gt; LOG FUTURE INBOUND
            </Link>
          </div>

          <div className={`${CARD_HEIGHT_BOTTOM} border border-retro-dim bg-retro-gray/5 p-4 flex flex-col`}>
            <h3 className="text-xs font-bold text-retro-dim uppercase tracking-widest border-b border-retro-dim pb-2 mb-2">MONTHLY_PROGRESS</h3>
            <div className="flex-1 flex items-center justify-center"><CompletionGauge completed={stats.completion.completed} total={stats.completion.total} /></div>
          </div>
        </div>

      </div>

      <div className="fixed bottom-4 right-4 text-[10px] md:text-xs text-retro-dim opacity-50 hidden md:block">
        SYSTEM_READY // WAITING_FOR_INPUT
      </div>
    </div>
  );
}