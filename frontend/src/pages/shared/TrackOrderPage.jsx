import { useState } from 'react';
import { Search, Package, MapPin, Calendar, Clock, AlertCircle, FileText, CheckCircle2, Activity, Users, ArrowRight } from 'lucide-react';
import api from '../../api/axios';

const STATUS_CONFIG = {
    pending_documents: { label: 'Pending Documents', class: 's-pending', icon: FileText },
    documents_received: { label: 'Documents Received', class: 's-contacted', icon: CheckCircle2 },
    verification: { label: 'Verification', class: 's-followup', icon: Search },
    gov_submission: { label: 'Gov Submission', class: 's-new', icon: MapPin },
    approval_waiting: { label: 'Approval Waiting', class: 's-in_progress', icon: Clock },
    completed: { label: 'Completed', class: 's-done', icon: CheckCircle2 },
    rejected: { label: 'Rejected', class: 's-lost', icon: AlertCircle },
    on_hold: { label: 'On Hold', class: 's-inactive', icon: AlertCircle }
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
        <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', minHeight: 'calc(100vh - 64px)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ width: 48, height: 48, background: 'var(--accent-soft)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent)' }}>
                    <Search size={24} />
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color: 'var(--ink)' }}>Track Your Order</h1>
                <p style={{ color: 'var(--ink-3)', fontSize: 15, marginTop: 8 }}>Enter your unique Order ID to view real-time status and timeline updates.</p>
            </div>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: order ? 32 : 0, maxWidth: 500, margin: '0 auto 40px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', pointerEvents: 'none' }} />
                    <input 
                        className="form-input" 
                        style={{ paddingLeft: 44, fontSize: 16, height: 48, borderRadius: 12, textTransform: 'uppercase' }}
                        placeholder="e.g. ORD-1234..." 
                        value={orderId}
                        onChange={e => setOrderId(e.target.value.toUpperCase())}
                        autoFocus
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: 48, borderRadius: 12, padding: '0 24px', fontSize: 15 }} disabled={loading || !orderId.trim()}>
                    {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Track'}
                </button>
            </form>

            {error && (
                <div className="card" style={{ background: '#fce4ec', border: '1px solid #f8bbd0', color: '#c62828', display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
                    <AlertCircle size={20} />
                    <span style={{ fontWeight: 500 }}>{error}</span>
                </div>
            )}

            {order && (
                <div className="animate-fade-in-up">
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 20 }}>
                            <div>
                                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 4 }}>Order Details</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.5px' }}>{order.order_id}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 4 }}>Current Status</div>
                                <span className={`pill pill-${STATUS_CONFIG[order.status]?.class?.split('-')[1] || 'pending'}`} style={{ fontSize: 14 }}>
                                    {STATUS_CONFIG[order.status]?.label || order.status}
                                </span>
                            </div>
                        </div>

                        <div className="grid-3" style={{ gap: 24, padding: '0 10px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}><Package size={14} /> Package</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{order.package?.name || 'Custom Package'}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}><Users size={14} /> Client Info</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{order.client?.company_name}</div>
                                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{order.client?.contact_person}</div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}><Activity size={14} /> Processing Team</div>
                                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{order.assigned_to?.name || 'Unassigned'}</div>
                                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{order.branch?.name || 'Main Office'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                            <Activity size={18} style={{ color: 'var(--ink-3)' }} /> Timeline History
                        </div>

                        <div style={{ paddingLeft: 12, position: 'relative' }}>
                            {/* Vertical Line */}
                            <div style={{ position: 'absolute', left: 24, top: 12, bottom: 24, width: 2, background: 'var(--border)' }} />
                            
                            {order.status_history?.slice().reverse().map((sh, i) => {
                                const conf = STATUS_CONFIG[sh.status];
                                const Ic = conf?.icon || CheckCircle2;
                                const isLatest = i === 0;

                                return (
                                    <div key={i} style={{ display: 'flex', gap: 24, marginBottom: i === order.status_history.length - 1 ? 0 : 32, position: 'relative', zIndex: 1 }}>
                                        <div style={{ 
                                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                            background: isLatest ? 'var(--accent)' : 'var(--surface)',
                                            border: `2px solid ${isLatest ? 'var(--accent)' : 'var(--border-2)'}`,
                                            color: isLatest ? '#fff' : 'var(--ink-3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: isLatest ? '0 0 0 4px var(--accent-soft)' : 'none'
                                        }}>
                                            <Ic size={12} strokeWidth={isLatest ? 3 : 2} />
                                        </div>
                                        
                                        <div style={{ flex: 1, paddingTop: 2 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                <div style={{ fontWeight: isLatest ? 700 : 600, fontSize: 15, color: isLatest ? 'var(--ink)' : 'var(--ink-2)' }}>
                                                    {conf?.label || sh.status}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--ink-3)', background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 999, fontWeight: 500 }}>
                                                    {new Date(sh.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: sh.note ? 8 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Users size={12} /> {sh.changed_by?.name || 'System Operator'}
                                            </div>
                                            {sh.note && (
                                                <div style={{ 
                                                    fontSize: 13, color: 'var(--ink-2)', 
                                                    background: 'var(--surface-2)', 
                                                    padding: '12px 16px', borderRadius: 10,
                                                    borderLeft: `3px solid ${isLatest ? 'var(--accent)' : 'var(--border-strong)'}`
                                                }}>
                                                    {sh.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {(!order.status_history || order.status_history.length === 0) && (
                                <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '20px 0' }}>
                                    No timeline events recorded.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
