'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DeleteButton from '../components/DeleteButton';
import InlineEdit from '../components/InlineEdit';
import useTable from '../hooks/useTable';
import TableSearch from '../components/TableSearch';
import TableHeader from '../components/TableHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

interface Debt {
  id: string;
  name: string;
  debt_type: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_day_of_month: number | null;
  amount_due_immediately: number;
  payment_strategy: 'minimum' | 'due_now' | 'payoff_plan';
  debt_quality: 'good' | 'bad' | 'neutral';
  calculated_payment?: number;
  url: string | null;
}

interface BonusPlanAllocation {
  reference_id: string;
  amount: number;
}

interface BonusPlanResult {
  id: string;
  total_amount: number;
  strategy: 'snowball' | 'avalanche';
  notes: string | null;
  allocations: BonusPlanAllocation[];
}

interface PayoffPlanDebtOrder {
  debt_id: string;
  debt_name: string;
  starting_balance: number;
  interest_rate: number;
  required_payment: number;
  months_to_payoff: number;
}

interface PayoffPlanResult {
  strategy: 'snowball' | 'avalanche';
  total_months: number;
  total_interest_paid: number;
  debts_order: PayoffPlanDebtOrder[];
}

const DEBT_TYPES = [
  { value: 'mortgage', label: 'Mortgage', icon: 'home' },
  { value: 'car_loan', label: 'Car Loan', icon: 'directions_car' },
  { value: 'credit_card', label: 'Credit Card', icon: 'credit_card' },
  { value: 'personal_loan', label: 'Personal Loan', icon: 'handshake' },
  { value: 'student_loan', label: 'Student Loan', icon: 'school' },
  { value: 'medical', label: 'Medical', icon: 'local_hospital' },
  { value: 'other', label: 'Other', icon: 'description' },
];

const PAYMENT_STRATEGIES = [
  { value: 'minimum', label: 'Minimum', icon: 'bedtime', color: 'var(--text-secondary)' },
  { value: 'due_now', label: 'Due Now', icon: 'bolt', color: '#f43f5e' },
  { value: 'payoff_plan', label: 'Payoff Plan', icon: 'bar_chart', color: 'var(--accent-blue)' },
];

const QUALITY_CONFIG = {
  good: {
    label: 'Good',
    color: 'var(--accent-green)',
    icon: 'check_circle',
    bg: 'rgba(34,197,94,0.12)',
  },
  bad: { label: 'Bad', color: 'var(--accent-red)', icon: 'cancel', bg: 'rgba(239,68,68,0.12)' },
  neutral: {
    label: 'Neutral',
    color: 'var(--accent-amber)',
    icon: 'warning_amber',
    bg: 'rgba(234,179,8,0.12)',
  },
};

