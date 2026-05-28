'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import DeleteButton from '../components/DeleteButton';
import useTable from '../hooks/useTable';
import TableSearch from '../components/TableSearch';
import TableHeader from '../components/TableHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

interface Want {
  id: string;
  name: string;
  estimated_cost: number;
  priority: 'low' | 'medium' | 'high' | 'dream';
  notes: string | null;
  url: string | null;
  created_at: string;
  purchased_at: string | null;
}

interface WantAnalysis {
  want: Want;
  monthly_discretionary: number;
  cost_as_percent_of_income: number;
  months_to_save: number;
  recommendation: string;
  best_purchase_timing: string;
}

export default function Wants() {
  const [wants, setWants] = useState<Want[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    estimated_cost: '',
    priority: 'medium',
    notes: '',
    url: '',
  });
  const [analysis, setAnalysis] = useState<WantAnalysis | null>(null);

  const load = () => {
    axios
      .get('/api/wants')
      .then((r) => setWants(r.data))
      .catch(console.error);
  };

  useEffect(() => {
    load();
  }, []);

  const unpurchased = wants.filter((w) => !w.purchased_at);
  const purchased = wants.filter((w) => w.purchased_at);

  // Wishlist table hook
  const wishlistTable = useTable<Want>(unpurchased, {
    searchKeys: ['name', 'priority', 'notes'],
    sortExtractors: {
      estimated_cost: (item) => item.estimated_cost,
      created_at: (item) => item.created_at,
    },
    defaultSort: { key: 'name', direction: 'asc' },
  });

  // Purchased table hook
  const purchasedTable = useTable<Want>(purchased, {
    searchKeys: ['name'],
    sortExtractors: {
      estimated_cost: (item) => item.estimated_cost,
      purchased_at: (item) => item.purchased_at ?? '',
    },
    defaultSort: { key: 'purchased_at', direction: 'desc' },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/wants', {
        ...form,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        url: form.url || null,
        notes: form.notes || null,
      });
      setForm({ name: '', estimated_cost: '', priority: 'medium', notes: '', url: '' });
      setShowModal(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async (id: string) => {
    try {
      const a = await axios.get(`/api/wants/${id}/analyze`).then((r) => r.data);
      setAnalysis(a);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchase = async (id: string) => {
    if (confirm('Mark as purchased?')) {
      try {
        await axios.put(`/api/wants/${id}/purchase`);
        load();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const deleteWantItem = async (id: string) => {
    try {
      await axios.delete(`/api/wants/${id}`);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const totalCost = unpurchased.reduce((s, w) => s + Number(w.estimated_cost), 0);

  const priorityConfig: Record<string, { label: string; class: string; icon: string }> = {
    dream: { label: 'Dream', class: 'badge-purple', icon: 'stars' },
    high: { label: 'High', class: 'badge-red', icon: 'circle' },
    medium: { label: 'Medium', class: 'badge-amber', icon: 'circle' },
    low: { label: 'Low', class: 'badge-green', icon: 'circle' },
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '1.2em', marginRight: 8 }}>
            star
          </span>{' '}
          Wants Wishlist
        </h2>
        <p>Track things you want to buy and get financial feasibility analysis</p>
      </div>

      <div className="card-grid-3 section">
        <div className="stat-card stat-purple">
          <div className="stat-label">Wishlist Items</div>
          <div className="stat-value">{unpurchased.length}</div>
        </div>
        <div className="stat-card stat-amber">
          <div className="stat-label">Total Cost</div>
          <div className="stat-value">{fmt(totalCost)}</div>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-label">Purchased</div>
          <div className="stat-value">{purchased.length}</div>
        </div>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="ai-summary section" style={{ borderColor: 'var(--accent-green)' }}>
          <h3
            style={{
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
              bar_chart
            </span>{' '}
            Analysis: {analysis.want.name}
          </h3>
          <div
            className="card-grid-3"
            style={{ marginBottom: 16 }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Monthly Discretionary
              </div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--accent-green)',
                }}
              >
                {fmt(analysis.monthly_discretionary)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>% of Income</div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--accent-amber)',
                }}
              >
                {analysis.cost_as_percent_of_income}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Months to Save</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                {analysis.months_to_save}
              </div>
            </div>
          </div>
          <p>{analysis.recommendation}</p>
          <p
            style={{
              color: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <span
              className="material-symbols-rounded"
              style={{ fontSize: '1em', marginRight: 4 }}
            >
              schedule
            </span>{' '}
            {analysis.best_purchase_timing}
          </p>
          <button
            className="btn btn-secondary btn-small"
            style={{ marginTop: 12 }}
            onClick={() => setAnalysis(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Wants List */}
      <div className="card section">
        <div className="card-header">
          <h3>Wishlist</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <TableSearch
              searchQuery={wishlistTable.searchQuery}
              setSearchQuery={wishlistTable.setSearchQuery}
              isOpen={wishlistTable.searchOpen}
              setIsOpen={wishlistTable.setSearchOpen}
            />
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + Add Want
            </button>
          </div>
        </div>

        {unpurchased.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-symbols-rounded" style={{ fontSize: 'inherit' }}>
                star
              </span>
            </div>
            <h3>No items on your wishlist</h3>
            <p>Add things you want to buy and get smart recommendations.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Item"
                  sortKey="name"
                  activeKey={wishlistTable.sortKey}
                  activeDirection={wishlistTable.sortDirection}
                  onClick={wishlistTable.requestSort}
                />
                <TableHeader
                  label="Cost"
                  sortKey="estimated_cost"
                  activeKey={wishlistTable.sortKey}
                  activeDirection={wishlistTable.sortDirection}
                  onClick={wishlistTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Priority"
                  sortKey="priority"
                  activeKey={wishlistTable.sortKey}
                  activeDirection={wishlistTable.sortDirection}
                  onClick={wishlistTable.requestSort}
                />
                <TableHeader
                  label="Added"
                  sortKey="created_at"
                  activeKey={wishlistTable.sortKey}
                  activeDirection={wishlistTable.sortDirection}
                  onClick={wishlistTable.requestSort}
                />
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {wishlistTable.data.map((w) => (
                <tr key={w.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    {w.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.notes}</div>}
                    {w.url && (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--accent-blue)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          marginTop: 4,
                        }}
                      >
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: '1.2em', marginRight: 2 }}
                        >
                          link
                        </span>{' '}
                        Link
                      </a>
                    )}
                  </td>
                  <td className="amount" style={{ color: 'var(--accent-amber)' }}>
                    {fmt(w.estimated_cost)}
                  </td>
                  <td>
                    <span
                      className={`badge ${priorityConfig[w.priority]?.class || 'badge-blue'}`}
                      style={{ display: 'inline-flex', alignItems: 'center' }}
                    >
                      {priorityConfig[w.priority]?.icon && (
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: '1em', marginRight: 4 }}
                        >
                          {priorityConfig[w.priority].icon}
                        </span>
                      )}
                      {priorityConfig[w.priority]?.label || w.priority}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {w.created_at?.substring(0, 10)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleAnalyze(w.id)}
                      >
                        Analyze
                      </button>
                      <button
                        className="btn btn-primary btn-small"
                        onClick={() => handlePurchase(w.id)}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: '1.2em', marginRight: 2 }}
                        >
                          check
                        </span>{' '}
                        Bought
                      </button>
                      <DeleteButton onDelete={() => deleteWantItem(w.id)} label="×" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Purchased */}
      {purchased.length > 0 && (
        <div className="card section">
          <div
            className="card-header"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h3 style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                check_circle
              </span>{' '}
              Purchased
            </h3>
            <TableSearch
              searchQuery={purchasedTable.searchQuery}
              setSearchQuery={purchasedTable.setSearchQuery}
              isOpen={purchasedTable.searchOpen}
              setIsOpen={purchasedTable.setSearchOpen}
            />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <TableHeader
                  label="Item"
                  sortKey="name"
                  activeKey={purchasedTable.sortKey}
                  activeDirection={purchasedTable.sortDirection}
                  onClick={purchasedTable.requestSort}
                />
                <TableHeader
                  label="Cost"
                  sortKey="estimated_cost"
                  activeKey={purchasedTable.sortKey}
                  activeDirection={purchasedTable.sortDirection}
                  onClick={purchasedTable.requestSort}
                  style={{ textAlign: 'right' }}
                />
                <TableHeader
                  label="Purchased"
                  sortKey="purchased_at"
                  activeKey={purchasedTable.sortKey}
                  activeDirection={purchasedTable.sortDirection}
                  onClick={purchasedTable.requestSort}
                />
              </tr>
            </thead>
            <tbody>
              {purchasedTable.data.map((w) => (
                <tr key={w.id}>
                  <td>{w.name}</td>
                  <td className="amount">{fmt(w.estimated_cost)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{w.purchased_at?.substring(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Want</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. MacBook Pro, PS5"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Estimated Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.estimated_cost}
                    onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="dream">Dream</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>URL (optional)</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
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
