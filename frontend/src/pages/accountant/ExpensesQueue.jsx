import { useState, useEffect, useCallback } from 'react';
import { Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const EXPENSE_CATEGORY_LABELS = { vendor: 'Vendor', govt_fee: 'Govt Fee', service_charge: 'Service Charge', gst: 'GST', transportation: 'Transportation', miscellaneous: 'Miscellaneous', other: 'Other' };
const EXPENSE_CATEGORY_COLORS = { vendor: '#6366f1', govt_fee: '#0891b2', service_charge: '#7c3aed', gst: '#d97706', transportation: '#059669', miscellaneous: '#64748b', other: '#94a3b8' };

export default function ExpensesQueue() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState(null); // { orderId, expenseId, amount }
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/service-orders?limit=200');
            setOrders(res.data.data || []);
        } catch {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const allExpenses = orders.flatMap(order =>
        (order.expenses || []).map(e => ({ ...e, order }))
    );
    const pending = allExpenses.filter(e => e.status === 'pending');
    const approved = allExpenses.filter(e => e.status === 'approved');
    const pendingValue = pending.reduce((s, e) => s + e.amount, 0);

    const handleApprove = async (orderId, expenseId) => {
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${orderId}/expenses/${expenseId}/approve`);
            toast.success('Expense approved ✓');
            loadOrders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to approve');
        } finally { setProcessing(false); }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${rejectModal.orderId}/expenses/${rejectModal.expenseId}/reject`, { rejection_reason: rejectReason });
            toast.success('Expense rejected');
            setRejectModal(null);
            setRejectReason('');
            loadOrders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to reject');
        } finally { setProcessing(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 1100, paddingBottom: 40 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Expenses Queue</h1>
            <p style={{ color: 'var(--ink-3)', marginBottom: 24, fontSize: 14 }}>Review and approve or reject pending expense submissions from the operations team.</p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Pending Approvals', value: pending.length, icon: Clock, color: '#f59e0b' },
                    { label: 'Pending budget', value: fmt(pendingValue), icon: DollarSign, color: '#6366f1' },
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

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#f59e0b" />
                    <h2 style={{ fontSize: 15, fontWeight: 600 }}>Pending Expenses ({pending.length})</h2>
                </div>
                {pending.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
                        <CheckCircle size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
                        <p style={{ fontWeight: 500 }}>All caught up! No pending expenses.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                    {['Client / Order', 'Category', 'Amount', 'Description', 'Submitted By', 'Date', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((e) => (
                                    <tr key={e._id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{e.order.client?.company_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.order.order_id || '—'}</div>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: `${EXPENSE_CATEGORY_COLORS[e.category]}20`, color: EXPENSE_CATEGORY_COLORS[e.category] }}>
                                                {EXPENSE_CATEGORY_LABELS[e.category] || e.category}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 15, color: '#c62828' }}>{fmt(e.amount)}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--ink-2)' }}>
                                            {e.description || '—'}
                                            {e.notes && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>Note: {e.notes}</div>}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: 13 }}>{e.recorded_by?.name || '—'}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ fontSize: 12, padding: '5px 14px', background: '#10b981', borderColor: '#10b981', gap: 4 }}
                                                    disabled={processing}
                                                    onClick={() => handleApprove(e.order._id, e._id)}
                                                >✓ Approve</button>
                                                <button
                                                    className="btn"
                                                    style={{ fontSize: 12, padding: '5px 14px', color: '#ef4444', borderColor: '#ef4444' }}
                                                    disabled={processing}
                                                    onClick={() => setRejectModal({ orderId: e.order._id, expenseId: e._id, amount: e.amount })}
                                                >✕ Reject</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Approved Expenses History */}
            {approved.length > 0 && (
                <div className="card" style={{ padding: 0, marginTop: 24 }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={16} color="#10b981" />
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Approved Expenses History ({approved.length})</h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                    {['Client / Order', 'Category', 'Amount', 'Description', 'Approved By', 'Date'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {approved.map((e) => (
                                    <tr key={e._id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{e.order.client?.company_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.order.order_id || '—'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: `${EXPENSE_CATEGORY_COLORS[e.category]}20`, color: EXPENSE_CATEGORY_COLORS[e.category] }}>
                                                {EXPENSE_CATEGORY_LABELS[e.category] || e.category}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#c62828' }}>{fmt(e.amount)}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-2)' }}>{e.description || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{e.approved_by?.name || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(e.approved_at || e.date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 420, padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <XCircle size={22} color="#ef4444" />
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Reject Expense — {fmt(rejectModal.amount)}</h3>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason for Rejection *</label>
                        <textarea
                            rows={3}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', resize: 'none', fontSize: 13 }}
                            placeholder="e.g. Unverified vendor, excess budget query..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button className="btn" onClick={() => { setRejectModal(null); setRejectReason(''); }}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                onClick={handleReject}
                                disabled={processing}
                            >{processing ? 'Rejecting...' : 'Confirm Reject'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
