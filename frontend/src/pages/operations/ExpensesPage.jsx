import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Banknote, TrendingDown, Layers, ExternalLink } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CATEGORY_LABELS = {
    vendor: 'Vendor', govt_fee: 'Govt Fee', service_charge: 'Service Charge',
    gst: 'GST', transportation: 'Transportation', miscellaneous: 'Miscellaneous', other: 'Other',
};
const CATEGORY_COLORS = {
    vendor: '#6366f1', govt_fee: '#0891b2', service_charge: '#7c3aed',
    gst: '#d97706', transportation: '#059669', miscellaneous: '#64748b', other: '#94a3b8',
};
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ExpensesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const basePath = user.role === 'operations' ? '/operations' : user.role === 'manager' ? '/manager' : '/admin';

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterOrder, setFilterOrder] = useState('');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/service-orders?limit=500');
            setOrders(data.data || []);
        } catch {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Flatten all expenses with order context
    const allExpenses = orders.flatMap(order =>
        (order.expenses || []).map(e => ({ ...e, order }))
    );

    // Filter
    const filtered = allExpenses.filter(e => {
        if (filterCategory && e.category !== filterCategory) return false;
        if (filterOrder && e.order._id !== filterOrder) return false;
        if (search) {
            const q = search.toLowerCase();
            const matches = (e.description || '').toLowerCase().includes(q)
                || (e.order.client?.company_name || '').toLowerCase().includes(q)
                || (CATEGORY_LABELS[e.category] || '').toLowerCase().includes(q);
            if (!matches) return false;
        }
        return true;
    });

    // Totals
    const totalAll = allExpenses.reduce((s, e) => s + e.amount, 0);
    const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
    const approvedFunds = orders.reduce((s, o) =>
        s + (o.payments || []).filter(p => p.status === 'approved').reduce((ss, p) => ss + p.amount, 0), 0);

    // Category breakdown
    const byCategory = ALL_CATEGORIES.map(c => ({
        cat: c,
        total: allExpenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0),
        count: allExpenses.filter(e => e.category === c).length,
    })).filter(x => x.count > 0).sort((a, b) => b.total - a.total);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 1140, paddingBottom: 40 }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>Expenses</h1>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>All operational expenses recorded across service orders</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Expenses', value: fmt(totalAll), icon: TrendingDown, color: '#ef4444' },
                    { label: 'Approved Funds', value: fmt(approvedFunds), icon: Banknote, color: '#10b981' },
                    { label: 'Net Available', value: fmt(approvedFunds - totalAll), icon: Layers, color: approvedFunds - totalAll < 0 ? '#ef4444' : '#6366f1' },
                    { label: 'No. of Entries', value: allExpenses.length, icon: Layers, color: '#f59e0b' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={20} color={color} />
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
                {/* Left — Category Breakdown */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>By Category</div>
                    <div style={{ padding: '10px 0' }}>
                        {byCategory.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>No expenses yet</div>
                        ) : byCategory.map(({ cat, total, count }) => (
                            <div
                                key={cat}
                                onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', cursor: 'pointer', background: filterCategory === cat ? `${CATEGORY_COLORS[cat]}12` : 'transparent', transition: 'background 0.15s' }}
                            >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: CATEGORY_COLORS[cat] }}>{CATEGORY_LABELS[cat]}</span>
                                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{count}×</span>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{fmt(total)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right — Expenses Table */}
                <div className="card" style={{ padding: 0 }}>
                    {/* Filters */}
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            style={{ flex: 1, minWidth: 160, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                            placeholder="Search by client or description…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <select
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                        </select>
                        <select
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13 }}
                            value={filterOrder}
                            onChange={e => setFilterOrder(e.target.value)}
                        >
                            <option value="">All Orders</option>
                            {orders.filter(o => (o.expenses || []).length > 0).map(o => (
                                <option key={o._id} value={o._id}>{o.client?.company_name || o._id}</option>
                            ))}
                        </select>
                    </div>

                    {filtered.length === 0 ? (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ink-3)' }}>
                            <Banknote size={36} style={{ opacity: 0.2, marginBottom: 10, display: 'block', margin: '0 auto 12px' }} />
                            <p style={{ fontWeight: 500 }}>No expenses found</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg)' }}>
                                            {['Client / Order', 'Category', 'Description', 'Amount', 'Date', 'By', 'Link'].map(h => (
                                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((e) => (
                                            <tr key={e._id} style={{ borderTop: '1px solid var(--border)' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.order.client?.company_name || '—'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.order.package?.name || '—'}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 6, fontWeight: 700, background: `${CATEGORY_COLORS[e.category]}18`, color: CATEGORY_COLORS[e.category] }}>
                                                        {CATEGORY_LABELS[e.category] || e.category}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ fontSize: 13 }}>{e.description || '—'}</div>
                                                    {e.notes && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>{e.notes}</div>}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, color: '#ef4444', whiteSpace: 'nowrap' }}>{fmt(e.amount)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                                                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-3)' }}>{e.recorded_by?.name || '—'}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <button
                                                        className="icon-btn"
                                                        title="Go to order"
                                                        onClick={() => navigate(`${basePath}/service-orders/${e.order._id}`)}
                                                    >
                                                        <ExternalLink size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Footer total */}
                            <div style={{ padding: '12px 18px', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 20, fontSize: 13, fontWeight: 700 }}>
                                {(filterCategory || filterOrder || search) && (
                                    <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>Filtered: <strong style={{ color: '#ef4444' }}>{fmt(totalFiltered)}</strong></span>
                                )}
                                <span>Total: <span style={{ color: '#ef4444' }}>{fmt(totalAll)}</span></span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
