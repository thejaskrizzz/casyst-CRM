import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, DollarSign, FileDown } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { generateInvoice } from '../../utils/generateInvoice';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function PaymentsQueue() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState(null);
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
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const allPayments = orders.flatMap(order =>
        (order.payments || []).map(p => ({ ...p, order }))
    );
    const pending = allPayments.filter(p => p.status === 'pending');
    const approved = allPayments.filter(p => p.status === 'approved');
    const pendingValue = pending.reduce((s, p) => s + p.amount, 0);

    const handleApprove = async (orderId, paymentId) => {
        setProcessing(true);
        try {
            await api.patch(`/service-orders/${orderId}/payments/${paymentId}/approve`);
            toast.success('Payment approved ✓');
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
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Payments Queue</h1>
            <p style={{ color: 'var(--ink-3)', marginBottom: 24, fontSize: 14 }}>Review and approve or reject pending payment submissions from the sales team.</p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Pending Approvals', value: pending.length, icon: Clock, color: '#f59e0b' },
                    { label: 'Pending Value', value: fmt(pendingValue), icon: DollarSign, color: '#6366f1' },
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
                    <h2 style={{ fontSize: 15, fontWeight: 600 }}>Pending Payments ({pending.length})</h2>
                </div>
                {pending.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
                        <CheckCircle size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
                        <p style={{ fontWeight: 500 }}>All caught up! No pending payments.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                    {['Client / Package', 'Amount', 'Method', 'Reference', 'Submitted By', 'Date', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map((p) => (
                                    <tr key={p._id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.order.client?.company_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.order.package?.name || '—'}</div>
                                        </td>
                                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 15, color: '#6366f1' }}>{fmt(p.amount)}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13, textTransform: 'capitalize' }}>{p.method?.replace('_', ' ')}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--ink-3)', fontFamily: 'monospace' }}>{p.reference_no || '—'}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 13 }}>{p.recorded_by?.name || '—'}</td>
                                        <td style={{ padding: '14px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(p.paid_at)}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ fontSize: 12, padding: '5px 14px', background: '#10b981', borderColor: '#10b981', gap: 4 }}
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

            {/* Approved Payments — Invoice Download */}
            {approved.length > 0 && (
                <div className="card" style={{ padding: 0, marginTop: 24 }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={16} color="#10b981" />
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Approved Payments — Download Invoices ({approved.length})</h2>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                    {['Client / Package', 'Amount', 'Method', 'Reference', 'Approved By', 'Date', 'Invoice'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {approved.map((p) => (
                                    <tr key={p._id} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.order.client?.company_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.order.package?.name || '—'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>{fmt(p.amount)}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, textTransform: 'capitalize' }}>{p.method?.replace('_', ' ')}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-3)', fontFamily: 'monospace' }}>{p.reference_no || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.approved_by?.name || '—'}</td>
                                        <td style={{ padding: '12px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(p.approved_at || p.paid_at)}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ fontSize: 12, padding: '5px 14px', gap: 5 }}
                                                onClick={() => generateInvoice(p, p.order, settings)}
                                            >
                                                <FileDown size={13} /> Download
                                            </button>
                                        </td>
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
                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Reject Payment — {fmt(rejectModal.amount)}</h3>
                        </div>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Reason for Rejection *</label>
                        <textarea
                            rows={3}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', resize: 'none', fontSize: 13 }}
                            placeholder="e.g. Incorrect amount, missing reference number..."
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
