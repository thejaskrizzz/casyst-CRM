import { useState } from 'react';
import { Search, Package, MapPin, Calendar, Clock, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const STATUS_CONFIG = {
    pending_documents: { label: 'Pending Documents', color: 'var(--yellow)', icon: FileText },
    documents_received: { label: 'Documents Received', color: 'var(--blue)', icon: CheckCircle2 },
    verification: { label: 'Verification', color: 'var(--purple)', icon: Search },
    gov_submission: { label: 'Gov Submission', color: 'var(--orange)', icon: MapPin },
    approval_waiting: { label: 'Approval Waiting', color: 'var(--blue)', icon: Clock },
    completed: { label: 'Completed', color: 'var(--green)', icon: CheckCircle2 },
    rejected: { label: 'Rejected', color: 'var(--red)', icon: AlertCircle },
    on_hold: { label: 'On Hold', color: 'var(--ink-3)', icon: AlertCircle }
};

export default function TrackOrderPage() {
    const [orderId, setOrderId] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!orderId.trim()) return;

        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const res = await api.get(`/service-orders/track/${orderId.trim()}`);
            setOrder(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Order not found or access denied. Please verify the Order ID.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px 24px', maxWidth: 850, margin: '0 auto', minHeight: 'calc(100vh - 64px)' }} className="animate-fade-in-up">
            <div style={{ marginBottom: 48, textAlign: 'center' }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }} className="gradient-text">
                    Track Your Order
                </h1>
                <p style={{ color: 'var(--ink-3)', fontSize: 16 }}>
                    Enter your unique Order ID below to view its real-time status and timeline.
                </p>
            </div>

            <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
                <form
                    onSubmit={handleSearch}
                    style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 600 }}
                >
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={22} style={{ position: 'absolute', left: 20, color: 'var(--ink-3)', zIndex: 10, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                            placeholder="e.g. ORD-2026-X8Y9"
                            className="large-search-input"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-large-search"
                        disabled={loading || !orderId.trim()}
                        style={{ opacity: loading || !orderId.trim() ? 0.7 : 1 }}
                    >
                        {loading ? 'Searching...' : 'Track Order'}
                    </button>
                </form>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 24 }}>
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {order && (
                <div className="glass-card animate-slide-in-left" style={{ padding: 32, marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                        <div>
                            <p style={{ color: 'var(--ink-3)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>
                                Order Reference
                            </p>
                            <h2 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
                                {order.order_id}
                                <span className="badge" style={{
                                    background: STATUS_CONFIG[order.status]?.color + '15',
                                    color: STATUS_CONFIG[order.status]?.color,
                                    padding: '6px 14px',
                                    fontSize: 13,
                                    borderRadius: 100,
                                    fontWeight: 600,
                                    boxShadow: `0 0 10px ${STATUS_CONFIG[order.status]?.color}30`
                                }}>
                                    {STATUS_CONFIG[order.status]?.label || order.status}
                                </span>
                            </h2>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                            <div style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 500 }}>Package</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 16 }}>
                                <Package size={18} color="var(--primary)" /> {order.package?.name || 'Custom Setup'}
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 40, background: 'var(--surface)', padding: 20, borderRadius: 12 }}>
                        <div>
                            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>Client</p>
                            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{order.client?.company_name}</p>
                            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{order.client?.contact_person}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>Contact</p>
                            <p style={{ fontWeight: 500, color: 'var(--ink)' }}>{order.client?.phone}</p>
                            <p style={{ fontSize: 13, color: 'var(--ink-2)', wordBreak: 'break-all' }}>{order.client?.email}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600 }}>Assigned Team</p>
                            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{order.assigned_to?.name || 'Unassigned'}</p>
                            <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{order.branch?.name || order.branch?.code || 'Main Company'}</p>
                        </div>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={20} color="var(--primary)" /> Activity Timeline
                    </h3>

                    <div className="timeline" style={{ paddingLeft: 12 }}>
                        {order.status_history?.map((sh, i) => {
                            const conf = STATUS_CONFIG[sh.status];
                            const Ic = conf?.icon || CheckCircle2;
                            const isLatest = i === order.status_history.length - 1;

                            return (
                                <div key={i} className="timeline-item" style={{
                                    display: 'flex', gap: 20, marginBottom: 0,
                                    animation: `fadeInUp 0.4s ease-out ${(order.status_history.length - i) * 0.1}s forwards`,
                                    opacity: 0,
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%',
                                            background: isLatest ? conf?.color : (conf?.color || 'var(--ink)') + '20',
                                            color: isLatest ? 'white' : (conf?.color || 'var(--ink)'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: isLatest ? `0 0 0 6px ${conf?.color}20` : 'none',
                                            zIndex: 2,
                                            animation: isLatest && !['completed', 'rejected'].includes(order.status) ? 'pulseGlow 2s infinite' : 'none',
                                            transform: isLatest ? 'scale(1.1)' : 'scale(1)',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <Ic size={18} />
                                        </div>
                                        {i !== 0 && ( /* Line goes UP to the previous chronological item (which is higher in UI index based on reverse sort if applicable) */
                                            <div style={{ width: 2, flex: 1, background: isLatest ? `linear-gradient(to bottom, transparent, var(--border))` : 'var(--border)', minHeight: 40, margin: '8px 0' }} />
                                        )}
                                    </div>
                                    <div style={{ paddingBottom: 32, flex: 1, paddingTop: 6 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: isLatest ? 'var(--ink)' : 'var(--ink-2)', marginBottom: 4 }}>
                                            {conf?.label || sh.status}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={13} /> {new Date(sh.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            <span style={{ margin: '0 4px', color: 'var(--border-strong)' }}>|</span>
                                            <Users size={13} /> {sh.changed_by?.name || 'System'}
                                        </div>
                                        {sh.note && (
                                            <div style={{ fontSize: 14, color: 'var(--ink-2)', background: 'var(--surface)', borderLeft: `3px solid ${conf?.color || 'var(--border-strong)'}`, padding: '12px 16px', borderRadius: '0 8px 8px 0', marginTop: 8 }}>
                                                {sh.note}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {(!order.status_history || order.status_history.length === 0) && (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', background: 'var(--surface)', borderRadius: 12 }}>
                                <AlertCircle size={24} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                <p>No timeline events recorded yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
