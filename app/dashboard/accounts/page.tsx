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
    maximumFractionDigits: 2,
  }).format(n);

const fmtDate = (d: string | null) => {
  if (!d) return null;
  // Handle Z or parse offset
  const dateStr = d.endsWith('Z') ? d : d + 'Z';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (e) {
    return d;
  }
};

interface Account {
  id: string;
  name: string;
  account_type: 'checking' | 'savings' | 'investment';
  balance: number;
  notes: string | null;
  balance_updated_at: string | null;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', account_type: 'checking', balance: '', notes: '' });

  const load = () => {
    axios
      .get('/api/accounts')
      .then((r) => setAccounts(r.data))
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const {
    data: filteredAndSortedAccounts,
    sortKey,
    sortDirection,
    requestSort,
    searchQuery,
    setSearchQuery,
    searchOpen,
    setSearchOpen,
  } = useTable<Account>(accounts, {
    searchKeys: ['name', 'account_type', 'notes'],
    defaultSort: { key: 'name', direction: 'asc' },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/accounts', {
        ...form,
        balance: parseFloat(form.balance) || 0,
      });
      setForm({ name: '', account_type: 'checking', balance: '', notes: '' });
      setShowModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const updateAccountItem = async (id: string, payload: Partial<Account>) => {
    try {
      await axios.put(`/api/accounts/${id}`, payload);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAccountItem = async (id: string) => {
    try {
      await axios.delete(`/api/accounts/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const checkingTotal = accounts
    .filter((a) => a.account_type === 'checking')
    .reduce((s, a) => s + Number(a.balance), 0);
  const savingsTotal = accounts
    .filter((a) => a.account_type !== 'checking')
    .reduce((s, a) => s + Number(a.balance), 0);

  const typeIcons: Record<string, React.ReactNode> = {
    checking: (
      <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
        account_balance
      </span>
    ),
    savings: (
      <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
        savings
      </span>
    ),
    investment: (
      <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
        trending_up
      </span>
    ),
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Bank Accounts</h2>
        <p>Manage your accounts and track balances</p>
      </div>

      <div className="card-grid-3 section">
        <div className="stat-card stat-green">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value">{fmt(total)}</div>
          <div className="stat-sub">{accounts.length} accounts</div>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-label">Checking</div>
          <div className="stat-value">{fmt(checkingTotal)}</div>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-label">Savings & Investments</div>
          <div className="stat-value">{fmt(savingsTotal)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>All Accounts</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ExcelUpload
              templateName="accounts_template.xlsx"
              templateColumns={[
                { header: 'Name', example: 'Chase Checking' },
                { header: 'Type', example: 'checking' },
                { header: 'Balance', example: 1500.0 },
                { header: 'Notes', example: 'Primary account' },
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
                  const acctType = String(r['Type'] || 'checking').trim().toLowerCase();
                  if (!['checking', 'savings', 'investment'].includes(acctType)) {
                    errors.push(`Row ${i + 2}: Invalid Type "${acctType}"`);
                    continue;
                  }
                  try {
                    await axios.post('/api/accounts', {
                      name,
                      account_type: acctType,
                      balance: parseFloat(r['Balance']) || 0,
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
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + Add Account
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                account_balance
              </span>
            </div>
            <h3>No accounts yet</h3>
            <p>Add your bank accounts to start tracking your finances.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Add Your First Account
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Account"
                  sortKey="name"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <TableHeader
                  label="Type"
                  sortKey="account_type"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <TableHeader
                  label="Balance"
                  sortKey="balance"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Last Updated"
                  sortKey="balance_updated_at"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <TableHeader
                  label="Notes"
                  sortKey="notes"
                  activeKey={sortKey}
                  activeDirection={sortDirection}
                  onClick={requestSort}
                />
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedAccounts.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>
                    <span
                      style={{
                        marginRight: 6,
                        verticalAlign: 'middle',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      {typeIcons[a.account_type] || (
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: 'inherit' }}
                        >
                          account_balance
                        </span>
                      )}
                    </span>{' '}
                    <InlineEdit
                      value={a.name}
                      type="text"
                      format="raw"
                      onSave={async (val) => {
                        await updateAccountItem(a.id, { name: String(val) });
                      }}
                    />
                  </td>
                  <td>
                    <span
                      className={`badge badge-${
                        a.account_type === 'checking'
                          ? 'blue'
                          : a.account_type === 'savings'
                          ? 'green'
                          : 'purple'
                      }`}
                    >
                      {a.account_type}
                    </span>
                  </td>
                  <td className="amount">
                    <InlineEdit
                      value={a.balance}
                      onSave={async (val) => {
                        await updateAccountItem(a.id, { balance: Number(val) });
                      }}
                    />
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {fmtDate(a.balance_updated_at) || '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <InlineEdit
                      value={a.notes || ''}
                      type="text"
                      format="raw"
                      onSave={async (val) => {
                        await updateAccountItem(a.id, { notes: String(val) || null });
                      }}
                    />
                  </td>
                  <td>
                    <DeleteButton onDelete={() => deleteAccountItem(a.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Account</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Account Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chase Checking"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={form.account_type}
                    onChange={(e) => setForm({ ...form, account_type: e.target.value })}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="investment">Investment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Current Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any notes about this account"
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
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
