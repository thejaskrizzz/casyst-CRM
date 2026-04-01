import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, AlertTriangle, FileDown, Building2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { generateInvoice } from '../../utils/generateInvoice';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusBadge = (status) => {
    const map = {
        pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
        approved: { label: 'Approved', color: '#10b981', bg: '#d1fae5' },
        rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
    };
    const s = map[status] || map.pending;
    return (
        <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
            {s.label}
        </span>
    );
};

const EXPENSE_CATEGORY_LABELS = { vendor: 'Vendor', govt_fee: 'Govt Fee', service_charge: 'Service Charge', gst: 'GST', transportation: 'Transportation', miscellaneous: 'Miscellaneous', other: 'Other' };
const EXPENSE_CATEGORY_COLORS = { vendor: '#6366f1', govt_fee: '#0891b2', service_charge: '#7c3aed', gst: '#d97706', transportation: '#059669', miscellaneous: '#64748b', other: '#94a3b8' };

export default function AccountantDashboard() {
    const [orders, setOrders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectExpenseModal, setRejectExpenseModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [settings, setSettings] = useState(null);
    const [detailModal, setDetailModal] = useState(null);

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            const [ordersRes, settingsRes, branchesRes] = await Promise.all([
                api.get('/service-orders?limit=200'),
                api.get('/settings'),
                api.get('/branches'),
            ]);
            setOrders(ordersRes.data.data || []);
            setSettings(settingsRes.data.data);
            setBranches((branchesRes.data.data || []).filter(b => b.is_active));
        } catch {
            toast.error('Failed to load service orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // Filter orders by selected branch
    const filteredOrders = selectedBranch === 'all'
        ? orders
        : orders.filter(o => {
            const branchId = o.branch?._id || o.branch;
            return branchId === selectedBranch;
        });

    // Flatten all payments with order context
    const allPayments = filteredOrders.flatMap(order =>
        (order.payments || []).map(p => ({ ...p, order }))
    );
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    const pendingValue = pendingPayments.reduce((s, p) => s + p.amount, 0);

    // Flatten all expenses with order context
    const allExpenses = filteredOrders.flatMap(order =>
        (order.expenses || []).map(e => ({ ...e, order }))
    );
    const pendingExpenses = allExpenses.filter(e => e.status === 'pending');
    const pendingExpenseValue = pendingExpenses.reduce((s, e) => s + e.amount, 0);

    const handleApprovePayment = async (orderId, paymentId) => {
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${orderId}/payments/${paymentId}/approve`);
            toast.success('Payment approved ✓');
            loadOrders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to approve payment');
        } finally { setProcessing(false); }
    };

    const handleRejectPayment = async () => {
        if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${rejectModal.orderId}/payments/${rejectModal.paymentId}/reject`, { rejection_reason: rejectReason });
            toast.success('Payment rejected');
            setRejectModal(null);
            setRejectReason('');
            loadOrders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to reject payment');
        } finally { setProcessing(false); }
    };

    const handleApproveExpense = async (orderId, expenseId) => {
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${orderId}/expenses/${expenseId}/approve`);
            toast.success('Expense approved ✓');
            loadOrders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to approve expense');
        } finally { setProcessing(false); }
    };

    const handleRejectExpense = async () => {
        if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${rejectExpenseModal.orderId}/expenses/${rejectExpenseModal.expenseId}/reject`, { rejection_reason: rejectReason });
            toast.success('Expense rejected');
            setRejectExpenseModal(null);
            setRejectReason('');
            loadOrders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to reject expense');
        } finally { setProcessing(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 1100, paddingBottom: 40 }}>
            {/* Header + Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Accountant Dashboard</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={16} style={{ color: 'var(--ink-3)' }} />
                    <select
                        className="form-select"
                        style={{ minWidth: 200, fontSize: 13 }}
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                    >
                        <option value="all">All Companies</option>
                        {branches.map(b => (
                            <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                    { label: 'Pending Payments', value: pendingPayments.length, icon: Clock, color: '#f59e0b' },
                    { label: 'Pending Value', value: fmt(pendingValue), icon: DollarSign, color: '#6366f1' },
                    { label: 'Pending Expenses', value: pendingExpenses.length, icon: Clock, color: '#d97706' },
                    { label: 'Expenses Value', value: fmt(pendingExpenseValue), icon: DollarSign, color: '#c62828' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={22} color={color} />
                        </div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pending Payments Queue */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="#f59e0b" />
                    <h2 style={{ fontSize: 16, fontWeight: 600 }}>Pending Payments Queue ({pendingPayments.length})</h2>
                </div>
                {pendingPayments.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
                        <CheckCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p>All payments reviewed. Nothing pending!</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                    {['Order / Client', 'Amount', 'Method', 'Ref No.', 'Added By', 'Date', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pendingPayments.map((p) => (
                                    <tr key={p._id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => setDetailModal(p.order)}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', textDecoration: 'underline dotted' }}>{p.order.client?.company_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.order.order_id || '—'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#6366f1' }}>{fmt(p.amount)}</td>
                                        <td style={{ padding: '12px 16px', textTransform: 'capitalize', fontSize: 13 }}>{p.method?.replace('_', ' ')}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-3)' }}>{p.reference_no || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.recorded_by?.name || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{fmtDate(p.paid_at)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', background: '#10b981', borderColor: '#10b981' }} onClick={() => handleApprovePayment(p.order._id, p._id)} disabled={processing}>Approve</button>
                                                <button className="btn" style={{ fontSize: 11, padding: '4px 10px', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setRejectModal({ orderId: p.order._id, paymentId: p._id, amount: p.amount })} disabled={processing}>Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pending Expenses Queue */}
            <div className="card" style={{ padding: 0, marginTop: 24 }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="#d97706" />
                    <h2 style={{ fontSize: 16, fontWeight: 600 }}>Pending Expenses Queue ({pendingExpenses.length})</h2>
                </div>
                {pendingExpenses.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
                        <CheckCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p>All expenses are processed.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                    {['Order / Client', 'Category', 'Amount', 'Description', 'By', 'Date', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pendingExpenses.map((e) => (
                                    <tr key={e._id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => setDetailModal(e.order)}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', textDecoration: 'underline dotted' }}>{e.order.client?.company_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.order.order_id || '—'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: `${EXPENSE_CATEGORY_COLORS[e.category]}20`, color: EXPENSE_CATEGORY_COLORS[e.category] }}>
                                                {EXPENSE_CATEGORY_LABELS[e.category] || e.category}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#c62828' }}>{fmt(e.amount)}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-2)' }}>{e.description || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{e.recorded_by?.name || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{fmtDate(e.date)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px', background: '#10b981', borderColor: '#10b981' }} onClick={() => handleApproveExpense(e.order._id, e._id)} disabled={processing}>Approve</button>
                                                <button className="btn" style={{ fontSize: 11, padding: '4px 10px', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => setRejectExpenseModal({ orderId: e.order._id, expenseId: e._id, amount: e.amount })} disabled={processing}>Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* All Payments History */}
            <div className="card" style={{ padding: 0, marginTop: 24 }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600 }}>All Payments History</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg)' }}>
                                {['Client', 'Amount', 'Status', 'Method', 'Added By', 'Reviewed By', 'Date', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {allPayments.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>No payments recorded yet</td></tr>
                            ) : allPayments.map(p => (
                                <tr key={p._id} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.order.client?.company_name || '—'}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{fmt(p.amount)}</td>
                                    <td style={{ padding: '12px 16px' }}>{statusBadge(p.status)}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, textTransform: 'capitalize' }}>{p.method?.replace('_', ' ')}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.recorded_by?.name || '—'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                                        {p.approved_by?.name || '—'}
                                        {p.rejection_reason && <div style={{ fontSize: 11, color: '#ef4444' }}>"{p.rejection_reason}"</div>}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 13 }}>{fmtDate(p.paid_at)}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {p.status === 'approved' && (
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, gap: 4, whiteSpace: 'nowrap' }} onClick={() => generateInvoice(p, p.order, settings)} title="Download Invoice">
                                                <FileDown size={13} /> Invoice
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Client Detail Modal */}
            {detailModal && (() => {
                const o = detailModal;
                const client = o.client || {};
                const pkg = o.package || {};
                const approvedPayments = (o.payments || []).filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0);
                const approvedExpenses = (o.expenses || []).filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
                const pendingPay = (o.payments || []).filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={() => setDetailModal(null)}>
                        <div className="card" style={{ width: '100%', maxWidth: 540, padding: 0, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700 }}>{client.company_name || '—'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Order: {o.order_id || '—'} · <span style={{ textTransform: 'capitalize' }}>{o.status}</span></div>
                                </div>
                                <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 20, lineHeight: 1 }}>✕</button>
                            </div>
                            <div style={{ padding: '20px 24px' }}>
                                {/* Client Info */}
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Client Info</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginBottom: 20 }}>
                                    {[
                                        ['Name', client.name || client.company_name || '—'],
                                        ['Email', client.email || '—'],
                                        ['Phone', client.phone || '—'],
                                        ['GST No.', client.gst_number || '—'],
                                        ['City', client.city || '—'],
                                        ['State', client.state || '—'],
                                    ].map(([label, val]) => (
                                        <div key={label}>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 2 }}>{label}</div>
                                            <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-word' }}>{val}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Package Info */}
                                {(pkg.name || o.package_name) && (
                                    <>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Package</div>
                                        <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{pkg.name || o.package_name}</div>
                                            {pkg.description && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>{pkg.description}</div>}
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                {pkg.price != null && <span style={{ fontSize: 12 }}>Price: <strong>{fmt(pkg.price)}</strong></span>}
                                                {pkg.estimated_days && <span style={{ fontSize: 12 }}>Est. Days: <strong>{pkg.estimated_days}</strong></span>}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Financial Summary */}
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Financial Summary</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                    {[
                                        { label: 'Project Value', val: fmt(o.project_value || 0), color: '#6366f1' },
                                        { label: 'Collected', val: fmt(approvedPayments), color: '#10b981' },
                                        { label: 'Pending Pay', val: fmt(pendingPay), color: '#f59e0b' },
                                        { label: 'Expenses', val: fmt(approvedExpenses), color: '#c62828' },
                                        { label: 'Balance', val: fmt((o.project_value || 0) - approvedPayments), color: '#0891b2' },
                                    ].map(({ label, val, color }) => (
                                        <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>{label}</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color }}>{val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Reject Payment Modal */}
            {rejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 420, padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <XCircle size={22} color="#ef4444" />
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Reject Payment — {fmt(rejectModal.amount)}</h3>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason for Rejection *</label>
                        <textarea rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', resize: 'none', fontSize: 13 }} placeholder="e.g. Incorrect amount" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button className="btn" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</button>
                            <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleRejectPayment} disabled={processing}>Confirm Reject</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Expense Modal */}
            {rejectExpenseModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 420, padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <XCircle size={22} color="#ef4444" />
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Reject Expense — {fmt(rejectExpenseModal.amount)}</h3>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason for Rejection *</label>
                        <textarea rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', resize: 'none', fontSize: 13 }} placeholder="e.g. Excess budget" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button className="btn" onClick={() => { setRejectExpenseModal(null); setRejectReason(''); }}>Cancel</button>
                            <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleRejectExpense} disabled={processing}>Confirm Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
