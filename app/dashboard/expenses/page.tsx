'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
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

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Account {
  id: string;
  name: string;
  account_type: string;
}

interface Expense {
  id: string;
  category_id: string | null;
  name: string;
  amount: number;
  due_day_of_month: number | null;
  is_recurring: boolean;
  frequency: string;
  account_id: string | null;
  notes: string;
  url: string | null;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    amount: '',
    due_day_of_month: '',
    is_recurring: true,
    frequency: 'monthly',
    account_id: '',
    notes: '',
    url: '',
  });

  const {
    data: filteredAndSortedExpenses,
    sortKey,
    sortDirection,
    requestSort,
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
  } = useTable<Expense>(expenses, {
    searchKeys: [
      'name',
      (item) => categories.find((c) => c.id === item.category_id)?.name || '',
      (item) => accounts.find((a) => a.id === item.account_id)?.name || '',
      (item) => (item.due_day_of_month != null ? String(item.due_day_of_month) : ''),
      'notes',
    ],
    sortExtractors: {
      category: (item) => categories.find((c) => c.id === item.category_id)?.name || '',
      account: (item) => accounts.find((a) => a.id === item.account_id)?.name || '',
      amount: (item) => item.amount,
      due_day_of_month: (item) => item.due_day_of_month ?? 0,
    },
    defaultSort: { key: 'name', direction: 'asc' },
  });

  const [catForm, setCatForm] = useState({ name: '', color: '#6366f1', icon: 'folder' });

  const load = () => {
    Promise.all([
      axios.get('/api/expenses').then((r) => r.data),
      axios.get('/api/expenses/categories').then((r) => r.data),
      axios.get('/api/accounts').then((r) => r.data),
    ])
      .then(([e, c, a]) => {
        setExpenses(e);
        setCategories(c);
        setAccounts(a);
      })
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      category_id: '',
      name: '',
      amount: '',
      due_day_of_month: '',
      is_recurring: true,
      frequency: 'monthly',
      account_id: '',
      notes: '',
      url: '',
    });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setForm({
      category_id: e.category_id || '',
      name: e.name || '',
      amount: String(e.amount),
      due_day_of_month: e.due_day_of_month != null ? String(e.due_day_of_month) : '',
      is_recurring: e.is_recurring,
      frequency: e.frequency || 'monthly',
      account_id: e.account_id || '',
      notes: e.notes || '',
      url: e.url || '',
    });
    setEditingId(e.id);
    setShowModal(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      due_day_of_month: form.due_day_of_month ? parseInt(form.due_day_of_month) : null,
      account_id: form.account_id || null,
      category_id: form.category_id || null,
      url: form.url || null,
    };
    try {
      if (editingId) {
        await axios.put(`/api/expenses/${editingId}`, payload);
      } else {
        await axios.post('/api/expenses', payload);
      }
      resetForm();
      setShowModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/expenses/categories', catForm);
      setCatForm({ name: '', color: '#6366f1', icon: 'folder' });
      setShowCatModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExpenseItem = async (id: string) => {
    try {
      await axios.delete(`/api/expenses/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const updateExpenseItem = async (id: string, key: string, val: any) => {
    try {
      await axios.put(`/api/expenses/${id}`, { [key]: val });
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const totalMonthly = expenses
    .filter((e) => e.is_recurring)
    .reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = categories
    .map((c) => ({
      name: c.name,
      color: c.color,
      icon: c.icon,
      value: expenses
        .filter((e) => e.category_id === c.id)
        .reduce((s, e) => s + Number(e.amount), 0),
      count: expenses.filter((e) => e.category_id === c.id).length,
    }))
    .filter((c) => c.value > 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Expenses</h2>
        <p>Track your monthly recurring and one-time expenses</p>
      </div>

      <div className="expense-top-grid section">
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                bar_chart
              </span>{' '}
              Expense Breakdown
            </h3>
          </div>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  label={({ name, value }) => `${name}: ${fmt(value)}`}
                  labelLine={false}
                >
                  {byCategory.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmt(Number(v))}
                  contentStyle={{
                    background: '#141414',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 30 }}>
              <p>Add expenses to see breakdown</p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="stat-card stat-red">
            <div className="stat-label">Total Monthly</div>
            <div className="stat-value">{fmt(totalMonthly)}</div>
            <div className="stat-sub">
              {expenses.filter((e) => e.is_recurring).length} recurring expenses
            </div>
          </div>
          <div className="stat-card stat-amber">
            <div className="stat-label">Categories</div>
            <div className="stat-value">{categories.length}</div>
            <button
              className="btn btn-secondary btn-small"
              style={{ marginTop: 8 }}
              onClick={() => setShowCatModal(true)}
            >
              + Add Category
            </button>
          </div>
        </div>
      </div>

      <div className="card section">
        <div className="card-header">
          <h3>All Expenses</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ExcelUpload
              templateName="expenses_template.xlsx"
              templateColumns={[
                { header: 'Name', example: 'Rent' },
                { header: 'Category', example: 'Housing' },
                { header: 'Amount', example: 1500.0 },
                { header: 'Due Day', example: 1 },
                { header: 'Recurring', example: 'yes' },
                { header: 'Frequency', example: 'monthly' },
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
                  const amount = parseFloat(r['Amount']);
                  if (isNaN(amount)) {
                    errors.push(`Row ${i + 2}: Invalid Amount`);
                    continue;
                  }
                  const catName = String(r['Category'] || '').trim();
                  const cat = categories.find(
                    (c) => c.name.toLowerCase() === catName.toLowerCase()
                  );
                  if (!cat && catName) {
                    errors.push(`Row ${i + 2}: Category "${catName}" not found — create it first`);
                    continue;
                  }
                  const isRec = String(r['Recurring'] || 'yes').trim().toLowerCase();
                  try {
                    await axios.post('/api/expenses', {
                      name,
                      category_id: cat?.id || null,
                      amount,
                      due_day_of_month: parseInt(r['Due Day']) || null,
                      is_recurring: isRec !== 'no' && isRec !== 'false' && isRec !== '0',
                      frequency: String(r['Frequency'] || 'monthly').trim().toLowerCase(),
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
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isOpen={searchOpen}
              setIsOpen={setSearchOpen}
            />
            <button className="btn btn-primary" onClick={openCreate}>
              + Add Expense
            </button>
          </div>
        </div>
        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                receipt_long
              </span>
            </div>
            <h3>No expenses yet</h3>
            <p>Start adding your monthly bills and expenses.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Expense"
                  sortKey="name"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <TableHeader
                  label="Category"
                  sortKey="category"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <TableHeader
                  label="Amount"
                  sortKey="amount"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Account"
                  sortKey="account"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <TableHeader
                  label="Due Day"
                  sortKey="due_day_of_month"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <TableHeader
                  label="Type"
                  sortKey="is_recurring"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedExpenses.map((e) => {
                const cat = categories.find((c) => c.id === e.category_id);
                const acct = accounts.find((a) => a.id === e.account_id);
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {e.name}
                        {e.url && (
                          <a
                            href={e.url}
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
                    <td>
                      {cat && (
                        <span
                          className="badge"
                          style={{
                            background: cat.color + '20',
                            color: cat.color,
                            display: 'inline-flex',
                            alignItems: 'center',
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
                    </td>
                    <td className="amount">
                      <InlineEdit
                        value={e.amount}
                        onSave={async (v) => {
                          await updateExpenseItem(e.id, 'amount', v);
                        }}
                      />
                    </td>
                    <td>
                      {acct ? (
                        <span
                          className="badge badge-blue"
                          style={{ display: 'inline-flex', alignItems: 'center' }}
                        >
                          <span
                            className="material-symbols-rounded"
                            style={{ fontSize: '1em', marginRight: 4 }}
                          >
                            account_balance
                          </span>{' '}
                          {acct.name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>
                    <td>{e.due_day_of_month ? `${e.due_day_of_month}th` : '—'}</td>
                    <td>
                      {e.is_recurring ? (
                        <span className="badge badge-blue">Recurring</span>
                      ) : (
                        <span className="badge badge-amber">One-time</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-small" onClick={() => openEdit(e)}>
                          Edit
                        </button>
                        <DeleteButton onDelete={() => deleteExpenseItem(e.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Expense Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <h3>{editingId ? 'Edit Expense' : 'Add Expense'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rent, Netflix"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.due_day_of_month}
                    onChange={(e) => setForm({ ...form, due_day_of_month: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Deducted From Account</label>
                <select
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                >
                  <option value="">No specific account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.account_type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Website Direct Link</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="e.g. https://www.netflix.com/your-account"
                />
              </div>
              <div
                className="form-group"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={form.is_recurring}
                  onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                  style={{ width: 'auto' }}
                />
                <label
                  htmlFor="isRecurring"
                  style={{ margin: 0, textTransform: 'none', fontSize: '0.9rem' }}
                >
                  Recurring expense
                </label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Save Changes' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <h3>Add Category</h3>
            <form onSubmit={handleCatSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={catForm.color}
                    onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Icon (Material Symbol name)</label>
                  <input
                    value={catForm.icon}
                    onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                    placeholder="e.g. folder, house, school"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCatModal(false)}
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
    </div>
  );
}