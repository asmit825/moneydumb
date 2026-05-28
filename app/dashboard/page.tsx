'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import useTable from './hooks/useTable';
import TableSearch from './components/TableSearch';
import TableHeader from './components/TableHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(n);

interface AccountSummary {
  name: string;
  account_type: string;
  balance: number;
}

interface UpcomingExpense {
  name: string;
  amount: number;
  due_day: number;
  category_name: string;
}

interface MonthProjection {
  month: string;
  income: number;
  income_with_events: number;
  expenses: number;
  net: number;
}

interface DashboardData {
  total_balance: number;
  accounts_summary: AccountSummary[];
  monthly_income: number;
  monthly_expenses: number;
  monthly_debt_payments: number;
  net_cash_flow: number;
  total_debt: number;
  envelopes_over_budget: number;
  envelopes_total: number;
  upcoming_expenses: UpcomingExpense[];
  monthly_projections: MonthProjection[];
}

interface SummaryAlert {
  level: string;
  message: string;
}

interface AiSummaryData {
  overall_grade: string;
  paragraphs: string[];
  alerts: SummaryAlert[];
  savings_rate: number;
}

interface Want {
  id: string;
  name: string;
  estimated_cost: number;
  priority: string;
  notes: string;
  url: string | null;
  created_at: string;
  purchased_at: string | null;
}

interface CalendarWeek {
  week_index: number;
  label: string;
  start_date: string;
  end_date: string;
  days_in_month: number;
  income: number;
  income_with_events: number;
  expenses: number;
  net: number;
}

interface WeeklyViewData {
  year: number;
  month: number;
  month_label: string;
  weeks: CalendarWeek[];
}

interface CalendarDay {
  date: string;
  day_label: string;
  in_month: boolean;
  income: number;
  income_with_events: number;
  expenses: number;
  net: number;
}

