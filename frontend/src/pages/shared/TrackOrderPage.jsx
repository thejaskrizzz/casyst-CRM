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
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Track Service Order</h1>
                <p style={{ color: 'var(--ink-3)' }}>Enter the unique Order ID (e.g., ORD-YYYYXXXX) to view current status and timeline</p>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: 14, top: 10, color: 'var(--ink-3)' }} />
                        <input
                            type="text"
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                            placeholder="ORD-XXXX..."
                            style={{ paddingLeft: 42, width: '100%' }}
                            className="input"
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading || !orderId.trim()}>
                        {loading ? 'Searching...' : 'Track'}
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
                <div className="card" style={{ padding: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                                {order.order_id}
                            </h2>
                            <p style={{ color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Package size={16} /> {order.package?.name || 'Custom Setup'}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="badge" style={{
                                background: STATUS_CONFIG[order.status]?.color + '15',
                                color: STATUS_CONFIG[order.status]?.color,
                                padding: '6px 12px',
                                fontSize: 13,
                                borderRadius: 20
                            }}>
                                {STATUS_CONFIG[order.status]?.label || order.status}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
                        <div>
                            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Client</p>
                            <p style={{ fontWeight: 500 }}>{order.client?.company_name}</p>
                            <p style={{ fontSize: 13 }}>{order.client?.contact_person}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Contact</p>
                            <p style={{ fontWeight: 500 }}>{order.client?.phone}</p>
                            <p style={{ fontSize: 13, wordBreak: 'break-all' }}>{order.client?.email}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Assigned To</p>
                            <p style={{ fontWeight: 500 }}>{order.assigned_to?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Branch</p>
                            <p style={{ fontWeight: 500 }}>{order.branch?.name || order.branch?.code || 'Main'}</p>
                        </div>
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Status Timeline</h3>
                    <div className="timeline">
                        {order.status_history?.map((sh, i) => {
                            const conf = STATUS_CONFIG[sh.status];
                            const Ic = conf?.icon || CheckCircle2;
                            return (
                                <div key={i} className="timeline-item" style={{
                                    display: 'flex', gap: 16, marginBottom: 16,
                                    opacity: i === order.status_history.length - 1 ? 1 : 0.6
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: (conf?.color || 'var(--ink)') + '15',
                                            color: conf?.color || 'var(--ink)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Ic size={16} />
                                        </div>
                                        {i !== order.status_history.length - 1 && (
                                            <div style={{ width: 2, height: '100%', background: 'var(--border)', margin: '4px 0' }} />
                                        )}
                                    </div>
                                    <div style={{ paddingBottom: 16 }}>
                                        <div style={{ fontWeight: 500 }}>{conf?.label || sh.status}</div>
                                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Calendar size={12} /> {new Date(sh.changed_at).toLocaleString()}
                                            <span style={{ margin: '0 4px' }}>•</span>
                                            {sh.changed_by?.name || 'System'}
                                        </div>
                                        {sh.note && (
                                            <div style={{ fontSize: 13, background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 6, marginTop: 4 }}>
                                                {sh.note}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {(!order.status_history || order.status_history.length === 0) && (
                            <p style={{ color: 'var(--ink-3)' }}>No timeline events recorded.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
