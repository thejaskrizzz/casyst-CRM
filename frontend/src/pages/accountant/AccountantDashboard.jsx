import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, TrendingUp, AlertTriangle, FileDown } from 'lucide-react';
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

export default function AccountantDashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState(null); // { orderId, paymentId, amount }
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [settings, setSettings] = useState(null);

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            const [ordersRes, settingsRes] = await Promise.all([
                api.get('/service-orders?limit=200'),
                api.get('/settings'),
            ]);
            setOrders(ordersRes.data.data || []);
            setSettings(settingsRes.data.data);
        } catch {
            toast.error('Failed to load service orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // Flatten all payments with order context
    const allPayments = orders.flatMap(order =>
        (order.payments || []).map(p => ({ ...p, order }))
    );
    const pending = allPayments.filter(p => p.status === 'pending');
    const approvedToday = allPayments.filter(p => p.status === 'approved' && new Date(p.approved_at).toDateString() === new Date().toDateString());
    const pendingValue = pending.reduce((s, p) => s + p.amount, 0);

    const handleApprove = async (orderId, paymentId) => {
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${orderId}/payments/${paymentId}/approve`);
            toast.success('Payment approved');
            loadOrders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to approve');
        } finally { setProcessing(false); }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${rejectModal.orderId}/payments/${rejectModal.paymentId}/reject`, { rejection_reason: rejectReason });
            toast.success('Payment rejected');
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
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Accountant Dashboard</h1>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                    { label: 'Pending Approvals', value: pending.length, icon: Clock, color: '#f59e0b' },
                    { label: 'Pending Value', value: fmt(pendingValue), icon: DollarSign, color: '#6366f1' },
                    { label: 'Approved Today', value: approvedToday.length, icon: CheckCircle, color: '#10b981' },
                    { label: 'Total Payments', value: allPayments.length, icon: TrendingUp, color: '#3b82f6' },
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
                    <h2 style={{ fontSize: 16, fontWeight: 600 }}>Pending Payments Queue ({pending.length})</h2>
                </div>
                {pending.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
                        <CheckCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p>All payments have been reviewed. Nothing pending!</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                    {['Order / Client', 'Amount', 'Method', 'Ref No.', 'Added By', 'Date', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((p) => (
                                    <tr key={p._id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.order.client?.company_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.order.package?.name || '—'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#6366f1' }}>{fmt(p.amount)}</td>
                                        <td style={{ padding: '12px 16px', textTransform: 'capitalize', fontSize: 13 }}>{p.method?.replace('_', ' ')}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-3)' }}>{p.reference_no || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.recorded_by?.name || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(p.paid_at)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ fontSize: 12, padding: '5px 14px', background: '#10b981', borderColor: '#10b981' }}
                                                    disabled={processing}
                                                    onClick={() => handleApprove(p.order._id, p._id)}
                                                >✓ Approve</button>
                                                <button
                                                    className="btn"
                                                    style={{ fontSize: 12, padding: '5px 14px', color: '#ef4444', borderColor: '#ef4444' }}
                                                    disabled={processing}
                                                    onClick={() => setRejectModal({ orderId: p.order._id, paymentId: p._id, amount: p.amount })}
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
                                    <td style={{ padding: '12px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(p.paid_at)}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {p.status === 'approved' && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ fontSize: 11, gap: 4, whiteSpace: 'nowrap' }}
                                                onClick={() => generateInvoice(p, p.order, settings)}
                                                title="Download Invoice"
                                            >
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

            {/* Reject Modal */}
            {rejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 420, padding: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <XCircle size={22} color="#ef4444" />
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Reject Payment — {fmt(rejectModal.amount)}</h3>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason for Rejection *</label>
                        <textarea
                            rows={3}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', resize: 'none', fontSize: 13 }}
                            placeholder="e.g. Incorrect amount, missing reference number..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
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