interface DailyViewData {
  year: number;
  month: number;
  week_start: string;
  week_end: string;
  days: CalendarDay[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [ai, setAi] = useState<AiSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  // What-If state
  const [wants, setWants] = useState<Want[]>([]);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [selectedWants, setSelectedWants] = useState<Record<string, boolean>>({});

  // Chart controls
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [showEvents, setShowEvents] = useState(false);

  // Drill-down state: 'monthly' | 'weekly' | 'daily'
  const [drillLevel, setDrillLevel] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [weeklyData, setWeeklyData] = useState<WeeklyViewData | null>(null);
  const [dailyData, setDailyData] = useState<DailyViewData | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  // Track month/week for breadcrumbs
  const [drillMonth, setDrillMonth] = useState<{ year: number; month: number; label: string } | null>(null);
  const [drillWeek, setDrillWeek] = useState<{ label: string; start_date: string; end_date: string } | null>(null);

  const upcomingBillsTable = useTable<UpcomingExpense>(data?.upcoming_expenses || [], {
    searchKeys: ['name', 'category_name', 'due_day'],
    sortExtractors: {
      due_day: (item) => item.due_day,
      amount: (item) => item.amount,
    },
    defaultSort: { key: 'due_day', direction: 'asc' },
  });

  const loadData = () => {
    Promise.all([
      axios.get('/api/summary/dashboard'),
      axios.get('/api/summary/ai'),
      axios.get('/api/wants')
    ])
      .then(([dResult, aResult, wResult]) => {
        setData(dResult.data);
        setAi(aResult.data);
        setWants(wResult.data.filter((x: Want) => !x.purchased_at));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMonthDrill = useCallback((monthIndex: number) => {
    if (!data) return;
    const now = new Date();
    const baseMonth = now.getMonth(); // 0-indexed
    const baseYear = now.getFullYear();
    const targetMonth0 = (baseMonth + monthIndex) % 12;
    const targetYear = baseYear + Math.floor((baseMonth + monthIndex) / 12);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    setDrillLoading(true);
    setDrillMonth({
      year: targetYear,
      month: targetMonth0 + 1,
      label: `${monthNames[targetMonth0]} ${targetYear}`
    });
    setDrillLevel('weekly');
    setDrillWeek(null);

    axios.get(`/api/summary/weekly?year=${targetYear}&month=${targetMonth0 + 1}`)
      .then(r => setWeeklyData(r.data))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [data]);

  const handleWeekDrill = useCallback((week: CalendarWeek) => {
    if (!drillMonth) return;
    setDrillLoading(true);
    setDrillWeek({ label: week.label, start_date: week.start_date, end_date: week.end_date });
    setDrillLevel('daily');

    axios.get(`/api/summary/daily?year=${drillMonth.year}&month=${drillMonth.month}&week_start=${week.start_date}`)
      .then(r => setDailyData(r.data))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [drillMonth]);

  const goBackToMonths = () => {
    setDrillLevel('monthly');
    setWeeklyData(null);
    setDailyData(null);
    setDrillMonth(null);
    setDrillWeek(null);
  };

  const goBackToWeeks = () => {
    setDrillLevel('weekly');
    setDailyData(null);
    setDrillWeek(null);
  };

  if (loading) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">
          <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>hourglass_empty</span>
        </div>
        <h3>Loading dashboard...</h3>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>warning_amber</span>
        </div>
        <h3>Could not load data</h3>
        <p>Ensure the database is initialized and connection strings are set.</p>
      </div>
    );
  }

  const COLORS = [
    '#1ed760',
    '#60a5fa',
    '#fbbf24',
    '#fb7185',
    '#a78bfa',
    '#ec4899',
    '#34d399',
    '#2dd4bf',
    '#eab308',
    '#f97316',
    '#6366f1'
  ];

  // What-If calculations
  const toggleWant = (id: string) => setSelectedWants(p => ({ ...p, [id]: !p[id] }));
  const selectedItems = wants.filter(w => selectedWants[w.id]);
  const totalWhatIfCost = selectedItems.reduce((s, w) => s + w.estimated_cost, 0);

  const netCashFlow = data.net_cash_flow;
  const monthlyExpenses = data.monthly_income - netCashFlow;
  const monthsToSave = netCashFlow > 0 ? Math.ceil(totalWhatIfCost / netCashFlow) : Infinity;
  const balanceAfter = data.total_balance - totalWhatIfCost;

  // Determine chart data based on drill level
  const getChartConfig = () => {
    if (drillLevel === 'daily' && dailyData) {
      return { data: dailyData.days, xKey: 'day_label', title: 'Daily View' };
    }
    if (drillLevel === 'weekly' && weeklyData) {
      return { data: weeklyData.weeks, xKey: 'label', title: `${weeklyData.month_label} — Weekly` };
    }
    return {
      data: selectedMonth !== null ? [data.monthly_projections[selectedMonth]] : data.monthly_projections,
      xKey: 'month',
      title: '12-Month Cash Flow Projection'
    };
  };

  const chartConfig = getChartConfig();

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Dashboard</h2>
          <p>Your financial overview at a glance</p>
        </div>
        <button
          className={`btn ${showWhatIf ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowWhatIf(!showWhatIf)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1em' }}>explore</span>{' '}
          {showWhatIf ? 'Close What-If' : 'What-If Simulator'}
        </button>
      </div>

      {/* What-If Simulator Panel */}
      {showWhatIf && (
        <div className="card section" style={{ borderColor: 'var(--border-accent)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--accent), var(--teal), var(--purple))' }} />
          <div className="card-header" style={{ marginTop: 4 }}>
            <h3 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>explore</span> What-If Simulator
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Select want items to see financial impact — nothing is saved
            </span>
          </div>

          {wants.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <p>No unpurchased wants to simulate. Add items in the Wants section first.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {wants.map(w => {
                  const on = selectedWants[w.id];
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleWant(w.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: on ? 'var(--accent-dim)' : 'var(--bg-surface)',
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--r-pill)',
                        color: on ? 'var(--accent)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.82rem',
                        fontWeight: on ? 600 : 400,
                        transition: 'all 0.15s var(--ease)',
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '1em' }}>
                        {on ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>{w.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', opacity: 0.7 }}>
                        {fmt(w.estimated_cost)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedItems.length > 0 && (
                <div className="card-grid-4" style={{ gap: 10 }}>
                  <div className="stat-card" style={{ padding: '14px 18px' }}>
                    <div className="stat-label">Total Cost</div>
                    <div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--amber)' }}>
                      {fmt(totalWhatIfCost)}
                    </div>
                  </div>
                  <div className="stat-card" style={{ padding: '14px 18px' }}>
                    <div className="stat-label">Balance After</div>
                    <div className="stat-value" style={{ fontSize: '1.3rem', color: balanceAfter >= 0 ? 'var(--accent)' : 'var(--rose)' }}>
                      {fmt(balanceAfter)}
                    </div>
                  </div>
                  <div className="stat-card" style={{ padding: '14px 18px' }}>
                    <div className="stat-label">Months to Save</div>
                    <div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--blue)' }}>
                      {monthsToSave === Infinity ? '∞' : monthsToSave}
                    </div>
                    <div className="stat-sub">{netCashFlow > 0 ? `at ${fmt(netCashFlow)}/mo surplus` : 'no surplus'}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '14px 18px' }}>
                    <div className="stat-label">Verdict</div>
                    <div style={{ marginTop: 6 }}>
                      {balanceAfter >= monthlyExpenses * 3 ? (
                        <span className="badge badge-green" style={{ fontSize: '0.78rem' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>check_circle</span>
                          Safe to buy
                        </span>
                      ) : balanceAfter >= monthlyExpenses ? (
                        <span className="badge badge-amber" style={{ fontSize: '0.78rem' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>warning_amber</span>
                          Tight but OK
                        </span>
                      ) : balanceAfter >= 0 ? (
                        <span className="badge badge-red" style={{ fontSize: '0.78rem' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>error</span>
                          Risky
                        </span>
                      ) : (
                        <span className="badge badge-red" style={{ fontSize: '0.78rem' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>block</span>
                          Can't afford
                        </span>
                      )}
                    </div>
                    <div className="stat-sub" style={{ marginTop: 4 }}>
                      {balanceAfter >= monthlyExpenses * 3
                        ? '3+ months expenses left'
                        : balanceAfter >= monthlyExpenses
                        ? '< 3 months expenses left'
                        : balanceAfter >= 0
                        ? '< 1 month expenses left'
                        : 'Would go negative'}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* AI Summary */}
      {ai && (
        <div className="ai-summary section">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>smart_toy</span> Financial Insight
          </h3>
          {ai.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          {ai.alerts.map((a, i) => (
            <div key={i} className={`alert alert-${a.level === 'danger' ? 'danger' : a.level === 'warning' ? 'warning' : 'info'}`}>
              {a.message}
            </div>
          ))}
          <div className="ai-grade">{ai.overall_grade}</div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="card-grid-4 section">
        <div className="stat-card stat-green">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value">{fmt(data.total_balance)}</div>
          <div className="stat-sub">Across {data.accounts_summary.length} accounts</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-label">Monthly Income</div>
          <div className="stat-value">{fmt(data.monthly_income)}</div>
        </div>
        <div className={`stat-card ${data.net_cash_flow >= 0 ? 'stat-green' : 'stat-red'}`}>
          <div className="stat-label">Net Cash Flow</div>
          <div className="stat-value">{fmt(data.net_cash_flow)}</div>
          <div className="stat-sub">{data.net_cash_flow >= 0 ? 'Surplus' : 'Deficit'} per month</div>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-label">Total Debt</div>
          <div className="stat-value">{fmt(data.total_debt)}</div>
          <div className="stat-sub">{fmt(data.monthly_debt_payments)}/mo payments</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="dash-charts-grid section">
        <div className="card">
          <div className="card-header">
            <h3>{chartConfig.title}</h3>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['bar', 'line'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`btn btn-small ${chartType === t ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setShowEvents(prev => !prev)}
                className={`btn btn-small ${showEvents ? 'btn-primary' : 'btn-secondary'}`}
                style={{ marginLeft: 8 }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>bolt</span> Events
              </button>
            </div>
          </div>

          {/* Breadcrumb navigation */}
          {drillLevel !== 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: '0.82rem' }}>
              <span
                onClick={goBackToMonths}
                style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>bar_chart</span> All Months
              </span>
              {drillMonth && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                  <span
                    onClick={drillLevel === 'daily' ? goBackToWeeks : undefined}
                    style={{
                      color: drillLevel === 'daily' ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: drillLevel === 'daily' ? 'pointer' : 'default',
                      fontWeight: drillLevel === 'daily' ? 500 : 600
                    }}
                  >
                    {drillMonth.label}
                  </span>
                </>
              )}
              {drillWeek && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{drillWeek.label}</span>
                </>
              )}
            </div>
          )}

          {/* Month pills (monthly view) */}
          {drillLevel === 'monthly' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              <button
                onClick={() => setSelectedMonth(null)}
                className={`btn btn-small ${selectedMonth === null ? 'btn-primary' : 'btn-secondary'}`}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                All
              </button>
              {data.monthly_projections.map((p, i) => {
                const hasEvent = p.income_with_events > p.income;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedMonth(i)}
                    onDoubleClick={() => handleMonthDrill(i)}
                    className={`btn btn-small ${selectedMonth === i ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Double-click to drill into weeks"
                  >
                    {p.month}
                    {hasEvent ? <span className="material-symbols-rounded" style={{ fontSize: '1em', marginLeft: 4 }}>bolt</span> : ''}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMonthDrill(i);
                      }}
                      title="Drill to weekly"
                      style={{ opacity: 0.4, cursor: 'pointer', display: 'flex' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '1.2em' }}>search</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Week pills (weekly view) */}
          {drillLevel === 'weekly' && weeklyData && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {weeklyData.weeks.map((w, i) => (
                <button
                  key={i}
                  onClick={() => handleWeekDrill(w)}
                  className="btn btn-small btn-secondary"
                  style={{ whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Click to drill into days"
                >
                  {w.label}{' '}
                  <span style={{ opacity: 0.4, display: 'flex' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '1.2em' }}>search</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Selected month detail card */}
          {drillLevel === 'monthly' && selectedMonth !== null && data.monthly_projections[selectedMonth] && (() => {
            const mp = data.monthly_projections[selectedMonth];
            const incomeVal = showEvents ? mp.income_with_events : mp.income;
            const eventExtra = mp.income_with_events - mp.income;
            const netVal = incomeVal - mp.expenses;
            return (
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div className="stat-card" style={{ flex: 1, padding: '12px 16px' }}>
                  <div className="stat-label">Income{showEvents && eventExtra > 0 ? ' (incl. events)' : ''}</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>
                    {fmt(incomeVal)}
                  </div>
                  {showEvents && eventExtra > 0 && (
                    <div className="stat-sub" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'center' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 2 }}>bolt</span> +
                      {fmt(eventExtra)} events
                    </div>
                  )}
                </div>
                <div className="stat-card" style={{ flex: 1, padding: '12px 16px' }}>
                  <div className="stat-label">Expenses</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--rose)' }}>
                    {fmt(mp.expenses)}
                  </div>
                </div>
                <div className="stat-card" style={{ flex: 1, padding: '12px 16px' }}>
                  <div className="stat-label">Net</div>
                  <div className="stat-value" style={{ fontSize: '1.2rem', color: netVal >= 0 ? 'var(--accent)' : 'var(--rose)' }}>
                    {fmt(netVal)}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Chart container */}
          {drillLoading ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              {chartType === 'bar' ? (
                <BarChart data={chartConfig.data as any}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey={chartConfig.xKey} stroke="#4a4a4a" fontSize={12} />
                  <YAxis stroke="#4a4a4a" fontSize={12} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}
                    labelStyle={{ color: '#f0f0f0' }}
                    formatter={(v: any) => fmt(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#a0a0a0' }} />
                  <Bar dataKey={showEvents ? 'income_with_events' : 'income'} fill="#1ed760" radius={[4, 4, 0, 0]} name="Income" />
                  {showEvents && <Bar dataKey="income" fill="rgba(30,215,96,0.25)" radius={[4, 4, 0, 0]} name="Standard" />}
                  <Bar dataKey="expenses" fill="#fb7185" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              ) : (
                <LineChart data={chartConfig.data as any}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey={chartConfig.xKey} stroke="#4a4a4a" fontSize={12} />
                  <YAxis stroke="#4a4a4a" fontSize={12} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}
                    labelStyle={{ color: '#f0f0f0' }}
                    formatter={(v: any) => fmt(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#a0a0a0' }} />
                  <Line
                    type="monotone"
                    dataKey={showEvents ? 'income_with_events' : 'income'}
                    stroke="#1ed760"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#1ed760' }}
                    activeDot={{ r: 6 }}
                    name="Income"
                  />
                  {showEvents && (
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#1ed760"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Standard"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#fb7185"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#fb7185' }}
                    activeDot={{ r: 6 }}
                    name="Expenses"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Account Balances</h3>
          </div>
          {data.accounts_summary.length > 0 ? (() => {
            const positive = [...data.accounts_summary].filter(a => a.balance > 0).sort((a, b) => b.balance - a.balance);
            const negative = [...data.accounts_summary].filter(a => a.balance <= 0).sort((a, b) => a.balance - b.balance);
            const maxBal = positive.length > 0 ? positive[0].balance : 1;
            const totalPositive = positive.reduce((s, a) => s + a.balance, 0);
            const maxNeg = negative.length > 0 ? Math.abs(negative[0].balance) : 1;
            return (
              <div className="account-bars">
                <div className="ab-total">{fmt(data.total_balance)}</div>
                <div className="ab-total-sub">{data.accounts_summary.length} accounts</div>
                {positive.map((a, i) => (
                  <div className="ab-row" key={a.name + i}>
                    <div className="ab-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="ab-info">
                      <div className="ab-name">{a.name}</div>
                      <div className="ab-bar-track">
                        <div
                          className="ab-bar-fill"
                          style={{
                            width: `${(a.balance / maxBal) * 100}%`,
                            background: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                    <div className="ab-values">
                      <div className="ab-amount">{fmt(a.balance)}</div>
                      <div className="ab-pct">{totalPositive > 0 ? ((a.balance / totalPositive) * 100).toFixed(1) : 0}%</div>
                    </div>
                  </div>
                ))}
                {negative.length > 0 && (
                  <>
                    <div className="ab-section-label" style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 2 }}>warning_amber</span>{' '}
                      Overdrawn
                    </div>
                    {negative.map((a, i) => (
                      <div className="ab-row" key={a.name + i}>
                        <div className="ab-dot" style={{ background: 'var(--rose)' }} />
                        <div className="ab-info">
                          <div className="ab-name" style={{ color: 'var(--rose)' }}>
                            {a.name}
                          </div>
                          <div className="ab-bar-track">
                            <div
                              className="ab-bar-fill"
                              style={{
                                width: `${(Math.abs(a.balance) / maxNeg) * 100}%`,
                                background: 'var(--rose)'
                              }}
                            />
                          </div>
                        </div>
                        <div className="ab-values">
                          <div className="ab-amount" style={{ color: 'var(--rose)' }}>
                            {fmt(a.balance)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })() : (
            <div className="empty-state">
              <p>No accounts yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Expenses & Envelopes */}
      <div className="dash-bottom-grid">
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>calendar_month</span> Upcoming Bills
            </h3>
            <TableSearch
              searchQuery={upcomingBillsTable.searchQuery}
              setSearchQuery={upcomingBillsTable.setSearchQuery}
              isOpen={upcomingBillsTable.searchOpen}
              setIsOpen={upcomingBillsTable.setSearchOpen}
            />
          </div>
          {data.upcoming_expenses.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <TableHeader
                    label="Expense"
                    sortKey="name"
                    activeKey={upcomingBillsTable.sortKey}
                    activeDirection={upcomingBillsTable.sortDirection}
                    onClick={upcomingBillsTable.requestSort}
                  />
                  <TableHeader
                    label="Due Day"
                    sortKey="due_day"
                    activeKey={upcomingBillsTable.sortKey}
                    activeDirection={upcomingBillsTable.sortDirection}
                    onClick={upcomingBillsTable.requestSort}
                  />
                  <TableHeader
                    label="Amount"
                    sortKey="amount"
                    activeKey={upcomingBillsTable.sortKey}
                    activeDirection={upcomingBillsTable.sortDirection}
                    onClick={upcomingBillsTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                </tr>
              </thead>
              <tbody>
                {upcomingBillsTable.data.map((e, i) => (
                  <tr key={i}>
                    <td>
                      {e.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({e.category_name})</span>
                    </td>
                    <td>
                      {e.due_day}
                      {getOrdinal(e.due_day)}
                    </td>
                    <td className="amount" style={{ color: 'var(--rose)' }}>
                      {fmt(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No upcoming bills</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>mail</span> Envelope Status
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="stat-card" style={{ flex: 1, padding: '14px' }}>
              <div className="stat-label">Total Envelopes</div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                {data.envelopes_total}
              </div>
            </div>
            <div className="stat-card" style={{ flex: 1, padding: '14px' }}>
              <div className="stat-label">Over Budget</div>
              <div className="stat-value" style={{ fontSize: '1.4rem', color: data.envelopes_over_budget > 0 ? 'var(--rose)' : 'var(--accent)' }}>
                {data.envelopes_over_budget}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}