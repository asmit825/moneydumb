'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import DeleteButton from '../components/DeleteButton';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

interface Envelope {
  id: string;
  category_id: string | null;
  name: string;
  budgeted_amount: number;
  spent_amount: number;
  notes: string | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function Envelopes() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [showModal, setShowModal] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category_id: '', budgeted_amount: '', notes: '' });
  const [spendForm, setSpendForm] = useState({ amount: '', description: '' });
  const [smartResult, setSmartResult] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const load = () => {
    Promise.all([
      axios.get('/api/envelopes', { params: { month, year } }).then((r) => r.data),
      axios.get('/api/expenses/categories').then((r) => r.data),
    ])
      .then(([e, c]) => {
        setEnvelopes(e);
        setCategories(c);
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();
    setSmartResult(null);
  }, [month, year]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/envelopes', {
        ...form,
        budgeted_amount: parseFloat(form.budgeted_amount) || 0,
        category_id: form.category_id || null,
        month,
        year,
      });
      setForm({ name: '', category_id: '', budgeted_amount: '', notes: '' });
      setShowModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSpendModal) return;
    try {
      await axios.post('/api/envelopes/transactions', {
        envelope_id: showSpendModal,
        amount: parseFloat(spendForm.amount) || 0,
        description: spendForm.description || null,
      });
      setSpendForm({ amount: '', description: '' });
      setShowSpendModal(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSmartEnvelope = async () => {
    setGenerating(true);
    try {
      const result = await axios
        .post('/api/envelopes/smart', { month, year })
        .then((r) => r.data);
      setSmartResult(result);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const deleteEnvelopeItem = async (id: string) => {
    try {
      await axios.delete(`/api/envelopes/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const totalBudgeted = envelopes.reduce((s, e) => s + Number(e.budgeted_amount), 0);
  const totalSpent = envelopes.reduce((s, e) => s + Number(e.spent_amount), 0);
  const overCount = envelopes.filter((e) => Number(e.spent_amount) > Number(e.budgeted_amount)).length;

  const monthNames = [
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

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 8 }}>
            mail
          </span>{' '}
          Envelope Budgeting
        </h2>
        <p>Dave Ramsey method — set aside money for specific purposes</p>
      </div>

      {/* Month Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => {
            if (month === 1) {
              setMonth(12);
              setYear(year - 1);
            } else {
              setMonth(month - 1);
            }
          }}
        >
          ← Prev
        </button>
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {monthNames[month - 1]} {year}
        </span>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => {
            if (month === 12) {
              setMonth(1);
              setYear(year + 1);
            } else {
              setMonth(month + 1);
            }
          }}
        >
          Next →
        </button>
      </div>

      {/* Smart Result Banner */}
      {smartResult && (
        <div
          className="alert alert-info section"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              auto_awesome
            </span>{' '}
            Created <strong>{smartResult.created?.length || 0}</strong> envelope
            {smartResult.created?.length !== 1 ? 's' : ''} from your recurring expenses
            {smartResult.skipped > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}
                · {smartResult.skipped} skipped (already exist)
              </span>
            )}
          </span>
          <button className="btn btn-secondary btn-small" onClick={() => setSmartResult(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="card-grid-3 section">
        <div className="stat-card stat-blue">
          <div className="stat-label">Total Budgeted</div>
          <div className="stat-value">{fmt(totalBudgeted)}</div>
        </div>
        <div className={`stat-card ${totalSpent > totalBudgeted ? 'stat-red' : 'stat-green'}`}>
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">{fmt(totalSpent)}</div>
        </div>
        <div className={`stat-card ${overCount > 0 ? 'stat-red' : 'stat-green'}`}>
          <div className="stat-label">Over Budget</div>
          <div className="stat-value">{overCount}</div>
          <div className="stat-sub">of {envelopes.length} envelopes</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-secondary"
          onClick={handleSmartEnvelope}
          disabled={generating}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {generating ? (
            <>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em' }}>
                hourglass_empty
              </span>{' '}
              Generating...
            </>
          ) : (
            <>
              <span className="material-symbols-rounded" style={{ fontSize: '1.2em' }}>
                auto_awesome
              </span>{' '}
              Smart Envelope
            </>
          )}
        </button>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Envelope
        </button>
      </div>

      {envelopes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                mail
              </span>
            </div>
            <h3>No envelopes for {monthNames[month - 1]}</h3>
            <p>
              Create envelopes manually or use{' '}
              <strong>
                <span
                  className="material-symbols-rounded"
                  style={{ fontSize: '1.2em', verticalAlign: '-3px' }}
                >
                  auto_awesome
                </span>{' '}
                Smart Envelope
              </strong>{' '}
              to auto-generate from your expenses.
            </p>
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {envelopes.map((env) => {
            const pct =
              env.budgeted_amount > 0
                ? Math.min((env.spent_amount / env.budgeted_amount) * 100, 100)
                : 0;
            const over = Number(env.spent_amount) > Number(env.budgeted_amount);
            const remaining = env.budgeted_amount - env.spent_amount;
            const cat = categories.find((c) => c.id === env.category_id);
            const colorClass = over ? 'progress-red' : pct > 75 ? 'progress-amber' : 'progress-green';
            return (
              <div key={env.id} className="envelope-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="envelope-name">{env.name}</div>
                    {cat && (
                      <span
                        className="badge"
                        style={{
                          background: cat.color + '20',
                          color: cat.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginTop: 4,
                        }}
                      >
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: '1em', marginRight: 4 }}
                        >
                          {cat.icon}
                        </span>{' '}
                        {cat.name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => setShowSpendModal(env.id)}
                    >
                      + Spend
                    </button>
                    <DeleteButton onDelete={() => deleteEnvelopeItem(env.id)} label="×" />
                  </div>
                </div>
                <div className="envelope-amounts">
                  <span
                    className="spent"
                    style={{ color: over ? 'var(--rose)' : 'var(--text-primary)' }}
                  >
                    {fmt(env.spent_amount)} spent
                  </span>
                  <span>of {fmt(env.budgeted_amount)}</span>
                </div>
                <div className={`progress-bar ${colorClass}`}>
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: '0.8rem',
                    color: over ? 'var(--rose)' : 'var(--accent)',
                    fontWeight: 600,
                  }}
                >
                  {over ? `${fmt(Math.abs(remaining))} over budget` : `${fmt(remaining)} remaining`}
                </div>
                {env.notes && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: '0.72rem',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 4 }}>
                      edit_note
                    </span>{' '}
                    {env.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Envelope Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              New Envelope for {monthNames[month - 1]} {year}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Groceries, Gas, Fun Money"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.budgeted_amount}
                    onChange={(e) => setForm({ ...form, budgeted_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spend Modal */}
      {showSpendModal && (
        <div className="modal-overlay" onClick={() => setShowSpendModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Log Spending</h3>
            <form onSubmit={handleSpend}>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={spendForm.amount}
                  onChange={(e) => setSpendForm({ ...spendForm, amount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  value={spendForm.description}
                  onChange={(e) => setSpendForm({ ...spendForm, description: e.target.value })}
                  placeholder="What was this for?"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSpendModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
