'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import useTable from '../hooks/useTable';
import TableSearch from '../components/TableSearch';
import TableHeader from '../components/TableHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

function getOrdinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatPayDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  return `${month} ${day}${getOrdinal(day)}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface ChartProps {
  startingBalance: number;
  incomeItems: any[];
  expenseItems: any[];
  debtItems: any[];
  getIncomeAmount: (item: any) => number;
  getExpenseAmount: (item: any) => number;
  getDebtAmount: (item: any) => number;
  viewMonth: number;
  viewYear: number;
}

function DailyCashFlowChart({
  startingBalance,
  incomeItems,
  expenseItems,
  debtItems,
  getIncomeAmount,
  getExpenseAmount,
  getDebtAmount,
  viewMonth,
  viewYear,
}: ChartProps) {
  const chartData = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

    const dailyIncome: Record<number, number> = {};
    const dailyExpense: Record<number, number> = {};
    const dailyDebt: Record<number, number> = {};

    incomeItems.forEach((item) => {
      if (!item.pay_date) return;
      const day = new Date(item.pay_date + 'T12:00:00').getDate();
      const clamped = Math.min(Math.max(day, 1), daysInMonth);
      dailyIncome[clamped] = (dailyIncome[clamped] || 0) + getIncomeAmount(item);
    });

    expenseItems.forEach((item) => {
      const day = item.due_day || 1;
      const clamped = Math.min(Math.max(day, 1), daysInMonth);
      dailyExpense[clamped] = (dailyExpense[clamped] || 0) + getExpenseAmount(item);
    });

    debtItems.forEach((item) => {
      const day = item.due_day || 1;
      const clamped = Math.min(Math.max(day, 1), daysInMonth);
      dailyDebt[clamped] = (dailyDebt[clamped] || 0) + getDebtAmount(item);
    });

    const data = [];
    let balance = startingBalance;
    let cumIncome = 0;
    let cumOutflow = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const inc = dailyIncome[d] || 0;
      const exp = dailyExpense[d] || 0;
      const dbt = dailyDebt[d] || 0;

      cumIncome += inc;
      cumOutflow += exp + dbt;
      balance += inc - exp - dbt;

      data.push({
        day: d,
        label: `${viewMonth}/${d}`,
        balance: Math.round(balance * 100) / 100,
        income: Math.round(cumIncome * 100) / 100,
        outflow: Math.round(cumOutflow * 100) / 100,
      });
    }
    return data;
  }, [
    startingBalance,
    incomeItems,
    expenseItems,
    debtItems,
    getIncomeAmount,
    getExpenseAmount,
    getDebtAmount,
    viewMonth,
    viewYear,
  ]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          Day {label}
        </div>
        {payload.map((p: any, i: number) => (
          <div
            key={i}
            style={{
              color: p.color,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <span>{p.name}</span>
            <span style={{ fontWeight: 600 }}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" opacity={0.3} />
        <XAxis
          dataKey="day"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-color)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
          width={48}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="var(--rose)" strokeDasharray="3 3" opacity={0.5} />
        <Line
          type="monotone"
          dataKey="balance"
          name="Balance"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="var(--teal)"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="5 3"
        />
        <Line
          type="monotone"
          dataKey="outflow"
          name="Outflow"
          stroke="var(--rose)"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="5 3"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ThisMonth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Current month/year being viewed
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [viewYear, setViewYear] = useState(now.getFullYear());

  // Sandbox instance
  const [instanceId, setInstanceId] = useState<string | null>(null);

  // Sandbox state — persisted to DB
  const [paidIncome, setPaidIncome] = useState<Record<string, boolean>>({});
  const [paidExpenses, setPaidExpenses] = useState<Record<string, boolean>>({});
  const [paidDebts, setPaidDebts] = useState<Record<string, boolean>>({});
  const [incomeAmounts, setIncomeAmounts] = useState<Record<string, number>>({});
  const [expenseAmounts, setExpenseAmounts] = useState<Record<string, number>>({});
  const [debtAmounts, setDebtAmounts] = useState<Record<string, number>>({});
  const [debtPayTiers, setDebtPayTiers] = useState<Record<string, string>>({}); // 'min' | 'due' | 'full' | 'custom'
  const [expenseAccounts, setExpenseAccounts] = useState<Record<string, string>>({});
  const [debtAccounts, setDebtAccounts] = useState<Record<string, string>>({});

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingDueNowId, setEditingDueNowId] = useState<string | null>(null);
  const [editDueNowValue, setEditDueNowValue] = useState('');

  // Matrix table state
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'expenses' | 'debts'>('all');
  const [matrixSort, setMatrixSort] = useState('due'); // 'due' | 'amount' | 'name'
  const [matrixSortDir, setMatrixSortDir] = useState<'asc' | 'desc'>('asc');
  const [matrixSearchQuery, setMatrixSearchQuery] = useState('');
  const [matrixSearchOpen, setMatrixSearchOpen] = useState(false);

  // Ad-hoc expenses
  const [adhocItems, setAdhocItems] = useState<any[]>([]);
  const [adhocName, setAdhocName] = useState('');
  const [adhocAmount, setAdhocAmount] = useState('');
  const [paidAdhoc, setPaidAdhoc] = useState<Record<string, boolean>>({});

  // Committed plan & projections
  const [committedPlan, setCommittedPlan] = useState<any>(null);
  const [projection, setProjection] = useState<any>(null);
  const [envelopes, setEnvelopes] = useState<any[]>([]);

  const projectionTable = useTable<any>(projection?.months || [], {
    searchKeys: ['label'],
    sortExtractors: {
      starting_balance: (item) => item.starting_balance,
      total_income: (item) => item.total_income,
      total_recurring_expenses: (item) => item.total_recurring_expenses,
      total_debt_payments: (item) => item.total_debt_payments,
      total_envelope_budgets: (item) => item.total_envelope_budgets,
      ending_balance: (item) => item.ending_balance,
      surplus: (item) => item.surplus,
    },
    defaultSort: undefined,
  });

  // Toggle: use payment_strategy from All Debts table (true by default)
  const [usePaymentStrategy, setUsePaymentStrategy] = useState(true);

  // Debounce save ref
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load data for a given month/year
  const loadMonth = useCallback(async (m: number, y: number) => {
    setLoading(true);
    try {
      const [monthData, instance, committed, proj, envs] = await Promise.all([
        axios.get('/api/summary/this-month').then((r) => r.data),
        axios.post('/api/sandbox/instances', { month: m, year: y }).then((r) => r.data),
        axios.get('/api/debts/payoff/committed').then((r) => r.data).catch(() => null),
        axios.get('/api/summary/budget-projection', { params: { months: 3 } }).then((r) => r.data).catch(() => null),
        axios.get('/api/envelopes', { params: { month: m, year: y } }).then((r) => r.data).catch(() => []),
      ]);
      setData(monthData);
      setInstanceId(instance.id);
      setCommittedPlan(committed);
      setProjection(proj);
      setEnvelopes(envs);

      // Load saved sandbox items
      const items = await axios.get(`/api/sandbox/instances/${instance.id}/items`).then((r) => r.data);
      const pi: Record<string, boolean> = {};
      const pe: Record<string, boolean> = {};
      const pd: Record<string, boolean> = {};
      const pa: Record<string, boolean> = {};
      const ia: Record<string, number> = {};
      const ea: Record<string, number> = {};
      const da: Record<string, number> = {};
      const eAcct: Record<string, string> = {};
      const dAcct: Record<string, string> = {};
      const adhocs: any[] = [];

      items.forEach((item: any) => {
        if (item.item_type === 'income') {
          if (item.is_paid) pi[item.item_ref_id] = true;
          if (item.amount_override != null) ia[item.item_ref_id] = item.amount_override;
        } else if (item.item_type === 'expense') {
          if (item.is_paid) pe[item.item_ref_id] = true;
          if (item.amount_override != null) ea[item.item_ref_id] = item.amount_override;
          if (item.account_id) eAcct[item.item_ref_id] = item.account_id;
        } else if (item.item_type === 'debt') {
          if (item.is_paid) pd[item.item_ref_id] = true;
          if (item.amount_override != null) da[item.item_ref_id] = item.amount_override;
          if (item.account_id) dAcct[item.item_ref_id] = item.account_id;
        } else if (item.item_type === 'adhoc') {
          adhocs.push(item);
          if (item.is_paid) pa[item.id] = true;
        }
      });

      const staleSandboxUpdates: any[] = [];
      monthData.debt_items.forEach((debtItem: any) => {
        if (
          debtItem.payment_strategy === 'payoff_plan' &&
          da[debtItem.id] != null &&
          Math.abs(da[debtItem.id] - debtItem.minimum_payment) < 0.01
        ) {
          delete da[debtItem.id];
          staleSandboxUpdates.push({
            item_type: 'debt',
            item_ref_id: debtItem.id,
            is_paid: !!pd[debtItem.id],
            amount_override: null,
            account_id: dAcct[debtItem.id] || debtItem.account_id || null,
          });
        }
      });

      if (staleSandboxUpdates.length > 0) {
        axios.put(`/api/sandbox/instances/${instance.id}/items`, staleSandboxUpdates).catch(console.error);
      }

      setPaidIncome(pi);
      setPaidExpenses(pe);
      setPaidDebts(pd);
      setPaidAdhoc(pa);
      setIncomeAmounts(ia);
      setExpenseAmounts(ea);
      setDebtAmounts(da);
      setExpenseAccounts(eAcct);
      setDebtAccounts(dAcct);
      setAdhocItems(adhocs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonth(viewMonth, viewYear);
  }, [viewMonth, viewYear, loadMonth]);

  const persistState = useCallback(() => {
    if (!instanceId || !data) return;

    const items: any[] = [];

    data.income_items.forEach((item: any) => {
      items.push({
        item_type: 'income',
        item_ref_id: item.id,
        is_paid: !!paidIncome[item.id],
        amount_override: incomeAmounts[item.id] ?? null,
        account_id: null,
      });
    });

    data.expense_items.forEach((item: any) => {
      items.push({
        item_type: 'expense',
        item_ref_id: item.id,
        is_paid: !!paidExpenses[item.id],
        amount_override: expenseAmounts[item.id] ?? null,
        account_id: expenseAccounts[item.id] || item.account_id || null,
      });
    });

    data.debt_items.forEach((item: any) => {
      items.push({
        item_type: 'debt',
        item_ref_id: item.id,
        is_paid: !!paidDebts[item.id],
        amount_override: debtAmounts[item.id] ?? null,
        account_id: debtAccounts[item.id] || item.account_id || null,
      });
    });

    axios.put(`/api/sandbox/instances/${instanceId}/items`, items).catch(console.error);
  }, [
    instanceId,
    data,
    paidIncome,
    paidExpenses,
    paidDebts,
    incomeAmounts,
    expenseAmounts,
    debtAmounts,
    expenseAccounts,
    debtAccounts,
  ]);

  const debouncedSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistState(), 300);
  }, [persistState]);

  useEffect(() => {
    if (instanceId && data) debouncedSave();
  }, [
    paidIncome,
    paidExpenses,
    paidDebts,
    incomeAmounts,
    expenseAmounts,
    debtAmounts,
    expenseAccounts,
    debtAccounts,
    debouncedSave,
    instanceId,
    data,
  ]);

  const handleAddAdhoc = async () => {
    if (!adhocName.trim() || !adhocAmount || !instanceId) return;
    try {
      const item = await axios
        .post(`/api/sandbox/instances/${instanceId}/adhoc`, {
          name: adhocName.trim(),
          amount: parseFloat(adhocAmount),
        })
        .then((r) => r.data);
      setAdhocItems((prev) => [...prev, item]);
      setAdhocName('');
      setAdhocAmount('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAdhoc = async (itemId: string) => {
    if (!instanceId) return;
    try {
      await axios.delete(`/api/sandbox/instances/${instanceId}/adhoc/${itemId}`);
      setAdhocItems((prev) => prev.filter((i) => i.id !== itemId));
      setPaidAdhoc((prev) => {
        const n = { ...prev };
        delete n[itemId];
        return n;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAdhoc = (id: string) => {
    const nextPaid = !paidAdhoc[id];
    setPaidAdhoc((p) => ({ ...p, [id]: nextPaid }));
    if (instanceId) {
      const item = adhocItems.find((i) => i.id === id);
      if (item) {
        axios
          .put(`/api/sandbox/instances/${instanceId}/items`, [
            {
              id: item.id,
              item_type: 'adhoc',
              item_ref_id: item.item_ref_id,
              is_paid: nextPaid,
              amount_override: item.amount_override,
              account_id: null,
              name: item.name,
            },
          ])
          .catch(console.error);
      }
    }
  };

  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    setViewMonth(now.getMonth() + 1);
    setViewYear(now.getFullYear());
  };

  const currentMonthNum = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthOffset = (viewYear - currentYear) * 12 + (viewMonth - currentMonthNum);
  const isFutureMonth = monthOffset > 0;

  const projectedAccountBalances = useMemo(() => {
    if (!isFutureMonth || !data) return null;
    const balances: Record<string, number> = {};
    data.accounts.forEach((a: any) => {
      balances[a.id] = a.balance;
    });

    const computeAllocations = () => {
      const byAccount: Record<string, number> = {};
      if (!data.allocations) return byAccount;
      data.income_items.forEach((item: any) => {
        const amount = incomeAmounts[item.id] ?? item.amount;
        const sourceAllocs = data.allocations.filter(
          (alloc: any) => alloc.income_source_id === item.source_id
        );

        const scale = item.amount > 0 ? amount / item.amount : 0;

        sourceAllocs.forEach((alloc: any) => {
          let allocated = 0;
          if (amount === 0) {
            allocated = 0;
          } else if (alloc.allocation_type === 'percent') {
            allocated = amount * (alloc.allocation_value / 100);
          } else {
            allocated = alloc.allocation_value * scale;
          }
          byAccount[alloc.account_id] = (byAccount[alloc.account_id] || 0) + allocated;
        });
      });
      return byAccount;
    };
    const allIncomeByAcct = computeAllocations();

    for (let step = 0; step < monthOffset; step++) {
      const projMonth = projection?.months?.[step];

      data.accounts.forEach((a: any) => {
        balances[a.id] += allIncomeByAcct[a.id] || 0;

        data.expense_items.forEach((e: any) => {
          if ((e.account_id || null) === a.id) balances[a.id] -= e.amount;
        });

        data.debt_items.forEach((d: any) => {
          if ((d.account_id || null) === a.id) {
            const projDebt = projMonth?.debt_details?.find((dd: any) => dd.debt_id === d.id);
            balances[a.id] -= projDebt ? projDebt.payment : d.minimum_payment;
          }
        });
      });
    }

    Object.keys(balances).forEach((k) => {
      balances[k] = Math.round(balances[k] * 100) / 100;
    });
    return balances;
  }, [isFutureMonth, data, monthOffset, projection, incomeAmounts]);

  if (loading) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">
          <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
            hourglass_empty
          </span>
        </div>
        <h3>Loading sandbox...</h3>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
            warning_amber
          </span>
        </div>
        <h3>Could not load data</h3>
        <p>Make sure the backend database is properly configured.</p>
      </div>
    );
  }

  const getIncomeAmount = (item: any) => incomeAmounts[item.id] ?? item.amount;
  const getExpenseAmount = (item: any) => expenseAmounts[item.id] ?? item.amount;
  const getDebtAmount = (item: any) => {
    if (debtAmounts[item.id] != null) return debtAmounts[item.id];
    if (usePaymentStrategy && item.calculated_payment != null) return item.calculated_payment;
    return item.amount_due_immediately > 0 ? item.amount_due_immediately : item.minimum_payment;
  };

  const getDebtTier = (item: any) => {
    if (debtPayTiers[item.id]) return debtPayTiers[item.id];
    if (usePaymentStrategy && item.payment_strategy) {
      if (item.payment_strategy === 'payoff_plan') return 'payoff_plan';
      if (item.payment_strategy === 'due_now') return 'due';
      return 'min';
    }
    if (debtAmounts[item.id] != null) return 'custom';
    return item.amount_due_immediately > 0 ? 'due' : 'min';
  };

  const handleSetDebtTier = (item: any, tier: string) => {
    setDebtPayTiers((p) => ({ ...p, [item.id]: tier }));
    if (tier === 'min') {
      setDebtAmounts((p) => ({ ...p, [item.id]: item.minimum_payment }));
    } else if (tier === 'due') {
      setDebtAmounts((p) => ({
        ...p,
        [item.id]: item.amount_due_immediately || item.minimum_payment,
      }));
    } else if (tier === 'full') {
      setDebtAmounts((p) => ({ ...p, [item.id]: item.balance }));
    }
  };

  const getExpenseAccountId = (item: any) => expenseAccounts[item.id] || item.account_id || null;
  const getDebtAccountId = (item: any) => debtAccounts[item.id] || item.account_id || null;

  const startingBalance = data.totals.total_balance;
  const incomeReceived = data.income_items
    .filter((i: any) => paidIncome[i.id])
    .reduce((s: number, i: any) => s + getIncomeAmount(i), 0);
  const expensesPaid = data.expense_items
    .filter((e: any) => paidExpenses[e.id])
    .reduce((s: number, e: any) => s + getExpenseAmount(e), 0);
  const debtsPaid = data.debt_items
    .filter((d: any) => paidDebts[d.id])
    .reduce((s: number, d: any) => s + getDebtAmount(d), 0);
  const adhocSpent = adhocItems
    .filter((a: any) => paidAdhoc[a.id])
    .reduce((s: number, a: any) => s + (a.amount_override || 0), 0);
  const projectedBalance = startingBalance + incomeReceived - expensesPaid - debtsPaid - adhocSpent;

  const totalIncome = data.income_items.reduce((s: number, i: any) => s + getIncomeAmount(i), 0);
  const totalExpenses = data.expense_items.reduce((s: number, e: any) => s + getExpenseAmount(e), 0);
  const totalDebtPayments = data.debt_items.reduce((s: number, d: any) => s + getDebtAmount(d), 0);
  const totalAdhoc = adhocItems.reduce((s: number, a: any) => s + (a.amount_override || 0), 0);

  const unpaidExpenses = data.expense_items.filter((e: any) => !paidExpenses[e.id]).length;
  const unpaidDebts = data.debt_items.filter((d: any) => !paidDebts[d.id]).length;
  const pendingIncome = data.income_items.filter((i: any) => !paidIncome[i.id]).length;
  const unpaidAdhocCount = adhocItems.filter((a: any) => !paidAdhoc[a.id]).length;

  const totalEnvelopeBudget = envelopes.reduce((s, e) => s + Number(e.budgeted_amount), 0);

  const accountAllIncome = computeIncomeByAccount(data.income_items);
  const accountAdditions = computeIncomeByAccount(data.income_items.filter((i: any) => paidIncome[i.id]));

  function computeIncomeByAccount(incomeItems: any[]) {
    const byAccount: Record<string, number> = {};
    if (!data.allocations) return byAccount;
    incomeItems.forEach((item) => {
      const amount = getIncomeAmount(item);
      const sourceAllocations = data.allocations.filter(
        (alloc: any) => alloc.income_source_id === item.source_id
      );

      const scale = item.amount > 0 ? amount / item.amount : 0;

      sourceAllocations.forEach((alloc: any) => {
        let allocated = 0;
        if (amount === 0) {
          allocated = 0;
        } else if (alloc.allocation_type === 'percent') {
          allocated = amount * (alloc.allocation_value / 100);
        } else {
          allocated = alloc.allocation_value * scale;
        }
        byAccount[alloc.account_id] = (byAccount[alloc.account_id] || 0) + allocated;
      });
    });
    return byAccount;
  }

  const accountDeductions: Record<string, number> = {};
  data.expense_items
    .filter((e: any) => paidExpenses[e.id])
    .forEach((e: any) => {
      const acctId = getExpenseAccountId(e);
      if (acctId) accountDeductions[acctId] = (accountDeductions[acctId] || 0) + getExpenseAmount(e);
    });
  data.debt_items
    .filter((d: any) => paidDebts[d.id])
    .forEach((d: any) => {
      const acctId = getDebtAccountId(d);
      if (acctId) accountDeductions[acctId] = (accountDeductions[acctId] || 0) + getDebtAmount(d);
    });

  const accountPending: Record<string, number> = {};
  data.expense_items
    .filter((e: any) => !paidExpenses[e.id])
    .forEach((e: any) => {
      const acctId = getExpenseAccountId(e);
      if (acctId) accountPending[acctId] = (accountPending[acctId] || 0) + getExpenseAmount(e);
    });
  data.debt_items
    .filter((d: any) => !paidDebts[d.id])
    .forEach((d: any) => {
      const acctId = getDebtAccountId(d);
      if (acctId) accountPending[acctId] = (accountPending[acctId] || 0) + getDebtAmount(d);
    });

  const toggleIncome = (id: string) => setPaidIncome((p) => ({ ...p, [id]: !p[id] }));
  const toggleExpense = (id: string) => setPaidExpenses((p) => ({ ...p, [id]: !p[id] }));
  const toggleDebt = (id: string) => setPaidDebts((p) => ({ ...p, [id]: !p[id] }));

  const assignExpenseAccount = (itemId: string, accountId: string) => {
    setExpenseAccounts((p) => ({ ...p, [itemId]: accountId || '' }));
  };
  const assignDebtAccount = (itemId: string, accountId: string) => {
    setDebtAccounts((p) => ({ ...p, [itemId]: accountId || '' }));
  };

  const startEdit = (id: string, currentValue: number) => {
    setEditingId(id);
    setEditValue(String(currentValue));
  };
  const saveIncomeEdit = (id: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) setIncomeAmounts((p) => ({ ...p, [id]: val }));
    setEditingId(null);
  };
  const saveExpenseEdit = (id: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) setExpenseAmounts((p) => ({ ...p, [id]: val }));
    setEditingId(null);
  };
  const saveDebtEdit = (id: string) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) setDebtAmounts((p) => ({ ...p, [id]: val }));
    setEditingId(null);
  };
  const handleKeyDown = (e: React.KeyboardEvent, saveFn: () => void) => {
    if (e.key === 'Enter') saveFn();
    if (e.key === 'Escape') setEditingId(null);
  };

  const startEditDueNow = (item: any) => {
    setEditingDueNowId(item.id);
    setEditDueNowValue(item.amount_due_immediately > 0 ? String(item.amount_due_immediately) : '');
  };

  const saveDueNowEdit = async (id: string) => {
    const val = parseFloat(editDueNowValue);
    const finalVal = isNaN(val) || val < 0 ? 0 : val;
    try {
      await axios.put(`/api/debts/${id}`, { amount_due_immediately: finalVal });
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          debt_items: prev.debt_items.map((d: any) =>
            d.id === id ? { ...d, amount_due_immediately: finalVal } : d
          ),
        };
      });
      if (getDebtTier({ id }) === 'due') {
        setDebtAmounts((p) => ({ ...p, [id]: finalVal }));
        if (instanceId) {
          await axios.put(`/api/sandbox/instances/${instanceId}/items`, [
            {
              item_type: 'debt',
              item_ref_id: id,
              is_paid: !!paidDebts[id],
              amount_override: finalVal,
              account_id: debtAccounts[id] || null,
            },
          ]);
        }
      }
      const freshData = await axios.get('/api/summary/this-month').then((r) => r.data);
      setData(freshData);
    } catch (e) {
      console.error(e);
    }
    setEditingDueNowId(null);
  };

  const handleDueNowKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') saveDueNowEdit(id);
    if (e.key === 'Escape') setEditingDueNowId(null);
  };

  const todayDay = new Date().getDate();
  const isCurrentMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

  const effectiveStartingBalance =
    isFutureMonth && projectedAccountBalances
      ? Object.values(projectedAccountBalances).reduce((s, v) => s + v, 0)
      : startingBalance;

  const getEffectiveDebtAmount = (item: any) => {
    if (isFutureMonth && projection?.months) {
      const projMonth = projection.months.find(
        (m: any) => m.month === viewMonth && m.year === viewYear
      );
      if (projMonth) {
        const detail = projMonth.debt_details?.find((dd: any) => dd.debt_id === item.id);
        if (detail) return detail.payment;
      }
    }
    return getDebtAmount(item);
  };

  const effectiveTotalDebtPayments = data.debt_items.reduce(
    (s: number, d: any) => s + getEffectiveDebtAmount(d),
    0
  );

  return (
    <div className="fade-in">
      {/* ---- Header ---- */}
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary btn-small" onClick={goToPrevMonth}>
              «
            </button>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 8 }}>
                calendar_month
              </span>{' '}
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </h2>
            <button className="btn btn-secondary btn-small" onClick={goToNextMonth}>
              »
            </button>
            {!isCurrentMonth && (
              <button
                className="btn btn-secondary btn-small"
                onClick={goToCurrentMonth}
                style={{ marginLeft: 8 }}
              >
                Today
              </button>
            )}
          </div>
          <p style={{ marginTop: 4 }}>Sandbox instance — changes persist across sessions</p>
        </div>
        <span
          className="badge badge-purple"
          style={{ fontSize: '0.75rem', padding: '5px 14px' }}
        >
          <span style={{ fontSize: '1.2em', marginRight: 4 }} className="material-symbols-rounded">
            science
          </span>{' '}
          Sandbox — isolated from other pages
        </span>
      </div>

      {/* Committed Plan Banner */}
      {committedPlan && (
        <div
          style={{
            padding: '10px 18px',
            marginBottom: 12,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(74,144,217,0.12), rgba(34,197,94,0.08))',
            border: '1px solid rgba(74,144,217,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1.2em' }}>
            {committedPlan.strategy === 'snowball' ? 'ac_unit' : 'landscape'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Committed: {committedPlan.strategy === 'snowball' ? 'Snowball' : 'Avalanche'} Plan
              {committedPlan.target_months && (
                <span style={{ color: 'var(--accent)', marginLeft: 8 }}>
                  • {committedPlan.target_months} month target
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Debt payments auto-populated from your committed plan •{' '}
              <a href="/dashboard/debts" style={{ color: 'var(--accent)' }}>
                Change plan →
              </a>
            </div>
          </div>
          {committedPlan.extra_payment > 0 && (
            <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
              +{fmt(committedPlan.extra_payment)} extra/mo
            </span>
          )}
        </div>
      )}

      {/* Future Month Banner */}
      {isFutureMonth && (
        <div
          style={{
            padding: '10px 18px',
            marginBottom: 12,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(74,144,217,0.08))',
            border: '1px solid rgba(168,85,247,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>
            bar_chart
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Projected Month — Based on current month's plan
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Account balances and debt payments are projected forward from{' '}
              {MONTH_NAMES[currentMonthNum - 1]}
            </div>
          </div>
          <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
            {monthOffset} month{monthOffset > 1 ? 's' : ''} ahead
          </span>
        </div>
      )}

      {/* Summary Bar */}
      <div className="tm-summary-bar section">
        <div className="tm-summary-item">
          <div className="tm-summary-label">Starting Balance</div>
          <div className="tm-summary-value" style={{ color: 'var(--text-primary)' }}>
            {fmt(effectiveStartingBalance)}
          </div>
        </div>
        <div className="tm-summary-arrow">+</div>
        <div className="tm-summary-item">
          <div className="tm-summary-label">Income Received</div>
          <div className="tm-summary-value" style={{ color: 'var(--accent)' }}>
            {fmt(incomeReceived)}
          </div>
          <div className="tm-summary-sub">{pendingIncome} pending</div>
        </div>
        <div className="tm-summary-arrow">−</div>
        <div className="tm-summary-item">
          <div className="tm-summary-label">Bills Paid</div>
          <div className="tm-summary-value" style={{ color: 'var(--rose)' }}>
            {fmt(expensesPaid)}
          </div>
          <div className="tm-summary-sub">{unpaidExpenses} remaining</div>
        </div>
        <div className="tm-summary-arrow">−</div>
        <div className="tm-summary-item">
          <div className="tm-summary-label">Debts Paid</div>
          <div className="tm-summary-value" style={{ color: 'var(--amber)' }}>
            {fmt(debtsPaid)}
          </div>
          <div className="tm-summary-sub">{unpaidDebts} remaining</div>
        </div>
        <div className="tm-summary-arrow">=</div>
        <div className="tm-summary-item tm-summary-result">
          <div className="tm-summary-label">Projected Balance</div>
          <div
            className="tm-summary-value"
            style={{
              color: projectedBalance >= 0 ? 'var(--accent)' : 'var(--rose)',
              fontSize: '1.5rem',
            }}
          >
            {fmt(projectedBalance)}
          </div>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="card section">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              account_balance
            </span>{' '}
            Account Balances
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {isFutureMonth
              ? 'Projected starting balances'
              : 'Current + incoming from paycheck splits'}
          </span>
        </div>
        <div className="tm-accounts-grid">
          {data.accounts.map((a: any) => {
            const effectiveBalance =
              isFutureMonth && projectedAccountBalances
                ? projectedAccountBalances[a.id]
                : a.balance;
            const deducted = accountDeductions[a.id] || 0;
            const pending = accountPending[a.id] || 0;
            const allIncome = accountAllIncome[a.id] || 0;
            const received = accountAdditions[a.id] || 0;
            const incoming = isFutureMonth ? 0 : allIncome - received;
            const projected =
              effectiveBalance + incoming - (isFutureMonth ? 0 : deducted) - (isFutureMonth ? 0 : pending);
            return (
              <div key={a.id} className="tm-account-chip">
                <div className="tm-account-name">{a.name}</div>
                <div className="tm-account-type">{a.account_type}</div>
                <div
                  className="tm-account-balance"
                  style={{ color: effectiveBalance >= 0 ? 'var(--accent)' : 'var(--rose)' }}
                >
                  {fmtFull(effectiveBalance)}
                </div>
                <div className="tm-account-after">
                  {incoming > 0 && (
                    <div className="tm-after-line">
                      <span>+ Incoming:</span>
                      <span style={{ color: 'var(--teal)', fontWeight: 600 }}>
                        +{fmtFull(incoming)}
                      </span>
                    </div>
                  )}
                  {deducted + pending > 0 && (
                    <div className="tm-after-line">
                      <span>− Outgoing:</span>
                      <span style={{ color: 'var(--rose)', fontWeight: 600 }}>
                        −{fmtFull(deducted + pending)}
                      </span>
                    </div>
                  )}
                  {(incoming > 0 || deducted + pending > 0) && (
                    <div
                      className="tm-after-line"
                      style={{ borderTop: '1px dashed var(--border)', paddingTop: 4, marginTop: 4 }}
                    >
                      <span style={{ fontWeight: 600 }}>Projected:</span>
                      <span
                        style={{
                          color: projected >= 0 ? 'var(--accent)' : 'var(--rose)',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                        }}
                      >
                        {fmtFull(projected)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 1: Income + Daily Chart */}
      <div className="tm-row section">
        {/* Income Coming In */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                payments
              </span>{' '}
              Income Coming In
            </h3>
            <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
              {fmt(totalIncome)} expected
            </span>
          </div>
          {data.income_items.length > 0 ? (
            <div className="tm-item-list">
              {data.income_items.map((item: any) => {
                const isPaid = paidIncome[item.id];
                const amount = getIncomeAmount(item);
                const isPast = new Date(item.pay_date + 'T12:00:00') <= new Date();
                return (
                  <div key={item.id} className={`tm-item-row ${isPaid ? 'tm-item-done' : ''}`}>
                    <button
                      className={`tm-toggle ${isPaid ? 'tm-toggle-on' : ''}`}
                      onClick={() => toggleIncome(item.id)}
                      title={isPaid ? 'Mark as pending' : 'Mark as received'}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                        {isPaid ? 'check' : 'radio_button_unchecked'}
                      </span>
                    </button>
                    <div className="tm-item-info">
                      <div className={`tm-item-name ${isPaid ? 'tm-strikethrough' : ''}`}>
                        {item.name}
                      </div>
                      <div className="tm-item-meta">
                        <span className={isPast && !isPaid ? 'tm-overdue' : ''}>
                          {formatPayDate(item.pay_date)}
                        </span>
                        <span className="tm-dot">·</span>
                        <span>{item.frequency}</span>
                      </div>
                    </div>
                    <div className="tm-item-amount">
                      {editingId === item.id ? (
                        <input
                          className="tm-edit-input"
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveIncomeEdit(item.id)}
                          onKeyDown={(e) => handleKeyDown(e, () => saveIncomeEdit(item.id))}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="tm-editable"
                          onClick={() => startEdit(item.id, amount)}
                          title="Click to edit amount"
                          style={{ color: isPaid ? 'var(--accent)' : 'var(--text-primary)' }}
                        >
                          {fmt(amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <p>No income sources configured</p>
            </div>
          )}
        </div>

        {/* Daily Cash Flow Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                trending_up
              </span>{' '}
              Monthly Cash Flow
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Daily balance projection
            </span>
          </div>
          <div style={{ width: '100%', height: 280 }}>
            <DailyCashFlowChart
              startingBalance={startingBalance}
              incomeItems={data.income_items}
              expenseItems={data.expense_items}
              debtItems={data.debt_items}
              getIncomeAmount={getIncomeAmount}
              getExpenseAmount={getExpenseAmount}
              getDebtAmount={getEffectiveDebtAmount}
              viewMonth={viewMonth}
              viewYear={viewYear}
            />
          </div>
        </div>
      </div>

      {/* Matrix Table: All Obligations */}
      <div className="card section">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              bar_chart
            </span>{' '}
            Monthly Obligations
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="tm-filter-tabs">
              {(['all', 'expenses', 'debts'] as const).map((key) => (
                <button
                  key={key}
                  className={`tm-filter-tab ${matrixFilter === key ? 'tm-filter-active' : ''}`}
                  onClick={() => setMatrixFilter(key)}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
            <TableSearch
              searchQuery={matrixSearchQuery}
              setSearchQuery={setMatrixSearchQuery}
              isOpen={matrixSearchOpen}
              setIsOpen={setMatrixSearchOpen}
            />
            <button
              onClick={() => setUsePaymentStrategy((p) => !p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${
                  usePaymentStrategy ? 'rgba(74,144,217,0.4)' : 'var(--border-color)'
                }`,
                background: usePaymentStrategy ? 'rgba(74,144,217,0.12)' : 'transparent',
                color: usePaymentStrategy ? 'var(--accent-blue)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '0.9rem' }}>
                {usePaymentStrategy ? 'bar_chart' : 'stop'}
              </span>
              Payment Strategy
            </button>
            <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
              {fmt(totalDebtPayments)} debts ({fmt(totalDebtPayments - debtsPaid)} due)
            </span>
            <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>
              {fmt(totalExpenses)} bills ({fmt(totalExpenses - expensesPaid)} due)
            </span>
          </div>
        </div>

        {(() => {
          const expenseRows = data.expense_items.map((item: any) => ({
            ...item,
            _type: 'expense',
            _group: item.category_name || 'General',
            _amount: getExpenseAmount(item),
            _isPaid: !!paidExpenses[item.id],
            _dueDay: item.due_day || 0,
            _acctId: getExpenseAccountId(item),
          }));
          const debtRows = data.debt_items.map((item: any) => ({
            ...item,
            _type: 'debt',
            _group: (item.debt_type || 'other')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            _amount: getEffectiveDebtAmount(item),
            _isPaid: !!paidDebts[item.id],
            _dueDay: item.due_day || 0,
            _acctId: getDebtAccountId(item),
          }));

          let allRows = [
            ...(matrixFilter !== 'debts' ? expenseRows : []),
            ...(matrixFilter !== 'expenses' ? debtRows : []),
          ];

          if (matrixSearchQuery) {
            const q = matrixSearchQuery.toLowerCase().trim();
            allRows = allRows.filter((r) => {
              const acctName = data.accounts.find((a: any) => a.id === r._acctId)?.name || '';
              return (
                r.name?.toLowerCase().includes(q) ||
                r._group?.toLowerCase().includes(q) ||
                acctName.toLowerCase().includes(q)
              );
            });
          }

          const buildGroups = (rows: any[]) => {
            const grouped: Record<string, Record<string, any[]>> = {};
            rows.forEach((row) => {
              const topKey = row._type === 'expense' ? 'Expenses' : 'Debts';
              const subKey = row._group;
              if (!grouped[topKey]) grouped[topKey] = {};
              if (!grouped[topKey][subKey]) grouped[topKey][subKey] = [];
              grouped[topKey][subKey].push(row);
            });

            Object.values(grouped).forEach((subs) => {
              Object.values(subs).forEach((items) => {
                items.sort((a, b) => {
                  let aVal: any, bVal: any;
                  if (matrixSort === 'name') {
                    aVal = a.name;
                    bVal = b.name;
                  } else if (matrixSort === 'due') {
                    aVal = a._dueDay;
                    bVal = b._dueDay;
                  } else if (matrixSort === 'account') {
                    aVal = data.accounts.find((ac: any) => ac.id === a._acctId)?.name || '';
                    bVal = data.accounts.find((ac: any) => ac.id === b._acctId)?.name || '';
                  } else {
                    aVal = a._amount;
                    bVal = b._amount;
                  }

                  if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                  if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                  if (aVal === bVal) return 0;
                  if (aVal == null || aVal === '') return 1;
                  if (bVal == null || bVal === '') return -1;

                  if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return matrixSortDir === 'asc' ? aVal - bVal : bVal - aVal;
                  }
                  return matrixSortDir === 'asc'
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
                });
              });
            });
            return grouped;
          };

          const grouped = buildGroups(allRows);
          const topOrder =
            matrixFilter === 'debts'
              ? ['Debts']
              : matrixFilter === 'expenses'
              ? ['Expenses']
              : ['Expenses', 'Debts'];

          const paidCount = allRows.filter((r) => r._isPaid).length;
          const totalAmount = allRows.reduce((s, r) => s + r._amount, 0);
          const paidAmount = allRows.filter((r) => r._isPaid).reduce((s, r) => s + r._amount, 0);

          if (allRows.length === 0) {
            return (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p>No obligations configured</p>
              </div>
            );
          }

          return (
            <>
              <div className="tm-matrix-scroll">
                <table className="tm-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <TableHeader
                        label="Category"
                        sortKey="name"
                        activeKey={matrixSort}
                        activeDirection={matrixSortDir}
                        onClick={(key) => {
                          if (matrixSort === key) {
                            setMatrixSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setMatrixSort(key);
                            setMatrixSortDir('asc');
                          }
                        }}
                      />
                      <TableHeader
                        label="Due Day"
                        sortKey="due"
                        activeKey={matrixSort}
                        activeDirection={matrixSortDir}
                        onClick={(key) => {
                          if (matrixSort === key) {
                            setMatrixSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setMatrixSort(key);
                            setMatrixSortDir('asc');
                          }
                        }}
                        style={{ width: 80 }}
                      />
                      <TableHeader
                        label="Bank Account"
                        sortKey="account"
                        activeKey={matrixSort}
                        activeDirection={matrixSortDir}
                        onClick={(key) => {
                          if (matrixSort === key) {
                            setMatrixSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setMatrixSort(key);
                            setMatrixSortDir('asc');
                          }
                        }}
                        style={{ width: 150 }}
                      />
                      <TableHeader
                        label="Amount"
                        sortKey="amount"
                        activeKey={matrixSort}
                        activeDirection={matrixSortDir}
                        onClick={(key) => {
                          if (matrixSort === key) {
                            setMatrixSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                          } else {
                            setMatrixSort(key);
                            setMatrixSortDir('asc');
                          }
                        }}
                        style={{ textAlign: 'right', width: 100 }}
                      />
                      <th style={{ textAlign: 'right', width: 100, color: 'var(--text-muted)' }}>
                        Due
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOrder
                      .filter((t) => grouped[t])
                      .map((topGroup) => {
                        const subs = grouped[topGroup];
                        const subKeys = Object.keys(subs).sort();
                        const topTotal = subKeys
                          .flatMap((k) => subs[k])
                          .reduce((s, r) => s + r._amount, 0);
                        const topPaidAmount = subKeys
                          .flatMap((k) => subs[k])
                          .filter((r) => r._isPaid)
                          .reduce((s, r) => s + r._amount, 0);
                        const topPaid = subKeys
                          .flatMap((k) => subs[k])
                          .filter((r) => r._isPaid).length;
                        const topCount = subKeys.flatMap((k) => subs[k]).length;
                        const isDebtSection = topGroup === 'Debts';

                        return [
                          <tr key={`top-${topGroup}`} className="tm-matrix-top-group">
                            <td colSpan={4}>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                  <span
                                    className="material-symbols-rounded"
                                    style={{ fontSize: '1.2em', marginRight: 4 }}
                                  >
                                    {isDebtSection ? 'credit_card' : 'receipt_long'}
                                  </span>{' '}
                                  {topGroup}
                                </span>
                              </span>
                              <span
                                style={{ marginLeft: 10, fontSize: '0.72rem', color: 'var(--text-dim)' }}
                              >
                                {topPaid}/{topCount} paid
                              </span>
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: isDebtSection ? 'var(--amber)' : 'var(--rose)',
                              }}
                            >
                              {fmt(topTotal)}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {fmt(topTotal - topPaidAmount)}
                            </td>
                          </tr>,

                          ...subKeys.flatMap((subKey) => {
                            const items = subs[subKey];
                            const subTotal = items.reduce((s, r) => s + r._amount, 0);
                            const subPaidTotal = items
                              .filter((r) => r._isPaid)
                              .reduce((s, r) => s + r._amount, 0);
                            const subPaidCount = items.filter((r) => r._isPaid).length;

                            return [
                              <tr
                                key={`sub-${topGroup}-${subKey}`}
                                className="tm-matrix-sub-group"
                              >
                                <td>
                                  <button
                                    className={`tm-toggle tm-toggle-sm ${
                                      subPaidCount === items.length ? 'tm-toggle-on' : ''
                                    }`}
                                    onClick={() => {
                                      const allPaid = subPaidCount === items.length;
                                      items.forEach((item) => {
                                        if (item._type === 'debt') {
                                          setPaidDebts((p) => ({ ...p, [item.id]: !allPaid }));
                                        } else {
                                          setPaidExpenses((p) => ({ ...p, [item.id]: !allPaid }));
                                        }
                                      });
                                    }}
                                    title={
                                      subPaidCount === items.length ? 'Unmark all' : 'Mark all paid'
                                    }
                                    style={{ width: 22, height: 22, fontSize: '0.62rem' }}
                                  >
                                    <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                                      {subPaidCount === items.length ? 'check' : 'radio_button_unchecked'}
                                    </span>
                                  </button>
                                </td>
                                <td colSpan={3}>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '0.82rem',
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {subKey}
                                  </span>
                                  <span
                                    style={{ marginLeft: 8, fontSize: '0.68rem', color: 'var(--text-dim)' }}
                                  >
                                    {subPaidCount}/{items.length}
                                  </span>
                                </td>
                                <td
                                  style={{
                                    textAlign: 'right',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  {fmt(subTotal)}
                                </td>
                                <td
                                  style={{
                                    textAlign: 'right',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {fmt(subTotal - subPaidTotal)}
                                </td>
                              </tr>,

                              ...items.map((item) => {
                                const isDebt = item._type === 'debt';
                                const isPast = item._dueDay && item._dueDay <= todayDay;
                                return (
                                  <tr
                                    key={`${item._type}-${item.id}`}
                                    className={`tm-matrix-item ${item._isPaid ? 'tm-matrix-done' : ''}`}
                                  >
                                    <td style={{ paddingLeft: 8 }}>
                                      <button
                                        className={`tm-toggle ${
                                          item._isPaid
                                            ? `tm-toggle-on ${
                                                isDebt ? 'tm-toggle-debt' : 'tm-toggle-expense'
                                              }`
                                            : ''
                                        }`}
                                        onClick={() =>
                                          isDebt ? toggleDebt(item.id) : toggleExpense(item.id)
                                        }
                                        title={item._isPaid ? 'Mark as due' : 'Mark as paid'}
                                        style={{ width: 24, height: 24, fontSize: '0.65rem' }}
                                      >
                                        <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                                          {item._isPaid ? 'check' : 'radio_button_unchecked'}
                                        </span>
                                      </button>
                                    </td>
                                    <td style={{ paddingLeft: 24 }}>
                                      <span
                                        className={item._isPaid ? 'tm-strikethrough' : ''}
                                        style={{ fontWeight: 500, fontSize: '0.84rem' }}
                                      >
                                        {item.name}
                                      </span>
                                      {item.url && (
                                        <a
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color: isDebt ? 'var(--amber)' : 'var(--accent)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            marginLeft: 6,
                                            textDecoration: 'none',
                                            verticalAlign: 'middle',
                                          }}
                                          title={`Visit ${item.name} payment site`}
                                        >
                                          <span
                                            className="material-symbols-rounded"
                                            style={{ fontSize: '1rem' }}
                                          >
                                            open_in_new
                                          </span>
                                        </a>
                                      )}
                                      <span
                                        className={`badge ${
                                          item._isPaid
                                            ? 'badge-green'
                                            : isPast
                                            ? 'badge-red'
                                            : 'badge-amber'
                                        }`}
                                        style={{
                                          fontSize: '0.62rem',
                                          padding: '1px 6px',
                                          marginLeft: 8,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          verticalAlign: 'middle',
                                          textTransform: 'uppercase',
                                          fontWeight: 700,
                                        }}
                                      >
                                        {item._isPaid ? 'Paid' : isPast ? 'Overdue' : 'Due'}
                                      </span>
                                      {isDebt && (
                                        <span
                                          style={{
                                            marginLeft: 8,
                                            fontSize: '0.68rem',
                                            color: 'var(--text-dim)',
                                          }}
                                        >
                                          {fmt(item.balance)} bal · {item.interest_rate}%
                                        </span>
                                      )}
                                      {isDebt &&
                                        usePaymentStrategy &&
                                        item.payment_strategy &&
                                        item.payment_strategy !== 'minimum' && (
                                          <span
                                            style={{
                                              marginLeft: 6,
                                              fontSize: '0.62rem',
                                              padding: '1px 5px',
                                              borderRadius: 10,
                                              background:
                                                item.payment_strategy === 'payoff_plan'
                                                  ? 'rgba(74,144,217,0.15)'
                                                  : 'rgba(244,63,94,0.15)',
                                              color:
                                                item.payment_strategy === 'payoff_plan'
                                                  ? 'var(--accent-blue)'
                                                  : '#f43f5e',
                                              fontWeight: 600,
                                            }}
                                          >
                                            {item.payment_strategy === 'payoff_plan' ? (
                                              <>
                                                <span
                                                  className="material-symbols-rounded"
                                                  style={{ fontSize: '1em', marginRight: 2 }}
                                                >
                                                  bar_chart
                                                </span>{' '}
                                                Plan
                                              </>
                                            ) : (
                                              <>
                                                <span
                                                  className="material-symbols-rounded"
                                                  style={{ fontSize: '1em', marginRight: 2 }}
                                                >
                                                  bolt
                                                </span>{' '}
                                                Due
                                              </>
                                            )}
                                          </span>
                                        )}
                                    </td>
                                    <td>
                                      {item._dueDay > 0 && (
                                        <span
                                          className={isPast && !item._isPaid ? 'tm-overdue' : ''}
                                          style={{ fontSize: '0.8rem' }}
                                        >
                                          {item._dueDay}
                                          {getOrdinal(item._dueDay)}
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      <select
                                        className="tm-acct-select"
                                        value={item._acctId || ''}
                                        onChange={(e) =>
                                          isDebt
                                            ? assignDebtAccount(item.id, e.target.value)
                                            : assignExpenseAccount(item.id, e.target.value)
                                        }
                                        style={{ maxWidth: '100%', width: '100%' }}
                                      >
                                        <option value="">No account</option>
                                        {data.accounts.map((a: any) => (
                                          <option key={a.id} value={a.id}>
                                            {a.name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td style={{ textAlign: 'right', width: 100 }}>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'flex-end',
                                          gap: 6,
                                        }}
                                      >
                                        {isDebt && (
                                          editingDueNowId === item.id ? (
                                            <div
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                marginRight: 4,
                                              }}
                                            >
                                              <input
                                                className="tm-edit-input"
                                                type="number"
                                                step="0.01"
                                                value={editDueNowValue}
                                                onChange={(e) => setEditDueNowValue(e.target.value)}
                                                onBlur={() => saveDueNowEdit(item.id)}
                                                onKeyDown={(e) => handleDueNowKeyDown(e, item.id)}
                                                autoFocus
                                                placeholder="0.00"
                                                style={{
                                                  width: '90px',
                                                  height: '24px',
                                                  fontSize: '0.8rem',
                                                  padding: '2px 6px',
                                                  border: '1px solid var(--accent)',
                                                  borderRadius: '4px',
                                                  background: 'var(--bg-input)',
                                                  color: 'var(--text-primary)',
                                                  outline: 'none',
                                                }}
                                              />
                                            </div>
                                          ) : (
                                            <div className="tm-pay-tier" style={{ marginRight: 2 }}>
                                              <button
                                                className={`tm-tier-btn ${
                                                  getDebtTier(item) === 'min' ? 'tm-tier-active' : ''
                                                }`}
                                                onClick={() => handleSetDebtTier(item, 'min')}
                                                title={`Minimum: ${fmt(item.minimum_payment)}`}
                                              >
                                                Min
                                              </button>
                                              <button
                                                className={`tm-tier-btn ${
                                                  getDebtTier(item) === 'due' ? 'tm-tier-active' : ''
                                                }`}
                                                onClick={() => {
                                                  if (item.amount_due_immediately > 0) {
                                                    handleSetDebtTier(item, 'due');
                                                  } else {
                                                    startEditDueNow(item);
                                                  }
                                                }}
                                                onDoubleClick={() => startEditDueNow(item)}
                                                title={
                                                  item.amount_due_immediately > 0
                                                    ? `Amount due: ${fmt(
                                                        item.amount_due_immediately
                                                      )} (Double-click to edit)`
                                                    : 'No due immediately amount set (Click or double-click to set)'
                                                }
                                                style={{
                                                  border:
                                                    item.amount_due_immediately > 0
                                                      ? undefined
                                                      : '1px dashed rgba(244, 63, 94, 0.4)',
                                                  opacity: item.amount_due_immediately > 0 ? 1 : 0.65,
                                                }}
                                              >
                                                Due{' '}
                                                {item.amount_due_immediately > 0
                                                  ? `(${fmt(item.amount_due_immediately)})`
                                                  : ''}
                                              </button>
                                              {item.payment_strategy === 'payoff_plan' && (
                                                <button
                                                  className={`tm-tier-btn ${
                                                    getDebtTier(item) === 'payoff_plan'
                                                      ? 'tm-tier-active'
                                                      : ''
                                                  }`}
                                                  onClick={() => {
                                                    setDebtPayTiers((p) => ({
                                                      ...p,
                                                      [item.id]: 'payoff_plan',
                                                    }));
                                                    setDebtAmounts((p) => ({
                                                      ...p,
                                                      [item.id]: item.calculated_payment,
                                                    }));
                                                  }}
                                                  title={`Payoff Plan: ${fmt(item.calculated_payment)}`}
                                                >
                                                  Plan
                                                </button>
                                              )}
                                              <button
                                                className={`tm-tier-btn ${
                                                  getDebtTier(item) === 'full' ? 'tm-tier-active' : ''
                                                }`}
                                                onClick={() => handleSetDebtTier(item, 'full')}
                                                title={`Full balance: ${fmt(item.balance)}`}
                                              >
                                                Full
                                              </button>
                                            </div>
                                          )
                                        )}
                                        {editingId === item.id ? (
                                          <input
                                            className="tm-edit-input"
                                            type="number"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => {
                                              if (isDebt) {
                                                saveDebtEdit(item.id);
                                                setDebtPayTiers((p) => ({ ...p, [item.id]: 'custom' }));
                                              } else {
                                                saveExpenseEdit(item.id);
                                              }
                                            }}
                                            onKeyDown={(e) =>
                                              handleKeyDown(e, () => {
                                                if (isDebt) {
                                                  saveDebtEdit(item.id);
                                                  setDebtPayTiers((p) => ({
                                                    ...p,
                                                    [item.id]: 'custom',
                                                  }));
                                                } else {
                                                  saveExpenseEdit(item.id);
                                                }
                                              })
                                            }
                                            autoFocus
                                          />
                                        ) : (
                                          <span
                                            className="tm-editable"
                                            onClick={() => startEdit(item.id, item._amount)}
                                            title="Click to edit amount"
                                            style={{ color: isDebt ? 'var(--amber)' : 'var(--rose)' }}
                                          >
                                            {fmtFull(item._amount)}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td
                                      style={{
                                        textAlign: 'right',
                                        width: 100,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        color: item._isPaid
                                          ? 'var(--text-muted)'
                                          : isPast
                                          ? 'var(--accent-red)'
                                          : 'var(--text-primary)',
                                        textDecoration: item._isPaid ? 'line-through' : 'none',
                                        opacity: item._isPaid ? 0.6 : 1,
                                      }}
                                    >
                                      {fmtFull(item._isPaid ? 0 : item._amount)}
                                    </td>
                                  </tr>
                                );
                              }),
                            ];
                          }),
                        ];
                      })}
                  </tbody>
                </table>
              </div>
              <div className="tm-matrix-footer">
                <div className="tm-matrix-stat">
                  <span className="tm-matrix-stat-label">Items</span>
                  <span className="tm-matrix-stat-value">
                    {paidCount}/{allRows.length} paid
                  </span>
                </div>
                <div className="tm-matrix-stat">
                  <span className="tm-matrix-stat-label">Paid</span>
                  <span className="tm-matrix-stat-value" style={{ color: 'var(--teal)' }}>
                    {fmt(paidAmount)}
                  </span>
                </div>
                <div className="tm-matrix-stat">
                  <span className="tm-matrix-stat-label">Remaining</span>
                  <span className="tm-matrix-stat-value" style={{ color: 'var(--rose)' }}>
                    {fmt(totalAmount - paidAmount)}
                  </span>
                </div>
                <div className="tm-matrix-stat">
                  <span className="tm-matrix-stat-label">Total</span>
                  <span className="tm-matrix-stat-value" style={{ fontWeight: 700 }}>
                    {fmt(totalAmount)}
                  </span>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      height: 6,
                      width: 120,
                      background: 'var(--bg-highlight)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${allRows.length > 0 ? (paidCount / allRows.length) * 100 : 0}%`,
                        background: paidCount === allRows.length ? 'var(--accent)' : 'var(--teal)',
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {allRows.length > 0 ? Math.round((paidCount / allRows.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Row 3: Variable Expenses + Envelope Summary */}
      <div className="tm-row section">
        {/* Variable / Ad-hoc Expenses */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                shopping_cart
              </span>{' '}
              Variable Expenses
            </h3>
            <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
              {fmt(totalAdhoc)} budgeted
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '0 0 10px 0' }}>
            <input
              placeholder="e.g. Groceries"
              value={adhocName}
              onChange={(e) => setAdhocName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAdhoc()}
              style={{
                flex: 1,
                padding: '7px 10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            />
            <input
              type="number"
              placeholder="$0"
              value={adhocAmount}
              onChange={(e) => setAdhocAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAdhoc()}
              style={{
                width: 80,
                padding: '7px 10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                textAlign: 'right',
              }}
            />
            <button
              className="btn btn-primary btn-small"
              onClick={handleAddAdhoc}
              disabled={!adhocName.trim() || !adhocAmount}
            >
              +
            </button>
          </div>
          {adhocItems.length > 0 ? (
            <div className="tm-item-list">
              {adhocItems.map((item) => {
                const isPaid = paidAdhoc[item.id];
                return (
                  <div key={item.id} className={`tm-item-row ${isPaid ? 'tm-item-done' : ''}`}>
                    <button
                      className={`tm-toggle ${isPaid ? 'tm-toggle-on tm-toggle-expense' : ''}`}
                      onClick={() => toggleAdhoc(item.id)}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                        {isPaid ? 'check' : 'radio_button_unchecked'}
                      </span>
                    </button>
                    <div className="tm-item-info">
                      <div className={`tm-item-name ${isPaid ? 'tm-strikethrough' : ''}`}>
                        {item.name || 'Expense'}
                      </div>
                    </div>
                    <div className="tm-item-amount" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          color: isPaid ? 'var(--text-muted)' : 'var(--purple)',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(item.amount_override || 0)}
                      </span>
                      <button
                        onClick={() => handleDeleteAdhoc(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          padding: '2px 4px',
                          borderRadius: 4,
                        }}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Add groceries, gas, dining, etc.
              </p>
            </div>
          )}
          {adhocItems.length > 0 && (
            <div
              style={{
                padding: '8px 0 0',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{unpaidAdhocCount} unpaid</span>
              <span style={{ fontWeight: 600, color: 'var(--purple)' }}>
                Spent: {fmt(adhocSpent)} / {fmt(totalAdhoc)}
              </span>
            </div>
          )}
        </div>

        {/* Envelope Budget Summary */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                mail
              </span>{' '}
              Envelope Budgets
            </h3>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
              {fmt(totalEnvelopeBudget)} budgeted
            </span>
          </div>
          {envelopes.length > 0 ? (
            <div className="tm-item-list">
              {envelopes.map((env) => {
                const pct =
                  env.budgeted_amount > 0
                    ? Math.min(100, (env.spent_amount / env.budgeted_amount) * 100)
                    : 0;
                const over = env.spent_amount > env.budgeted_amount;
                return (
                  <div
                    key={env.id}
                    className="tm-item-row"
                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, padding: '8px 0' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="tm-item-name">{env.name}</span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: over ? 'var(--rose)' : 'var(--text-secondary)',
                        }}
                      >
                        {fmt(env.spent_amount)} / {fmt(env.budgeted_amount)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: 'var(--bg-secondary)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: over ? 'var(--rose)' : pct > 80 ? 'var(--amber)' : 'var(--accent)',
                          borderRadius: 2,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No envelopes for this month
              </p>
              <a
                href="/dashboard/envelopes"
                className="btn btn-secondary btn-small"
                style={{ marginTop: 8 }}
              >
                Set up envelopes →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Budget Flow Waterfall */}
      {(() => {
        const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
        const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
        const nextMonthName = MONTH_NAMES[nextMonth - 1];

        const wfDebt = effectiveTotalDebtPayments;
        const wfStart = effectiveStartingBalance;
        const steps = [
          {
            label: 'Starting Balance',
            icon: (
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                account_balance
              </span>
            ),
            amount: 0,
            running: wfStart,
            type: 'start',
            color: 'var(--text-primary)',
          },
          {
            label: 'Bills & Expenses',
            icon: (
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                receipt_long
              </span>
            ),
            amount: -totalExpenses,
            running: wfStart - totalExpenses,
            type: 'subtract',
            color: 'var(--rose)',
          },
          {
            label: 'Debt Payments',
            icon: (
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                credit_card
              </span>
            ),
            amount: -wfDebt,
            running: wfStart - totalExpenses - wfDebt,
            type: 'subtract',
            color: 'var(--amber)',
          },
          ...(totalAdhoc > 0
            ? [
                {
                  label: 'Variable Expenses',
                  icon: (
                    <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                      shopping_cart
                    </span>
                  ),
                  amount: -totalAdhoc,
                  running: wfStart - totalExpenses - wfDebt - totalAdhoc,
                  type: 'subtract',
                  color: 'var(--purple)',
                },
              ]
            : []),
          ...(totalEnvelopeBudget > 0
            ? [
                {
                  label: 'Envelope Budgets',
                  icon: (
                    <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                      mail
                    </span>
                  ),
                  amount: -totalEnvelopeBudget,
                  running: wfStart - totalExpenses - wfDebt - totalAdhoc - totalEnvelopeBudget,
                  type: 'subtract',
                  color: 'var(--blue)',
                },
              ]
            : []),
          {
            label: 'Income',
            icon: (
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                payments
              </span>
            ),
            amount: totalIncome,
            running:
              wfStart - totalExpenses - wfDebt - totalAdhoc - totalEnvelopeBudget + totalIncome,
            type: 'add',
            color: 'var(--accent)',
          },
        ];

        const endBalance = steps[steps.length - 1].running;
        const maxAbs = Math.max(
          ...steps.map((s) => Math.abs(s.amount || 0)),
          Math.abs(wfStart),
          Math.abs(endBalance),
          1
        );

        return (
          <div className="card section" style={{ marginTop: 12 }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                  bar_chart
                </span>{' '}
                Budget Flow
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {MONTH_NAMES[viewMonth - 1]} → {nextMonthName} {nextYear}
              </span>
            </div>

            <div className="wf-container">
              {steps.map((step, idx) => (
                <div key={idx} className={`wf-row ${step.type === 'start' ? 'wf-row-start' : ''}`}>
                  <div className="wf-icon">{step.icon}</div>
                  <div className="wf-label">
                    <div className="wf-label-text">{step.label}</div>
                    {step.type !== 'start' && (
                      <div className="wf-amount" style={{ color: step.color }}>
                        {step.type === 'add' ? '+' : ''}
                        {fmt(step.amount)}
                      </div>
                    )}
                  </div>
                  <div className="wf-bar-col">
                    {step.type !== 'start' && (
                      <div className="wf-bar-track">
                        <div
                          className="wf-bar-fill"
                          style={{
                            width: `${Math.min(100, (Math.abs(step.amount) / maxAbs) * 100)}%`,
                            background: step.color,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className="wf-running"
                    style={{
                      color: step.running >= 0 ? 'var(--text-primary)' : 'var(--rose)',
                      fontWeight: step.type === 'start' ? 700 : 500,
                      fontSize: step.type === 'start' ? '1.1rem' : '0.92rem',
                    }}
                  >
                    {fmt(step.running)}
                  </div>
                </div>
              ))}

              <div className="wf-divider" />

              <div className="wf-row wf-row-result">
                <div className="wf-icon" style={{ fontSize: '1.3rem' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                    track_changes
                  </span>
                </div>
                <div className="wf-label">
                  <div className="wf-label-text" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    Projected Start of {nextMonthName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {endBalance >= 0 ? (
                      'On track'
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                          warning_amber
                        </span>{' '}
                        Projected deficit
                      </span>
                    )}{' '}
                    • Discretionary:{' '}
                    {fmt(
                      totalIncome - totalExpenses - wfDebt - totalAdhoc - totalEnvelopeBudget
                    )}
                  </div>
                </div>
                <div className="wf-bar-col" />
                <div
                  className="wf-running"
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: endBalance >= 0 ? 'var(--accent)' : 'var(--rose)',
                  }}
                >
                  {fmt(endBalance)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Multi-Month Forward Projection */}
      {projection && projection.months && projection.months.length > 0 && (
        <div className="card section" style={{ marginTop: 12 }}>
          <div
            className="card-header"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                  explore
                </span>{' '}
                Forward Projection
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Next {projection.months.length} months
              </span>
            </div>
            <TableSearch
              searchQuery={projectionTable.searchQuery}
              setSearchQuery={projectionTable.setSearchQuery}
              isOpen={projectionTable.searchOpen}
              setIsOpen={projectionTable.setSearchOpen}
            />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr>
                  <TableHeader
                    label="Month"
                    sortKey="label"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                  />
                  <TableHeader
                    label="Starting"
                    sortKey="starting_balance"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="Income"
                    sortKey="total_income"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="Expenses"
                    sortKey="total_recurring_expenses"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="Debt Payments"
                    sortKey="total_debt_payments"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="Envelopes"
                    sortKey="total_envelope_budgets"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="Ending Balance"
                    sortKey="ending_balance"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="Surplus"
                    sortKey="surplus"
                    activeKey={projectionTable.sortKey}
                    activeDirection={projectionTable.sortDirection}
                    onClick={projectionTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                </tr>
              </thead>
              <tbody>
                {projectionTable.data.map((m: any, idx: number) => (
                  <tr
                    key={idx}
                    style={{
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{m.label}</td>
                    <td className="amount">{fmt(m.starting_balance)}</td>
                    <td className="amount" style={{ color: 'var(--accent)' }}>
                      {fmt(m.total_income)}
                    </td>
                    <td className="amount" style={{ color: 'var(--rose)' }}>
                      {fmt(m.total_recurring_expenses)}
                    </td>
                    <td className="amount" style={{ color: 'var(--amber)' }}>
                      {fmt(m.total_debt_payments)}
                    </td>
                    <td className="amount" style={{ color: 'var(--blue)' }}>
                      {fmt(m.total_envelope_budgets)}
                    </td>
                    <td
                      className="amount"
                      style={{
                        fontWeight: 700,
                        color: m.ending_balance >= 0 ? 'var(--accent)' : 'var(--rose)',
                      }}
                    >
                      {fmt(m.ending_balance)}
                    </td>
                    <td
                      className="amount"
                      style={{ color: m.surplus >= 0 ? 'var(--teal)' : 'var(--rose)' }}
                    >
                      {fmt(m.surplus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Debt payoff milestones */}
          {projection.months.some((m: any) =>
            m.debt_details.some((d: any) => d.paid_off && d.payment > 0)
          ) && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 14px',
                background: 'rgba(34,197,94,0.06)',
                borderRadius: 8,
                border: '1px solid rgba(34,197,94,0.15)',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'var(--accent)',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span className="material-symbols-rounded" style={{ marginRight: 4 }}>
                  celebration
                </span>{' '}
                Debt Payoff Milestones
              </div>
              {projection.months.map((m: any) =>
                m.debt_details
                  .filter((d: any) => d.paid_off && d.payment > 0)
                  .map((d: any) => (
                    <div
                      key={`${m.label}-${d.debt_id}`}
                      style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '2px 0' }}
                    >
                      <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                          check
                        </span>{' '}
                        {d.debt_name} paid off in <strong>{m.label}</strong>
                      </span>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