const getDebtTypeLabel = (type: string) =>
  DEBT_TYPES.find((t) => t.value === type)?.label || 'Other';

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    balance: '',
    interest_rate: '',
    minimum_payment: '',
    due_day_of_month: '',
    debt_type: 'credit_card',
    amount_due_immediately: '',
    payment_strategy: 'minimum',
    url: '',
  });
  const [bonusForm, setBonusForm] = useState({ total_amount: '', strategy: 'snowball', notes: '' });
  const [payoff, setPayoff] = useState<PayoffPlanResult | null>(null);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [bonusPlan, setBonusPlan] = useState<BonusPlanResult | null>(null);
  const [excludedDebtIds, setExcludedDebtIds] = useState<string[]>([]);
  const [showPayoffConfig, setShowPayoffConfig] = useState(false);
  const [targetMonths, setTargetMonths] = useState('');
  const [committedPlan, setCommittedPlan] = useState<any>(null);
  const [committing, setCommitting] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalDebt, setLinkModalDebt] = useState<Debt | null>(null);
  const [linkModalUrl, setLinkModalUrl] = useState('');

  // Main Debts Table Hook
  const allDebtsTable = useTable<Debt>(debts, {
    searchKeys: ['name', 'debt_type', 'debt_quality', 'payment_strategy', 'url'],
    sortExtractors: {
      balance: (item) => item.balance,
      interest_rate: (item) => item.interest_rate,
      minimum_payment: (item) => item.minimum_payment,
      amount_due_immediately: (item) => item.amount_due_immediately || 0,
      monthly_interest: (item) => (item.balance * item.interest_rate) / 100 / 12,
      calculated_payment: (item) => item.calculated_payment || 0,
    },
    defaultSort: { key: 'name', direction: 'asc' },
  });

  // Payoff Plan Config Modal Table Hook
  const payoffConfigTable = useTable<Debt>(debts, {
    searchKeys: ['name', 'debt_type'],
    sortExtractors: {
      balance: (item) => item.balance,
      interest_rate: (item) => item.interest_rate,
      minimum_payment: (item) => item.minimum_payment,
    },
    defaultSort: { key: 'name', direction: 'asc' },
  });

  const load = () => {
    axios
      .get('/api/debts')
      .then((r) => setDebts(r.data))
      .catch(console.error);
    axios
      .get('/api/debts/payoff/committed')
      .then((r) => setCommittedPlan(r.data))
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (debts.length > 0) {
      const params: any = { strategy };
      if (excludedDebtIds.length > 0) {
        params.exclude_ids = excludedDebtIds.join(',');
      }
      if (targetMonths) {
        params.target_months = parseInt(targetMonths);
      }
      axios
        .get('/api/debts/payoff', { params })
        .then((r) => setPayoff(r.data))
        .catch(console.error);
    } else {
      setPayoff(null);
    }
  }, [debts, strategy, excludedDebtIds, targetMonths]);

  const toggleDebtInPlan = (debtId: string) => {
    setExcludedDebtIds((prev) =>
      prev.includes(debtId) ? prev.filter((id) => id !== debtId) : [...prev, debtId]
    );
  };

  const calcCreditCardMin = (balance: string | number, apr: string | number) => {
    const bal = parseFloat(String(balance)) || 0;
    const rate = parseFloat(String(apr)) || 0;
    if (bal <= 0) return 0;
    const monthlyInterest = bal * (rate / 100) / 12;
    const percentOfBalance = bal * 0.01;
    return Math.max(percentOfBalance + monthlyInterest, 25);
  };

  const updateForm = (updates: Partial<typeof form>) => {
    const next = { ...form, ...updates };
    if (
      next.debt_type === 'credit_card' &&
      (updates.balance !== undefined ||
        updates.interest_rate !== undefined ||
        updates.debt_type !== undefined)
    ) {
      const autoMin = calcCreditCardMin(next.balance, next.interest_rate);
      if (autoMin > 0) {
        next.minimum_payment = autoMin.toFixed(2);
      }
    }
    setForm(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/debts', {
        name: form.name,
        balance: parseFloat(form.balance),
        interest_rate: parseFloat(form.interest_rate) || 0,
        minimum_payment: parseFloat(form.minimum_payment),
        due_day_of_month: form.due_day_of_month ? parseInt(form.due_day_of_month) : null,
        debt_type: form.debt_type,
        amount_due_immediately: form.amount_due_immediately
          ? parseFloat(form.amount_due_immediately)
          : 0,
        payment_strategy: form.payment_strategy || 'minimum',
        url: form.url || null,
      });
      setForm({
        name: '',
        balance: '',
        interest_rate: '',
        minimum_payment: '',
        due_day_of_month: '',
        debt_type: 'credit_card',
        amount_due_immediately: '',
        payment_strategy: 'minimum',
        url: '',
      });
      setShowModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const updateDebtItem = async (id: string, payload: any) => {
    try {
      await axios.put(`/api/debts/${id}`, payload);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteDebtItem = async (id: string) => {
    try {
      await axios.delete(`/api/debts/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const openLinkModal = (debt: Debt) => {
    setLinkModalDebt(debt);
    setLinkModalUrl(debt.url || '');
    setShowLinkModal(true);
  };

  const handleLinkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkModalDebt) return;
    try {
      await updateDebtItem(linkModalDebt.id, { url: linkModalUrl.trim() || null });
      setShowLinkModal(false);
      setLinkModalDebt(null);
      setLinkModalUrl('');
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBonusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const plan = await axios
        .post('/api/debts/bonus-plans', {
          total_amount: parseFloat(bonusForm.total_amount),
          strategy: bonusForm.strategy,
          notes: bonusForm.notes || null,
        })
        .then((r) => r.data);
      const result = await axios
        .post(`/api/debts/bonus-plans/${plan.id}/generate`)
        .then((r) => r.data);
      setBonusPlan(result);
      setShowBonusModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadTemplate = () => {
    const headers =
      'name,debt_type,balance,interest_rate,minimum_payment,amount_due_immediately,due_day_of_month,payment_strategy,url';
    const examples = [
      'Chase Sapphire,credit_card,5000,24.99,,500,15,due_now,https://www.chase.com',
      'Honda Civic,car_loan,18000,5.9,350,,1,minimum,https://www.honda.com',
      'Home Mortgage,mortgage,250000,3.5,1200,,1,minimum,',
      'Sallie Mae,student_loan,30000,4.5,280,,15,payoff_plan,',
      'Medical Bill,medical,2500,0,100,2500,,due_now,',
    ];
    const note =
      '# debt_type options: mortgage, car_loan, credit_card, personal_loan, student_loan, medical, other';
    const note2 = '# payment_strategy options: minimum, due_now, payoff_plan';
    const note3 = '# Leave minimum_payment blank for credit_card — it will be auto-calculated';
    const csv = [note, note2, note3, headers, ...examples].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debt_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExport = () => {
    const headers =
      'name,debt_type,balance,interest_rate,minimum_payment,amount_due_immediately,due_day_of_month,payment_strategy,calculated_payment,url';
    const rows = debts.map((d) =>
      [
        `"${d.name}"`,
        d.debt_type,
        d.balance,
        d.interest_rate,
        d.minimum_payment,
        d.amount_due_immediately || 0,
        d.due_day_of_month || '',
        d.payment_strategy,
        (d.calculated_payment || 0).toFixed(2),
        d.url || '',
      ].join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debts_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const validTypes = DEBT_TYPES.map((t) => t.value);
      const validStrategies = PAYMENT_STRATEGIES.map((s) => s.value);
      let created = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 3) continue;
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = (cols[idx] || '').trim();
        });
        const debtType = validTypes.includes(row.debt_type) ? row.debt_type : 'other';
        const balance = parseFloat(row.balance) || 0;
        const apr = parseFloat(row.interest_rate) || 0;
        let minPayment = parseFloat(row.minimum_payment);
        if (isNaN(minPayment) || (debtType === 'credit_card' && !row.minimum_payment)) {
          minPayment = debtType === 'credit_card' ? calcCreditCardMin(balance, apr) : 0;
        }
        const str = validStrategies.includes(row.payment_strategy)
          ? row.payment_strategy
          : 'minimum';
        try {
          await axios.post('/api/debts', {
            name: row.name || `Debt ${i}`,
            debt_type: debtType,
            balance,
            interest_rate: apr,
            minimum_payment: minPayment,
            amount_due_immediately: parseFloat(row.amount_due_immediately) || 0,
            due_day_of_month: parseInt(row.due_day_of_month) || null,
            payment_strategy: str,
            url: row.url || null,
          });
          created++;
        } catch (err) {
          console.error('Row', i, err);
        }
      }
      e.target.value = '';
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
  const totalPayments = debts.reduce((s, d) => s + Number(d.minimum_payment), 0);
  const goodDebt = debts
    .filter((d) => d.debt_quality === 'good')
    .reduce((s, d) => s + Number(d.balance), 0);
  const badDebt = debts
    .filter((d) => d.debt_quality === 'bad')
    .reduce((s, d) => s + Number(d.balance), 0);
  const totalDueNow = debts.reduce((s, d) => s + (Number(d.amount_due_immediately) || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Debts & Payoff Strategy</h2>
        <p>Track debts with interest and calculate the best payoff plan</p>
      </div>

      <div
        className="debt-stats-grid section"
      >
        <div className="stat-card stat-red">
          <div className="stat-label">Total Debt</div>
          <div className="stat-value">{fmt(totalDebt)}</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-label">Monthly Payments</div>
          <div className="stat-value">{fmt(totalPayments)}</div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--accent-green)' }}>
          <div className="stat-label">Good Debt</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {fmt(goodDebt)}
          </div>
          <div className="stat-sub">
            {totalDebt > 0 ? ((goodDebt / totalDebt) * 100).toFixed(0) : 0}% of total
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: 'var(--accent-red)' }}>
          <div className="stat-label">Bad Debt</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>
            {fmt(badDebt)}
          </div>
          <div className="stat-sub">
            {totalDebt > 0 ? ((badDebt / totalDebt) * 100).toFixed(0) : 0}% of total
          </div>
        </div>
        {totalDueNow > 0 && (
          <div
            className="stat-card"
            style={{ borderColor: '#f43f5e', background: 'rgba(244,63,94,0.08)' }}
          >
            <div className="stat-label" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                bolt
              </span>{' '}
              Due Immediately
            </div>
            <div className="stat-value" style={{ color: '#f43f5e' }}>
              {fmt(totalDueNow)}
            </div>
          </div>
        )}
      </div>

      {/* Debt List */}
      <div className="card section">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              credit_card
            </span>{' '}
            All Debts
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-small"
              onClick={downloadTemplate}
              title="Download CSV template"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                download
              </span>{' '}
              Template
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={downloadExport}
              disabled={debts.length === 0}
              title="Export debts to CSV"
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                upload
              </span>{' '}
              Export
            </button>
            <label
              className="btn btn-secondary btn-small"
              style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center' }}
              title="Upload CSV file"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                upload_file
              </span>{' '}
              Upload
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setShowBonusModal(true)}
              disabled={debts.length === 0}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                track_changes
              </span>{' '}
              Plan Bonus
            </button>
            <TableSearch
              searchQuery={allDebtsTable.searchQuery}
              setSearchQuery={allDebtsTable.setSearchQuery}
              isOpen={allDebtsTable.searchOpen}
              setIsOpen={allDebtsTable.setSearchOpen}
            />
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + Add Debt
            </button>
          </div>
        </div>
        {debts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                celebration
              </span>
            </div>
            <h3>No debts!</h3>
            <p>You're debt-free or haven't added your debts yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Name"
                  sortKey="name"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                />
                <th>Link</th>
                <TableHeader
                  label="Type"
                  sortKey="debt_type"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                />
                <TableHeader
                  label="Quality"
                  sortKey="debt_quality"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                />
                <TableHeader
                  label="Balance"
                  sortKey="balance"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="APR"
                  sortKey="interest_rate"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Min Payment"
                  sortKey="minimum_payment"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Due Now"
                  sortKey="amount_due_immediately"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Monthly Interest"
                  sortKey="monthly_interest"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="This Month Strategy"
                  sortKey="payment_strategy"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                />
                <TableHeader
                  label="Calculated Payment"
                  sortKey="calculated_payment"
                  activeKey={allDebtsTable.sortKey}
                  activeDirection={allDebtsTable.sortDirection}
                  onClick={allDebtsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {allDebtsTable.data.map((d) => {
                const qualityInfo = QUALITY_CONFIG[d.debt_quality] || QUALITY_CONFIG.neutral;
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {d.name}
                        {d.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--accent)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              textDecoration: 'none',
                            }}
                            title="Visit site"
                          >
                            <span
                              className="material-symbols-rounded"
                              style={{ fontSize: '1.1rem' }}
                            >
                              open_in_new
                            </span>
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-small"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: d.url ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-secondary)',
                          color: d.url ? 'var(--accent)' : 'var(--text-dim)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                        onClick={() => openLinkModal(d)}
                        title={d.url ? 'Edit website link' : 'Add website link'}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1rem', marginRight: 4 }}>
                          link
                        </span>
                        {d.url ? 'Edit' : 'Add'}
                      </button>
                    </td>
                    <td>
                      <select
                        value={d.debt_type}
                        onChange={async (e) => {
                          await updateDebtItem(d.id, { debt_type: e.target.value });
                        }}
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {DEBT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: qualityInfo.color,
                          background: qualityInfo.bg,
                          letterSpacing: '0.02em',
                        }}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1em' }}>
                          {qualityInfo.icon}
                        </span>{' '}
                        {qualityInfo.label}
                      </span>
                    </td>
                    <td className="amount">
                      <InlineEdit
                        value={d.balance}
                        onSave={async (v) => {
                          await updateDebtItem(d.id, { balance: Number(v) });
                        }}
                      />
                    </td>
                    <td>
                      <InlineEdit
                        value={d.interest_rate}
                        format="percent"
                        onSave={async (v) => {
                          await updateDebtItem(d.id, { interest_rate: Number(v) });
                        }}
                      />
                    </td>
                    <td className="amount">
                      <InlineEdit
                        value={d.minimum_payment}
                        onSave={async (v) => {
                          await updateDebtItem(d.id, { minimum_payment: Number(v) });
                        }}
                      />
                    </td>
                    <td
                      className="amount"
                      style={{
                        color: d.amount_due_immediately > 0 ? '#f43f5e' : 'var(--text-dim)',
                        fontWeight: d.amount_due_immediately > 0 ? 700 : 400,
                      }}
                    >
                      <InlineEdit
                        value={d.amount_due_immediately || null}
                        onSave={async (v) => {
                          await updateDebtItem(d.id, {
                            amount_due_immediately: Number(v) || 0,
                          });
                        }}
                      />
                    </td>
                    <td className="amount" style={{ color: 'var(--accent-amber)' }}>
                      {fmt((d.balance * d.interest_rate) / 100 / 12)}
                    </td>
                    <td>
                      <select
                        value={d.payment_strategy || 'minimum'}
                        onChange={async (e) => {
                          await updateDebtItem(d.id, { payment_strategy: e.target.value });
                        }}
                        title="This Month Payment Strategy"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: (() => {
                            const s = PAYMENT_STRATEGIES.find(
                              (p) => p.value === (d.payment_strategy || 'minimum')
                            );
                            return s ? s.color : 'var(--text-primary)';
                          })(),
                          border: '1px solid var(--border-color)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          minWidth: 130,
                        }}
                      >
                        {PAYMENT_STRATEGIES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="amount">
                      <span
                        style={{
                          fontWeight: 700,
                          color: (() => {
                            const s = d.payment_strategy || 'minimum';
                            if (s === 'payoff_plan') return 'var(--accent-blue)';
                            if (s === 'due_now') return '#f43f5e';
                            return 'var(--accent-amber)';
                          })(),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title={`Strategy: ${d.payment_strategy || 'minimum'}`}
                      >
                        {fmt(d.calculated_payment || 0)}
                        {d.payment_strategy === 'payoff_plan' && !committedPlan && (
                          <span
                            className="material-symbols-rounded"
                            style={{ fontSize: '1.2em', color: 'var(--text-muted)', marginLeft: 4 }}
                            title="No committed plan — showing minimum fallback"
                          >
                            warning_amber
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <DeleteButton onDelete={() => deleteDebtItem(d.id)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payoff Plan Section */}
      {payoff && (
        <div className="card section">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                trending_up
              </span>{' '}
              Payoff Plan
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {committedPlan ? (
                <button
                  className="btn btn-small"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(34,197,94,0.15)',
                    color: 'var(--accent-green)',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                  onClick={async () => {
                    await axios.delete('/api/debts/payoff/committed');
                    setCommittedPlan(null);
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                    lock_open
                  </span>{' '}
                  Unlock Plan
                </button>
              ) : (
                <button
                  className="btn btn-small"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(74,144,217,0.15)',
                    color: 'var(--accent-blue)',
                    border: '1px solid rgba(74,144,217,0.3)',
                  }}
                  disabled={committing}
                  onClick={async () => {
                    setCommitting(true);
                    try {
                      const plan = await axios
                        .post('/api/debts/payoff/commit', {
                          strategy,
                          extra_payment: 0,
                          target_months: targetMonths ? parseInt(targetMonths) : null,
                          excluded_debt_ids: excludedDebtIds.length ? excludedDebtIds : null,
                        })
                        .then((r) => r.data);
                      setCommittedPlan(plan);
                      localStorage.setItem('planCommittedAt', Date.now().toString());
                      load();
                    } catch (e) {
                      console.error(e);
                    }
                    setCommitting(false);
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                    check_circle
                  </span>{' '}
                  Commit This Plan
                </button>
              )}
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setShowPayoffConfig(true)}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                  settings
                </span>{' '}
                Configure
              </button>
              <button
                className={`btn btn-small ${strategy === 'snowball' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStrategy('snowball')}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                  ac_unit
                </span>{' '}
                Snowball
              </button>
              <button
                className={`btn btn-small ${strategy === 'avalanche' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStrategy('avalanche')}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                  landscape
                </span>{' '}
                Avalanche
              </button>
            </div>
          </div>
          {excludedDebtIds.length > 0 && (
            <div
              style={{
                padding: '8px 14px',
                background: 'rgba(234,179,8,0.08)',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: '0.8rem',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 6 }}>
                warning_amber
              </span>{' '}
              {excludedDebtIds.length} debt{excludedDebtIds.length > 1 ? 's' : ''} excluded from this plan
            </div>
          )}

          {/* Target Months Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border-color)',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                track_changes
              </span>{' '}
              Target payoff in
            </span>
            <input
              type="number"
              min="1"
              max="600"
              value={targetMonths}
              onChange={(e) => setTargetMonths(e.target.value)}
              placeholder={String(payoff.total_months || 12)}
              style={{
                width: 70,
                textAlign: 'center',
                padding: '6px 8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>months</span>
            {targetMonths && (
              <button
                onClick={() => setTargetMonths('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                }}
              >
                ✕ clear
              </button>
            )}
            {targetMonths && (() => {
              const targetDate = new Date();
              targetDate.setMonth(targetDate.getMonth() + parseInt(targetMonths));
              return (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.8rem',
                    color: 'var(--accent-green)',
                    fontWeight: 500,
                  }}
                >
                  Debt-free by{' '}
                  {targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              );
            })()}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: targetMonths ? 'repeat(4,1fr)' : 'repeat(3,1fr)',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div className="stat-card" style={{ padding: 14 }}>
              <div className="stat-label">Strategy</div>
              <div
                className="stat-value"
                style={{
                  fontSize: '1.2rem',
                  color: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {payoff.strategy === 'snowball' ? (
                  <>
                    <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                      ac_unit
                    </span>{' '}
                    Snowball
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                      landscape
                    </span>{' '}
                    Avalanche
                  </>
                )}
              </div>
              <div className="stat-sub">
                {payoff.strategy === 'snowball' ? 'Smallest balance first' : 'Highest APR first'}
              </div>
            </div>
            <div className="stat-card" style={{ padding: 14 }}>
              <div className="stat-label">Months to Debt-Free</div>
              <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--accent-green)' }}>
                {payoff.total_months}
              </div>
              <div className="stat-sub">{(payoff.total_months / 12).toFixed(1)} years</div>
            </div>
            <div className="stat-card" style={{ padding: 14 }}>
              <div className="stat-label">Total Interest Paid</div>
              <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--accent-red)' }}>
                {fmt(payoff.total_interest_paid)}
              </div>
            </div>
            {targetMonths && (
              <div className="stat-card" style={{ padding: 14, borderColor: 'var(--accent-blue)' }}>
                <div className="stat-label">Required Monthly Total</div>
                <div className="stat-value" style={{ fontSize: '1.4rem', color: 'var(--accent-blue)' }}>
                  {fmt(payoff.debts_order.reduce((s, d) => s + d.required_payment, 0))}
                </div>
                <div className="stat-sub">vs {fmt(totalPayments)} minimum</div>
              </div>
            )}
          </div>

          <h4 style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            PAYOFF TIMELINE
          </h4>
          {(() => {
            const now = new Date();
            const maxM = Math.max(...payoff.debts_order.map((d) => d.months_to_payoff), 1);
            const tickCount = Math.min(maxM, 12);
            const ticks = Array.from(
              { length: tickCount + 1 },
              (_, i) => Math.round((i * maxM) / tickCount)
            );
            const formatMonthTick = (v: number) => {
              const d = new Date(now);
              d.setMonth(d.getMonth() + v);
              return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            };
            const chartData = payoff.debts_order.map((d) => {
              const payoffDate = new Date(now);
              payoffDate.setMonth(payoffDate.getMonth() + d.months_to_payoff);
              return {
                ...d,
                payoff_label: payoffDate.toLocaleDateString('en-US', {
                  month: 'short',
                  year: '2-digit',
                }),
              };
            });

            // Simulate pivoted schedule monthly allocations
            const debtStates = payoff.debts_order.map((d) => ({
              id: d.debt_id,
              name: d.debt_name,
              balance: d.starting_balance,
              rate: d.interest_rate / 100 / 12,
              minPay: d.required_payment,
            }));
            const totalBudget = debtStates.reduce((s, d) => s + d.minPay, 0);
            const schedule: any[] = [];
            const simMonths = Math.min(maxM, 120);

            for (let m = 0; m < simMonths; m++) {
              const monthDate = new Date(now);
              monthDate.setMonth(monthDate.getMonth() + m);
              const label = monthDate.toLocaleDateString('en-US', {
                month: 'short',
                year: '2-digit',
              });
              const row: any = { month: m, label, payments: {}, total: 0, isCurrent: m === 0 };

              let remaining_budget = totalBudget;
              for (const ds of debtStates) {
                if (ds.balance <= 0.01) {
                  row.payments[ds.id] = { pay: 0, remaining: 0, paidOff: true };
                  continue;
                }
                const interest = ds.balance * ds.rate;
                const minDue = Math.min(ds.minPay, ds.balance + interest);
                row.payments[ds.id] = {
                  pay: minDue,
                  remaining: ds.balance,
                  interest,
                  paidOff: false,
                };
                remaining_budget -= minDue;
              }

              for (const ds of debtStates) {
                if (ds.balance <= 0.01 || remaining_budget <= 0.01) continue;
                const p = row.payments[ds.id];
                const canApply = Math.min(remaining_budget, ds.balance + p.interest - p.pay);
                if (canApply > 0.01) {
                  p.pay += canApply;
                  remaining_budget -= canApply;
                }
                break;
              }

              for (const ds of debtStates) {
                if (ds.balance <= 0.01) continue;
                const p = row.payments[ds.id];
                const interest = ds.balance * ds.rate;
                ds.balance = Math.max(0, ds.balance + interest - p.pay);
                p.remaining = ds.balance;
                p.paidOff = ds.balance <= 0.01;
                row.total += p.pay;
              }

              schedule.push(row);
              if (debtStates.every((ds) => ds.balance <= 0.01)) break;
            }

            return (
              <>
                <ResponsiveContainer width="100%" height={Math.max(160, payoff.debts_order.length * 50)}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                    <XAxis
                      type="number"
                      stroke="#555577"
                      fontSize={11}
                      ticks={ticks}
                      tickFormatter={formatMonthTick}
                      domain={[0, maxM]}
                    />
                    <YAxis
                      type="category"
                      dataKey="debt_name"
                      width={120}
                      stroke="#555577"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1a1a2e',
                        border: '1px solid #2a2a4a',
                        borderRadius: 8,
                      }}
                      formatter={(v, name) =>
                        name === 'months_to_payoff' ? `${v} months` : fmt(Number(v))
                      }
                    />
                    <Bar dataKey="months_to_payoff" fill="#4a90d9" radius={[0, 4, 4, 0]} name="Months" />
                  </BarChart>
                </ResponsiveContainer>

                <h4
                  style={{
                    marginTop: 24,
                    marginBottom: 12,
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  MONTHLY PAYMENT PLAN
                  <span
                    style={{
                      fontWeight: 400,
                      fontSize: '0.75rem',
                      marginLeft: 8,
                      color: 'var(--text-muted)',
                    }}
                  >
                    — Pay {fmt(totalBudget)}/mo total • extra goes to{' '}
                    {payoff.strategy === 'snowball' ? 'smallest balance' : 'highest APR'} first
                  </span>
                </h4>
                <div className="scroll-table-wrapper" style={{ marginTop: 4 }}>
                  <div className="scroll-table-inner">
                    <table
                      className="data-table"
                      style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                    >
                      <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                        <tr>
                          <th
                            style={{
                              position: 'sticky',
                              left: 0,
                              top: 0,
                              zIndex: 3,
                              background: 'var(--bg-primary)',
                              minWidth: 150,
                              boxShadow: '2px 0 4px rgba(0,0,0,0.2)',
                            }}
                          >
                            Debt
                          </th>
                          {schedule.map((row) => (
                            <th
                              key={row.month}
                              style={{
                                textAlign: 'right',
                                minWidth: 90,
                                padding: '8px 12px',
                                color: row.isCurrent ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                background: row.isCurrent
                                  ? 'rgba(74,144,217,0.1)'
                                  : 'var(--bg-primary)',
                                borderBottom: row.isCurrent
                                  ? '2px solid rgba(74,144,217,0.4)'
                                  : undefined,
                              }}
                            >
                              {row.label}
                              {row.isCurrent && (
                                <div
                                  style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 400,
                                    color: 'var(--accent-blue)',
                                    lineHeight: 1.2,
                                    marginTop: 2,
                                  }}
                                >
                                  ← now
                                </div>
                              )}
                            </th>
                          ))}
                          <th
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              minWidth: 90,
                              position: 'sticky',
                              right: 0,
                              background: 'var(--bg-primary)',
                              boxShadow: '-2px 0 4px rgba(0,0,0,0.2)',
                            }}
                          >
                            Total Paid
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.map((d, di) => {
                          const debtTotal = schedule.reduce(
                            (sum, row) => sum + (row.payments[d.debt_id]?.pay || 0),
                            0
                          );
                          const rowBg = di % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent';
                          return (
                            <tr key={d.debt_id}>
                              <td
                                style={{
                                  fontWeight: 600,
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 1,
                                  background:
                                    di % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  boxShadow: '2px 0 4px rgba(0,0,0,0.15)',
                                }}
                              >
                                {d.debt_name}
                              </td>
                              {schedule.map((row) => {
                                const p = row.payments[d.debt_id];
                                if (!p) {
                                  return (
                                    <td
                                      key={row.month}
                                      className="amount"
                                      style={{
                                        color: 'var(--text-muted)',
                                        background: row.isCurrent ? 'rgba(74,144,217,0.05)' : rowBg,
                                      }}
                                    >
                                      —
                                    </td>
                                  );
                                }
                                const isExtra = p.pay > d.required_payment + 0.5;
                                const justPaidOff = p.paidOff && p.pay > 0;
                                return (
                                  <td
                                    key={row.month}
                                    className="amount"
                                    style={{
                                      color:
                                        p.paidOff && p.pay === 0
                                          ? 'var(--text-muted)'
                                          : isExtra
                                          ? '#4a90d9'
                                          : 'var(--text-primary)',
                                      fontWeight: isExtra ? 700 : 400,
                                      background: justPaidOff
                                        ? 'rgba(34,197,94,0.12)'
                                        : row.isCurrent
                                        ? 'rgba(74,144,217,0.07)'
                                        : rowBg,
                                    }}
                                  >
                                    {p.pay > 0.01 ? fmt(p.pay) : '—'}
                                    {justPaidOff && (
                                      <span
                                        className="material-symbols-rounded"
                                        style={{
                                          fontSize: '0.8em',
                                          marginLeft: 3,
                                          color: 'var(--accent-green)',
                                        }}
                                      >
                                        check
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td
                                className="amount"
                                style={{
                                  fontWeight: 700,
                                  color: 'var(--text-muted)',
                                  position: 'sticky',
                                  right: 0,
                                  background:
                                    di % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                  boxShadow: '-2px 0 4px rgba(0,0,0,0.15)',
                                }}
                              >
                                {fmt(debtTotal)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Total / month row — sticky at bottom */}
                        <tr
                          style={{
                            borderTop: '2px solid var(--border-color)',
                            background: 'rgba(74,144,217,0.05)',
                          }}
                        >
                          <td
                            style={{
                              fontWeight: 700,
                              position: 'sticky',
                              left: 0,
                              zIndex: 1,
                              background: 'var(--bg-secondary)',
                              boxShadow: '2px 0 4px rgba(0,0,0,0.15)',
                            }}
                          >
                            Total / mo
                          </td>
                          {schedule.map((row) => (
                            <td
                              key={row.month}
                              className="amount"
                              style={{
                                fontWeight: 700,
                                color: 'var(--accent-blue)',
                                background: row.isCurrent ? 'rgba(74,144,217,0.12)' : 'transparent',
                              }}
                            >
                              {fmt(row.total)}
                            </td>
                          ))}
                          <td
                            className="amount"
                            style={{
                              fontWeight: 700,
                              color: 'var(--accent-blue)',
                              position: 'sticky',
                              right: 0,
                              background: 'var(--bg-secondary)',
                              boxShadow: '-2px 0 4px rgba(0,0,0,0.15)',
                            }}
                          >
                            {fmt(schedule.reduce((s, r) => s + r.total, 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Bonus Plan Result */}
      {bonusPlan && (
        <div className="card section" style={{ borderColor: 'var(--accent-green)' }}>
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                track_changes
              </span>{' '}
              Bonus Allocation Plan
            </h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            {fmt(bonusPlan.total_amount)} bonus using <strong>{bonusPlan.strategy}</strong> strategy:
          </p>
          {bonusPlan.allocations.map((a, i) => {
            const debt = debts.find((d) => d.id === a.reference_id);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <span>
                  {i + 1}. {debt?.name || 'Unknown'}
                </span>
                <span className="amount" style={{ color: 'var(--accent-green)', fontWeight: 700 }}>
                  {fmt(a.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Debt Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Debt</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="e.g. Chase Sapphire, Honda Civic"
                />
              </div>
              <div className="form-group">
                <label>Debt Type</label>
                <select
                  required
                  value={form.debt_type}
                  onChange={(e) => updateForm({ debt_type: e.target.value })}
                >
                  {DEBT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.balance}
                    onChange={(e) => updateForm({ balance: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>APR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.interest_rate}
                    onChange={(e) => updateForm({ interest_rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>
                    Minimum Payment{' '}
                    {form.debt_type === 'credit_card' && (
                      <span style={{ color: 'var(--accent-blue)', fontSize: '0.7rem', fontWeight: 400 }}>
                        {' '}
                        (auto-calculated)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.minimum_payment}
                    onChange={(e) => setForm({ ...form, minimum_payment: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Due Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.due_day_of_month}
                    onChange={(e) => setForm({ ...form, due_day_of_month: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                    bolt
                  </span>{' '}
                  Amount Due Immediately
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount_due_immediately}
                  onChange={(e) => setForm({ ...form, amount_due_immediately: e.target.value })}
                  placeholder="0.00 — leave blank if none"
                />
              </div>
              <div className="form-group">
                <label>Website Direct Link</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="e.g. https://www.chase.com"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1em', marginRight: 4 }}>
                    bar_chart
                  </span>{' '}
                  This Month Payment Strategy
                </label>
                <select
                  value={form.payment_strategy}
                  onChange={(e) => setForm({ ...form, payment_strategy: e.target.value })}
                >
                  {PAYMENT_STRATEGIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Minimum = standard min payment · Due Now = amount_due_immediately · Payoff Plan =
                  committed plan amount
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bonus Modal */}
      {showBonusModal && (
        <div className="modal-overlay" onClick={() => setShowBonusModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                track_changes
              </span>{' '}
              Plan Bonus Allocation
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
              Enter a bonus amount and we'll calculate the optimal allocation across your debts.
            </p>
            <form onSubmit={handleBonusSubmit}>
              <div className="form-group">
                <label>Bonus Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={bonusForm.total_amount}
                  onChange={(e) => setBonusForm({ ...bonusForm, total_amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Strategy</label>
                <select
                  value={bonusForm.strategy}
                  onChange={(e) => setBonusForm({ ...bonusForm, strategy: e.target.value })}
                >
                  <option value="snowball">Snowball (smallest first)</option>
                  <option value="avalanche">Avalanche (highest APR first)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={bonusForm.notes}
                  onChange={(e) => setBonusForm({ ...bonusForm, notes: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBonusModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payoff Configure Modal */}
      {showPayoffConfig && (
        <div className="modal-overlay" onClick={() => setShowPayoffConfig(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
                <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                  settings
                </span>{' '}
                Configure Payoff Plan
              </h3>
              <TableSearch
                searchQuery={payoffConfigTable.searchQuery}
                setSearchQuery={payoffConfigTable.setSearchQuery}
                isOpen={payoffConfigTable.searchOpen}
                setIsOpen={payoffConfigTable.setSearchOpen}
              />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
              Toggle which debts to include in the payoff calculation.
            </p>
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <TableHeader
                    label="Name"
                    sortKey="name"
                    activeKey={payoffConfigTable.sortKey}
                    activeDirection={payoffConfigTable.sortDirection}
                    onClick={payoffConfigTable.requestSort}
                  />
                  <TableHeader
                    label="Type"
                    sortKey="debt_type"
                    activeKey={payoffConfigTable.sortKey}
                    activeDirection={payoffConfigTable.sortDirection}
                    onClick={payoffConfigTable.requestSort}
                  />
                  <TableHeader
                    label="Balance"
                    sortKey="balance"
                    activeKey={payoffConfigTable.sortKey}
                    activeDirection={payoffConfigTable.sortDirection}
                    onClick={payoffConfigTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="APR"
                    sortKey="interest_rate"
                    activeKey={payoffConfigTable.sortKey}
                    activeDirection={payoffConfigTable.sortDirection}
                    onClick={payoffConfigTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                  <TableHeader
                    label="Min Payment"
                    sortKey="minimum_payment"
                    activeKey={payoffConfigTable.sortKey}
                    activeDirection={payoffConfigTable.sortDirection}
                    onClick={payoffConfigTable.requestSort}
                    style={{ textAlign: 'right' }}
                  />
                </tr>
              </thead>
              <tbody>
                {payoffConfigTable.data.map((d) => {
                  const excluded = excludedDebtIds.includes(d.id);
                  return (
                    <tr
                      key={d.id}
                      style={{ opacity: excluded ? 0.4 : 1, transition: 'opacity 0.2s' }}
                    >
                      <td>
                        <button
                          onClick={() => toggleDebtInPlan(d.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            padding: 4,
                            borderRadius: 6,
                          }}
                          title={excluded ? 'Include in plan' : 'Exclude from plan'}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: '1em' }}>
                            {excluded ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </td>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem' }}>{getDebtTypeLabel(d.debt_type)}</span>
                      </td>
                      <td className="amount">{fmt(d.balance)}</td>
                      <td style={{ textAlign: 'right' }}>{d.interest_rate.toFixed(1)}%</td>
                      <td className="amount">{fmt(d.minimum_payment)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              {excludedDebtIds.length > 0 && (
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => setExcludedDebtIds([])}
                  style={{ marginRight: 'auto' }}
                >
                  Include All
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setShowPayoffConfig(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit website link modal */}
      {showLinkModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowLinkModal(false);
            setLinkModalDebt(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                link
              </span>
              Website Link for {linkModalDebt?.name}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
              Configure a direct shortcut to this credit card or debt's online payment site.
            </p>
            <form onSubmit={handleLinkSave}>
              <div className="form-group">
                <label>Website URL</label>
                <input
                  type="url"
                  value={linkModalUrl}
                  onChange={(e) => setLinkModalUrl(e.target.value)}
                  placeholder="e.g. https://www.chase.com"
                  required={false}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkModalDebt(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
