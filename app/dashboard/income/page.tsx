'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import DeleteButton from '../components/DeleteButton';
import InlineEdit from '../components/InlineEdit';
import ExcelUpload from '../components/ExcelUpload';
import useTable from '../hooks/useTable';
import TableSearch from '../components/TableSearch';
import TableHeader from '../components/TableHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

interface IncomeSource {
  id: string;
  name: string;
  gross_amount: number;
  net_amount: number;
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  next_pay_date: string | null;
  notes: string | null;
}

interface IncomeAllocation {
  id: string;
  income_source_id: string;
  account_id: string;
  allocation_type: 'percent' | 'fixed';
  allocation_value: number;
}

interface IncomeEvent {
  id: string;
  income_source_id: string | null;
  account_id: string | null;
  amount: number;
  received_date: string;
  is_bonus: boolean;
  notes: string | null;
}

interface Account {
  id: string;
  name: string;
}

export default function Income() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [allocations, setAllocations] = useState<IncomeAllocation[]>([]);
  const [events, setEvents] = useState<IncomeEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Paycheck Sources Table Hook
  const sourcesTable = useTable<IncomeSource>(sources, {
    searchKeys: ['name', 'frequency', 'next_pay_date', 'notes'],
    defaultSort: { key: 'name', direction: 'asc' },
  });

  // Paycheck Allocations Table Hook
  const allocationsTable = useTable<IncomeAllocation>(allocations, {
    searchKeys: [
      (item) => sources.find((s) => s.id === item.income_source_id)?.name || '',
      (item) => accounts.find((ac) => ac.id === item.account_id)?.name || '',
      'allocation_type',
    ],
    sortExtractors: {
      source: (item) => sources.find((s) => s.id === item.income_source_id)?.name || '',
      account: (item) => accounts.find((ac) => ac.id === item.account_id)?.name || '',
      allocation_value: (item) => item.allocation_value,
    },
    defaultSort: { key: 'source', direction: 'asc' },
  });

  // Income Events Table Hook
  const eventsTable = useTable<IncomeEvent>(events, {
    searchKeys: [
      'received_date',
      (item) => sources.find((s) => s.id === item.income_source_id)?.name || 'One-time',
      (item) => accounts.find((ac) => ac.id === item.account_id)?.name || '',
      'notes',
    ],
    sortExtractors: {
      source: (item) => sources.find((s) => s.id === item.income_source_id)?.name || 'One-time',
      account: (item) => accounts.find((ac) => ac.id === item.account_id)?.name || '',
      amount: (item) => item.amount,
      received_date: (item) => item.received_date,
    },
    defaultSort: { key: 'received_date', direction: 'desc' },
  });

  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    name: '',
    gross_amount: '',
    net_amount: '',
    frequency: 'biweekly',
    next_pay_date: '',
    notes: '',
  });
  const [allocForm, setAllocForm] = useState({
    income_source_id: '',
    account_id: '',
    allocation_type: 'percent',
    allocation_value: '',
  });
  const [eventForm, setEventForm] = useState({
    income_source_id: '',
    account_id: '',
    amount: '',
    received_date: '',
    is_bonus: false,
    notes: '',
  });

  const load = () => {
    Promise.all([
      axios.get('/api/income/sources').then((r) => r.data),
      axios.get('/api/income/allocations').then((r) => r.data),
      axios.get('/api/income/events').then((r) => r.data),
      axios.get('/api/accounts').then((r) => r.data),
    ])
      .then(([s, a, e, acc]) => {
        setSources(s);
        setAllocations(a);
        setEvents(e);
        setAccounts(acc);
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/income/sources', {
        ...sourceForm,
        gross_amount: parseFloat(sourceForm.gross_amount) || 0,
        net_amount: parseFloat(sourceForm.net_amount) || 0,
        next_pay_date: sourceForm.next_pay_date || null,
        notes: sourceForm.notes || null,
      });
      setSourceForm({
        name: '',
        gross_amount: '',
        net_amount: '',
        frequency: 'biweekly',
        next_pay_date: '',
        notes: '',
      });
      setShowSourceModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const updateSourceItem = async (id: string, payload: any) => {
    try {
      await axios.put(`/api/income/sources/${id}`, payload);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSourceItem = async (id: string) => {
    try {
      await axios.delete(`/api/income/sources/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAllocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/income/allocations', {
        ...allocForm,
        allocation_value: parseFloat(allocForm.allocation_value) || 0,
      });
      setAllocForm({
        income_source_id: '',
        account_id: '',
        allocation_type: 'percent',
        allocation_value: '',
      });
      setShowAllocModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAllocItem = async (id: string) => {
    try {
      await axios.delete(`/api/income/allocations/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/income/events', {
        ...eventForm,
        income_source_id: eventForm.income_source_id || null,
        account_id: eventForm.account_id || null,
        amount: parseFloat(eventForm.amount) || 0,
        notes: eventForm.notes || null,
      });
      setEventForm({
        income_source_id: '',
        account_id: '',
        amount: '',
        received_date: '',
        is_bonus: false,
        notes: '',
      });
      setShowEventModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const updateEventItem = async (id: string, payload: any) => {
    try {
      await axios.put(`/api/income/events/${id}`, payload);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEventItem = async (id: string) => {
    try {
      await axios.delete(`/api/income/events/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const monthlyIncome = sources.reduce((s, src) => {
    const mult = { weekly: 4.33, biweekly: 2.167, semimonthly: 2, monthly: 1 };
    return s + src.net_amount * (mult[src.frequency] || 1);
  }, 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Income</h2>
        <p>Configure your paychecks, allocations, and track income events</p>
      </div>

      {/* Stats */}
      <div className="card-grid-3 section">
        <div className="stat-card stat-green">
          <div className="stat-label">Monthly Net Income</div>
          <div className="stat-value">{fmt(monthlyIncome)}</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-label">Income Sources</div>
          <div className="stat-value">{sources.length}</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-label">Bonus Events</div>
          <div className="stat-value">{events.filter((e) => e.is_bonus).length}</div>
        </div>
      </div>

      {/* Income Sources */}
      <div className="card section">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              payments
            </span>{' '}
            Paycheck Sources
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ExcelUpload
              templateName="income_sources_template.xlsx"
              templateColumns={[
                { header: 'Name', example: 'Primary Job' },
                { header: 'Gross Pay', example: 3500.0 },
                { header: 'Net Pay', example: 2800.0 },
                { header: 'Frequency', example: 'biweekly' },
                { header: 'Next Pay Date', example: '2026-03-28' },
                { header: 'Notes', example: '' },
              ]}
              onImport={async (rows) => {
                let created = 0;
                const errors: string[] = [];
                for (let i = 0; i < rows.length; i++) {
                  const r = rows[i];
                  const name = String(r['Name'] || '').trim();
                  if (!name) {
                    errors.push(`Row ${i + 2}: Missing Name`);
                    continue;
                  }
                  const gross = parseFloat(r['Gross Pay']);
                  const net = parseFloat(r['Net Pay']);
                  if (isNaN(gross) || isNaN(net)) {
                    errors.push(`Row ${i + 2}: Invalid Gross/Net Pay`);
                    continue;
                  }
                  const freq = String(r['Frequency'] || 'biweekly').trim().toLowerCase();
                  if (!['weekly', 'biweekly', 'semimonthly', 'monthly'].includes(freq)) {
                    errors.push(`Row ${i + 2}: Invalid Frequency "${freq}"`);
                    continue;
                  }
                  try {
                    await axios.post('/api/income/sources', {
                      name,
                      gross_amount: gross,
                      net_amount: net,
                      frequency: freq,
                      next_pay_date: r['Next Pay Date']
                        ? String(r['Next Pay Date']).trim()
                        : null,
                      notes: r['Notes'] || null,
                    });
                    created++;
                  } catch (e: any) {
                    errors.push(`Row ${i + 2}: ${e.message}`);
                  }
                }
                return { created, errors };
              }}
              onComplete={load}
            />
            <TableSearch
              searchQuery={sourcesTable.searchQuery}
              setSearchQuery={sourcesTable.setSearchQuery}
              isOpen={sourcesTable.searchOpen}
              setIsOpen={sourcesTable.setSearchOpen}
            />
            <button className="btn btn-primary" onClick={() => setShowSourceModal(true)}>
              + Add Source
            </button>
          </div>
        </div>
        {sources.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                payments
              </span>
            </div>
            <h3>No income sources</h3>
            <p>Add your paycheck details to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Name"
                  sortKey="name"
                  activeKey={sourcesTable.sortKey}
                  activeDirection={sourcesTable.sortDirection}
                  onClick={sourcesTable.requestSort}
                />
                <TableHeader
                  label="Gross"
                  sortKey="gross_amount"
                  activeKey={sourcesTable.sortKey}
                  activeDirection={sourcesTable.sortDirection}
                  onClick={sourcesTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Net"
                  sortKey="net_amount"
                  activeKey={sourcesTable.sortKey}
                  activeDirection={sourcesTable.sortDirection}
                  onClick={sourcesTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Frequency"
                  sortKey="frequency"
                  activeKey={sourcesTable.sortKey}
                  activeDirection={sourcesTable.sortDirection}
                  onClick={sourcesTable.requestSort}
                />
                <TableHeader
                  label="Next Pay Date"
                  sortKey="next_pay_date"
                  activeKey={sourcesTable.sortKey}
                  activeDirection={sourcesTable.sortDirection}
                  onClick={sourcesTable.requestSort}
                />
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {sourcesTable.data.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>
                    <InlineEdit
                      value={s.name}
                      type="text"
                      format="raw"
                      onSave={async (v) => {
                        await updateSourceItem(s.id, { name: String(v) });
                      }}
                    />
                  </td>
                  <td className="amount">
                    <InlineEdit
                      value={s.gross_amount}
                      onSave={async (v) => {
                        await updateSourceItem(s.id, { gross_amount: Number(v) });
                      }}
                    />
                  </td>
                  <td className="amount">
                    <InlineEdit
                      value={s.net_amount}
                      onSave={async (v) => {
                        await updateSourceItem(s.id, { net_amount: Number(v) });
                      }}
                    />
                  </td>
                  <td>
                    <span className="badge badge-blue">{s.frequency}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.next_pay_date || '—'}</td>
                  <td>
                    <DeleteButton onDelete={() => deleteSourceItem(s.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Allocations */}
      <div className="card section">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              shuffle
            </span>{' '}
            Paycheck Allocations
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <TableSearch
              searchQuery={allocationsTable.searchQuery}
              setSearchQuery={allocationsTable.setSearchQuery}
              isOpen={allocationsTable.searchOpen}
              setIsOpen={allocationsTable.setSearchOpen}
            />
            <button
              className="btn btn-primary btn-small"
              onClick={() => setShowAllocModal(true)}
              disabled={sources.length === 0 || accounts.length === 0}
            >
              + Add Split
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          Define how each paycheck is split across your bank accounts.
        </p>
        {allocations.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <p>No allocations set up yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Source"
                  sortKey="source"
                  activeKey={allocationsTable.sortKey}
                  activeDirection={allocationsTable.sortDirection}
                  onClick={allocationsTable.requestSort}
                />
                <TableHeader
                  label="Account"
                  sortKey="account"
                  activeKey={allocationsTable.sortKey}
                  activeDirection={allocationsTable.sortDirection}
                  onClick={allocationsTable.requestSort}
                />
                <TableHeader
                  label="Type"
                  sortKey="allocation_type"
                  activeKey={allocationsTable.sortKey}
                  activeDirection={allocationsTable.sortDirection}
                  onClick={allocationsTable.requestSort}
                />
                <TableHeader
                  label="Value"
                  sortKey="allocation_value"
                  activeKey={allocationsTable.sortKey}
                  activeDirection={allocationsTable.sortDirection}
                  onClick={allocationsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {allocationsTable.data.map((a) => (
                <tr key={a.id}>
                  <td>{sources.find((s) => s.id === a.income_source_id)?.name || '—'}</td>
                  <td>{accounts.find((ac) => ac.id === a.account_id)?.name || '—'}</td>
                  <td>
                    <span className="badge badge-purple">{a.allocation_type}</span>
                  </td>
                  <td className="amount">
                    {a.allocation_type === 'percent' ? `${a.allocation_value}%` : fmt(a.allocation_value)}
                  </td>
                  <td>
                    <DeleteButton onDelete={() => deleteAllocItem(a.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Income Events */}
      <div className="card section">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              calendar_today
            </span>{' '}
            Income Events
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <TableSearch
              searchQuery={eventsTable.searchQuery}
              setSearchQuery={eventsTable.setSearchQuery}
              isOpen={eventsTable.searchOpen}
              setIsOpen={eventsTable.setSearchOpen}
            />
            <button className="btn btn-primary btn-small" onClick={() => setShowEventModal(true)}>
              + Log Income
            </button>
          </div>
        </div>
        {events.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <p>No income events logged yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Date"
                  sortKey="received_date"
                  activeKey={eventsTable.sortKey}
                  activeDirection={eventsTable.sortDirection}
                  onClick={eventsTable.requestSort}
                />
                <TableHeader
                  label="Source"
                  sortKey="source"
                  activeKey={eventsTable.sortKey}
                  activeDirection={eventsTable.sortDirection}
                  onClick={eventsTable.requestSort}
                />
                <TableHeader
                  label="Amount"
                  sortKey="amount"
                  activeKey={eventsTable.sortKey}
                  activeDirection={eventsTable.sortDirection}
                  onClick={eventsTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Bank Account"
                  sortKey="account"
                  activeKey={eventsTable.sortKey}
                  activeDirection={eventsTable.sortDirection}
                  onClick={eventsTable.requestSort}
                />
                <TableHeader
                  label="Type"
                  sortKey="is_bonus"
                  activeKey={eventsTable.sortKey}
                  activeDirection={eventsTable.sortDirection}
                  onClick={eventsTable.requestSort}
                />
                <TableHeader
                  label="Notes"
                  sortKey="notes"
                  activeKey={eventsTable.sortKey}
                  activeDirection={eventsTable.sortDirection}
                  onClick={eventsTable.requestSort}
                />
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {eventsTable.data.map((e) => (
                <tr key={e.id}>
                  <td>{e.received_date}</td>
                  <td>{sources.find((s) => s.id === e.income_source_id)?.name || 'One-time'}</td>
                  <td className="amount" style={{ color: 'var(--accent)' }}>
                    <InlineEdit
                      value={e.amount}
                      onSave={async (v) => {
                        await updateEventItem(e.id, { amount: Number(v) });
                      }}
                    />
                  </td>
                  <td>
                    <select
                      value={e.account_id || ''}
                      onChange={async (ev) => {
                        await updateEventItem(e.id, { account_id: ev.target.value || null });
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
                      <option value="">—</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {e.is_bonus ? (
                      <span
                        className="badge badge-amber"
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                      >
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: '1em', marginRight: 4 }}
                        >
                          celebration
                        </span>{' '}
                        Bonus
                      </span>
                    ) : (
                      <span className="badge badge-blue">Regular</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <InlineEdit
                      value={e.notes || ''}
                      type="text"
                      format="raw"
                      onSave={async (v) => {
                        await updateEventItem(e.id, { notes: String(v) || null });
                      }}
                    />
                  </td>
                  <td>
                    <DeleteButton onDelete={() => deleteEventItem(e.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Source Modal */}
      {showSourceModal && (
        <div className="modal-overlay" onClick={() => setShowSourceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Income Source</h3>
            <form onSubmit={handleSourceSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={sourceForm.name}
                  onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                  placeholder="e.g. Primary Job"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gross Pay</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sourceForm.gross_amount}
                    onChange={(e) => setSourceForm({ ...sourceForm, gross_amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Net Pay (Take Home)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sourceForm.net_amount}
                    onChange={(e) => setSourceForm({ ...sourceForm, net_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={sourceForm.frequency}
                    onChange={(e) =>
                      setSourceForm({
                        ...sourceForm,
                        frequency: e.target.value as any,
                      })
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="semimonthly">Semi-monthly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Pay Date</label>
                  <input
                    type="date"
                    value={sourceForm.next_pay_date}
                    onChange={(e) => setSourceForm({ ...sourceForm, next_pay_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={sourceForm.notes}
                  onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSourceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocModal && (
        <div className="modal-overlay" onClick={() => setShowAllocModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Allocation</h3>
            <form onSubmit={handleAllocSubmit}>
              <div className="form-group">
                <label>Income Source</label>
                <select
                  required
                  value={allocForm.income_source_id}
                  onChange={(e) =>
                    setAllocForm({ ...allocForm, income_source_id: e.target.value })
                  }
                >
                  <option value="">Select...</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Bank Account</label>
                <select
                  required
                  value={allocForm.account_id}
                  onChange={(e) => setAllocForm({ ...allocForm, account_id: e.target.value })}
                >
                  <option value="">Select...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={allocForm.allocation_type}
                    onChange={(e) =>
                      setAllocForm({
                        ...allocForm,
                        allocation_type: e.target.value as any,
                      })
                    }
                  >
                    <option value="percent">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    {allocForm.allocation_type === 'percent' ? 'Percentage' : 'Amount'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={allocForm.allocation_value}
                    onChange={(e) =>
                      setAllocForm({ ...allocForm, allocation_value: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAllocModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Log Income Event</h3>
            <form onSubmit={handleEventSubmit}>
              <div className="form-group">
                <label>Source (optional)</label>
                <select
                  value={eventForm.income_source_id}
                  onChange={(e) => setEventForm({ ...eventForm, income_source_id: e.target.value })}
                >
                  <option value="">None (one-time)</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={eventForm.amount}
                    onChange={(e) => setEventForm({ ...eventForm, amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Date Received</label>
                  <input
                    type="date"
                    required
                    value={eventForm.received_date}
                    onChange={(e) => setEventForm({ ...eventForm, received_date: e.target.value })}
                  />
                </div>
              </div>
              <div
                className="form-group"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <input
                  type="checkbox"
                  id="isBonus"
                  checked={eventForm.is_bonus}
                  onChange={(e) => setEventForm({ ...eventForm, is_bonus: e.target.checked })}
                  style={{ width: 'auto' }}
                />
                <label
                  htmlFor="isBonus"
                  style={{ margin: 0, textTransform: 'none', fontSize: '0.9rem' }}
                >
                  This is a bonus / irregular income
                </label>
              </div>
              <div className="form-group">
                <label>Bank Account (optional)</label>
                <select
                  value={eventForm.account_id}
                  onChange={(e) => setEventForm({ ...eventForm, account_id: e.target.value })}
                >
                  <option value="">None</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEventModal(false)}
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
