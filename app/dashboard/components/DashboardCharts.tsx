'use client';

import { useState } from 'react';

// --- 1. STACKED BAR (Bank Breakdown) ---
export function BankStackedBar({ banks }: { banks: any[] }) {
  return (
    <div className="space-y-3 mt-4 w-full">
      {banks.map((bank) => {
        const safe = bank.current_balance - bank.pending_total;
        const total = bank.current_balance;
        const safePct = total > 0 ? (safe / total) * 100 : 0;
        const pendingPct = total > 0 ? (bank.pending_total / total) * 100 : 0;

        return (
          <div key={bank.id} className="text-xs">
            <div className="flex justify-between mb-1 text-retro-dim">
              <span className="uppercase truncate max-w-[120px]">{bank.name}</span>
              <span className="font-mono text-retro-green whitespace-nowrap">
                ${safe.toFixed(0)} <span className="text-retro-dim hidden sm:inline">/ ${total.toFixed(0)}</span>
              </span>
            </div>
            <div className="h-3 w-full bg-retro-dim/20 flex">
              <div style={{ width: `${safePct}%` }} className="bg-retro-green h-full shadow-[0_0_5px_rgba(51,255,0,0.5)] transition-all duration-500" />
              <div style={{ width: `${pendingPct}%` }} className="bg-retro-red h-full opacity-80 transition-all duration-500" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- 2. DONUT CHART (Category Breakdown) ---
export function CategoryDonut({ data }: { data: any[] }) {
  const [hovered, setHovered] = useState<any | null>(null);
  
  if (data.length === 0) return <div className="text-center text-retro-dim text-xs py-8">NO DATA THIS MONTH</div>;

  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  let cumulativePercent = 0;
  const colors = ['text-retro-green', 'text-retro-amber', 'text-retro-red', 'text-blue-500', 'text-purple-500'];

  return (
    <div className="relative flex flex-col items-center mt-2 w-full">
      <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
        <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
          {data.map((item, i) => {
            const percent = (item.value / total) * 100;
            const dashArray = `${percent} 100`;
            const dashOffset = 100 - cumulativePercent;
            cumulativePercent += percent;
            return (
              <circle
                key={i}
                r="40"
                cx="50"
                cy="50"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className={`${colors[i % colors.length]} hover:opacity-80 cursor-pointer transition-all duration-300`}
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
                // For Mobile Touch
                onTouchStart={() => setHovered(item)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-retro-dim">
            {hovered ? `${((hovered.value / total) * 100).toFixed(0)}%` : 'TOTAL'}
          </span>
        </div>
      </div>
      
      <div className="mt-4 w-full border-t border-retro-dim pt-2 min-h-[3rem]">
        {hovered ? (
          <div className="text-center animate-pulse">
            <div className="text-sm font-bold uppercase text-retro-green truncate">{hovered.name}</div>
            <div className="text-xs text-retro-dim">${hovered.value.toFixed(2)}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-retro-dim">
            {data.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center overflow-hidden">
                <span className={`w-2 h-2 rounded-full mr-1 shrink-0 ${colors[i % colors.length].replace('text-', 'bg-')}`}></span>
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- 3. GAUGE (Completion %) ---
export function CompletionGauge({ completed, total }: { completed: number, total: number }) {
  const percent = total > 0 ? (completed / total) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const halfCircumference = circumference / 2;
  const strokeDashoffset = halfCircumference - ((percent / 100) * halfCircumference);

  return (
    <div className="flex flex-col items-center mt-2 w-full">
      <div className="relative w-40 h-20 overflow-hidden shrink-0">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#333" strokeWidth="10" />
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="10" className="text-retro-green transition-all duration-1000 ease-out" strokeDasharray={halfCircumference} strokeDashoffset={strokeDashoffset} />
        </svg>
        <div className="absolute bottom-0 left-0 w-full text-center">
          <span className="text-3xl font-bold text-retro-green drop-shadow-[0_0_5px_rgba(51,255,0,0.5)]">{percent}%</span>
        </div>
      </div>
      <div className="text-xs text-retro-dim mt-2 uppercase tracking-widest text-center">
        {completed} / {total} DONE
      </div>
    </div>
  );
}

// --- 4. CASH FLOW MONITOR (Resources vs Obligations) ---
export function CashFlowMonitor({ assets, inbound, expenses }: { assets: number, inbound: number, expenses: number }) {
  const totalResources = assets + inbound;
  const isCovered = totalResources >= expenses;
  const surplus = totalResources - expenses;

  // Bar Calculation
  const maxVal = Math.max(totalResources, expenses);
  const assetsPct = maxVal > 0 ? (assets / maxVal) * 100 : 0;
  const inboundPct = maxVal > 0 ? (inbound / maxVal) * 100 : 0;
  const expensesPct = maxVal > 0 ? (expenses / maxVal) * 100 : 0;

  return (
    <div className="flex flex-col h-full justify-between py-2 w-full">
      
      {/* The Big Number */}
      <div className="text-center mb-4">
        <div className="text-[10px] md:text-xs text-retro-dim uppercase tracking-widest mb-1">PROJECTED MONTH END</div>
        <div className={`text-2xl md:text-3xl font-bold font-mono ${isCovered ? 'text-retro-green' : 'text-retro-red'}`}>
          {isCovered ? '+' : ''}${surplus.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
        <div className="text-[10px] text-retro-dim mt-1">
          {isCovered ? 'SAFE SURPLUS' : 'DEFICIT WARNING'}
        </div>
      </div>

      {/* The Comparison Bars */}
      <div className="space-y-5">
        
        {/* Resource Bar */}
        <div>
          <div className="flex justify-between text-[10px] text-retro-dim mb-1 uppercase">
            <span>Funding</span>
            <span className="text-retro-green">${totalResources.toFixed(0)}</span>
          </div>
          <div className="h-4 w-full bg-retro-dim/10 flex relative border border-retro-dim/30">
            <div style={{ width: `${assetsPct}%` }} className="bg-retro-green h-full" />
            <div style={{ width: `${inboundPct}%` }} className="border-2 border-retro-green border-dashed h-full opacity-50 bg-retro-green/10" />
          </div>
          <div className="flex justify-between text-[9px] text-retro-dim mt-1">
             <div className="flex items-center gap-2">
               <span className="flex items-center"><div className="w-2 h-2 bg-retro-green mr-1"></div> CASH</span>
               <span className="flex items-center"><div className="w-2 h-2 border border-retro-green mr-1 opacity-50"></div> IN</span>
             </div>
             <span>+${inbound.toFixed(0)}</span>
          </div>
        </div>

        {/* Obligation Bar */}
        <div>
          <div className="flex justify-between text-[10px] text-retro-dim mb-1 uppercase">
            <span>Bills</span>
            <span className="text-retro-red">${expenses.toFixed(0)}</span>
          </div>
          <div className="h-4 w-full bg-retro-dim/10 border border-retro-dim/30">
             <div style={{ width: `${expensesPct}%` }} className="bg-retro-red h-full opacity-80" />
          </div>
        </div>
      </div>

    </div>
  );
}