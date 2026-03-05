import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Building2, Package, Calendar, User, Phone,
    Mail, RefreshCw, CheckSquare, FileText, Clock, AlertTriangle, X,
    IndianRupee, CreditCard, Plus, Trash2, Link2, CheckCircle, ExternalLink
} from 'lucide-react';

/* ─────────────── constants ─────────────── */
const SO_STATUSES = [
    'pending_documents', 'documents_received', 'verification',
    'gov_submission', 'approval_waiting', 'completed', 'rejected', 'on_hold',
];
const STATUS_COLORS = {
    pending_documents: '#f57c00', documents_received: '#1976d2',
    verification: '#7b1fa2', gov_submission: '#0097a7',
    approval_waiting: '#ff8f00', completed: '#2e7d32',
    rejected: '#c62828', on_hold: '#546e7a',
};
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'other'];
const PAYMENT_METHOD_LABELS = { cash: 'Cash', bank_transfer: 'Bank Transfer', upi: 'UPI', cheque: 'Cheque', other: 'Other' };
const PAYMENT_STATUS_META = {
    unpaid: { color: '#c62828', bg: '#ffebee', label: 'Unpaid' },
    partial: { color: '#f57c00', bg: '#fff3e0', label: 'Partially Paid' },
    paid: { color: '#2e7d32', bg: '#e8f5e9', label: 'Fully Paid' },
};

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pct = (a, b) => b ? Math.min(100, Math.round((a / b) * 100)) : 0;

/* ─────────────── Reusable label-value ─────────────── */
const LV = ({ label, value, color }) => (
    <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13, color: color || 'var(--ink)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
);

/* ═══════════════════════════════════════════════════ */
export default function ServiceOrderDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const basePath = user.role === 'operations' ? '/operations' : user.role === 'manager' ? '/manager' : user.role === 'sales' ? '/sales' : '/admin';

    const [order, setOrder] = useState(null);
    const [activity, setActivity] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [docs, setDocs] = useState([]);
    const [opsUsers, setOpsUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Status modal
    const [statusModal, setStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Assign modal
    const [assignModal, setAssignModal] = useState(false);
    const [assignForm, setAssignForm] = useState({ assigned_to: '', priority: 'medium', due_date: '', note: '' });
    const [assigning, setAssigning] = useState(false);

    // Payment modal
    const [paymentModal, setPaymentModal] = useState(false);
    const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', reference_no: '', note: '', paid_at: new Date().toISOString().slice(0, 10) });
    const [addingPayment, setAddingPayment] = useState(false);

    const canManage = ['admin', 'manager'].includes(user.role);
    const canAddPayment = ['admin', 'manager', 'sales'].includes(user.role);
    const canApprovePayment = ['admin', 'accountant'].includes(user.role);
    const isSales = user.role === 'sales';

    const loadAll = async () => {
        setLoading(true);
        try {
            const [orderRes, actRes, taskRes, docRes] = await Promise.all([
                api.get(`/service-orders/${id}`),
                api.get(`/service-orders/${id}/activity`),
                api.get(`/service-orders/${id}/tasks`),
                api.get(`/service-orders/${id}/documents`),
            ]);
            setOrder(orderRes.data.data);
            setActivity(actRes.data.data || []);
            setTasks(taskRes.data.data || []);
            setDocs(docRes.data.data || []);
        } catch (e) { setError(e.response?.data?.message || 'Failed to load service order'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadAll(); }, [id]);

    // Fetch ops users for assignment
    useEffect(() => {
        if (canManage) {
            api.get('/users', { params: { role: 'operations', limit: 50 } })
                .then(r => setOpsUsers(r.data.data || []))
                .catch(() => { });
        }
    }, [canManage]);

    /* ── Actions ── */
    const doUpdateStatus = async (e) => {
        e.preventDefault(); setUpdatingStatus(true);
        try {
            await api.patch(`/service-orders/${id}/status`, { status: newStatus, note: statusNote });
            toast.success('Status updated');
            setStatusModal(false); setStatusNote(''); setNewStatus('');
            loadAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setUpdatingStatus(false); }
    };

    const doAssign = async (e) => {
        e.preventDefault(); setAssigning(true);
        try {
            await api.patch(`/service-orders/${id}/assign`, assignForm);
            toast.success('Order assigned successfully');
            setAssignModal(false);
            loadAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setAssigning(false); }
    };

    const doAddPayment = async (e) => {
        e.preventDefault(); setAddingPayment(true);
        try {
            await api.post(`/service-orders/${id}/payments`, payForm);
            toast.success('Payment submitted — awaiting accountant approval');
            setPaymentModal(false);
            setPayForm({ amount: '', method: 'bank_transfer', reference_no: '', note: '', paid_at: new Date().toISOString().slice(0, 10) });
            loadAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setAddingPayment(false); }
    };

    const doDeletePayment = async (pid) => {
        if (!window.confirm('Delete this payment record?')) return;
        try {
            await api.delete(`/service-orders/${id}/payments/${pid}`);
            toast.success('Payment removed');
            loadAll();
        } catch { toast.error('Failed to delete payment'); }
    };

    const doApprovePayment = async (pid) => {
        try {
            await api.patch(`/service-orders/${id}/payments/${pid}/approve`);
            toast.success('Payment approved ✓');
            loadAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Failed to approve'); }
    };

    const doRejectPayment = async (pid) => {
        const reason = window.prompt('Reason for rejection:');
        if (!reason) return;
        try {
            await api.patch(`/service-orders/${id}/payments/${pid}/reject`, { rejection_reason: reason });
            toast.success('Payment rejected');
            loadAll();
        } catch (e) { toast.error(e.response?.data?.message || 'Failed to reject'); }
    };

    const toggleTask = async (taskId, done) => {
        try { await api.patch(`/service-orders/${id}/tasks/${taskId}`, { completed: !done }); loadAll(); }
        catch { toast.error('Failed to update task'); }
    };

    /* ── Render guards ── */
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
    if (error) return <div className="empty" style={{ paddingTop: 80 }}><AlertTriangle style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3, width: 40 }} /><p>{error}</p></div>;
    if (!order) return null;

    const isCompleted = order.status === 'completed' || order.status === 'rejected';
    const dueDate = order.due_date ? new Date(order.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && !isCompleted;
    const completedTasks = tasks.filter(t => t.completed).length;
    const paidPct = pct(order.amount_paid, order.project_value);
    const pmeta = PAYMENT_STATUS_META[order.payment_status || 'unpaid'];

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* ── HEADER ── */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="icon-btn" onClick={() => navigate(`${basePath}/service-orders`)} title="Back">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="page-title">{order.client?.company_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            <span className={`pill pill-${order.status}`}>{order.status?.replace(/_/g, ' ')}</span>
                            <span className={`pill pill-${order.priority}`}>{order.priority} priority</span>
                            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: pmeta.bg, color: pmeta.color }}>{pmeta.label}</span>
                            {isOverdue && <span className="pill pill-rejected">⚠ Overdue</span>}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {canManage && (
                        <button className="btn btn-outline" onClick={() => { setAssignForm({ assigned_to: order.assigned_to?._id || '', priority: order.priority, due_date: order.due_date ? order.due_date.slice(0, 10) : '', note: '' }); setAssignModal(true); }}>
                            <User size={13} /> {order.assigned_to ? 'Reassign' : 'Assign'}
                        </button>
                    )}
                    {!isCompleted && !isSales && (
                        <button className="btn btn-outline" onClick={() => { setNewStatus(''); setStatusModal(true); }}>
                            <RefreshCw size={13} /> Update Status
                        </button>
                    )}
                </div>
            </div>

            {/* ── PAYMENT SUMMARY BAR ── */}
            {order.project_value > 0 && (
                <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Value</div>
                                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>{fmt(order.project_value)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paid</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#2e7d32', letterSpacing: '-0.5px' }}>{fmt(order.amount_paid)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance Due</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: order.balance_due > 0 ? '#c62828' : '#2e7d32', letterSpacing: '-0.5px' }}>{fmt(order.balance_due)}</div>
                            </div>
                        </div>
                        {canAddPayment && (
                            <button className="btn btn-primary" style={{ gap: 6 }} onClick={() => setPaymentModal(true)}>
                                <Plus size={13} /> Add Payment
                            </button>
                        )}
                    </div>
                    {/* Progress bar */}
                    <div style={{ position: 'relative', height: 8, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${paidPct}%`, background: paidPct >= 100 ? '#2e7d32' : paidPct > 0 ? '#ffa726' : '#ef5350', borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5 }}>{paidPct}% paid · {order.payments?.length || 0} payment{order.payments?.length !== 1 ? 's' : ''} recorded</div>
                </div>
            )}
            {order.project_value === 0 && canAddPayment && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={() => setPaymentModal(true)}>
                        <Plus size={13} /> Add Payment
                    </button>
                </div>
            )}

            {/* ── MAIN GRID ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* LEFT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Project & Order Info */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div className="section-title" style={{ margin: 0 }}>Project Details</div>
                            {order.quote && (
                                <button className="btn btn-ghost btn-sm" style={{ gap: 5, fontSize: 11 }}
                                    onClick={() => navigate(`${basePath}/quotes/${order.quote._id || order.quote}`)}>
                                    <Link2 size={11} /> Quote: {order.quote.reference_no || '...'}
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <LV label="Client" value={order.client?.company_name} />
                            <LV label="Contact Person" value={order.client?.contact_person} />
                            <LV label="Phone" value={order.client?.phone} />
                            <LV label="Email" value={order.client?.email} />
                            <LV label="Package / Service" value={order.package?.name} />
                            <LV label="Assigned To" value={order.assigned_to?.name || 'Unassigned'} color={!order.assigned_to ? '#f57c00' : undefined} />
                            <LV label="Created By" value={order.created_by?.name} />
                            <LV label="Due Date" value={dueDate ? dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} color={isOverdue ? '#c62828' : undefined} />
                            <LV label="Created" value={new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                            {order.converted_by && <LV label="Converted By" value={order.converted_by?.name} />}
                        </div>
                        {order.project_notes && (
                            <>
                                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Project Notes</div>
                                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{order.project_notes}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Payments Table */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div className="section-title" style={{ margin: 0 }}>Payment Records</div>
                            {canAddPayment && (
                                <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} onClick={() => setPaymentModal(true)}>
                                    <Plus size={12} /> Add
                                </button>
                            )}
                        </div>
                        {(order.payments || []).length === 0 ? (
                            <div className="empty" style={{ padding: '24px 0' }}>
                                <CreditCard size={30} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2 }} />
                                <p>No payments recorded yet</p>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 105px 90px 90px 36px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                                    {['Date', 'Method', 'Amount', 'By', 'Status', ''].map(h => (
                                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                                    ))}
                                </div>
                                {order.payments.map((p, i) => {
                                    const psMeta = {
                                        pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
                                        approved: { label: 'Approved', color: '#10b981', bg: '#d1fae5' },
                                        rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
                                    };
                                    const ps = psMeta[p.status] || psMeta.pending;
                                    return (
                                        <div key={p._id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 105px 90px 90px 36px', gap: 8, padding: '10px 0', borderBottom: i < order.payments.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'start' }}>
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 600 }}>{new Date(p.paid_at || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                {p.reference_no && <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Ref: {p.reference_no}</div>}
                                                {p.note && <div style={{ fontSize: 10, color: 'var(--ink-3)', fontStyle: 'italic' }}>{p.note}</div>}
                                            </div>
                                            <div><span style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{PAYMENT_METHOD_LABELS[p.method] || p.method}</span></div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: p.status === 'approved' ? '#2e7d32' : '#aaa' }}>{fmt(p.amount)}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.recorded_by?.name || '—'}</div>
                                            <div>
                                                <span style={{ background: ps.bg, color: ps.color, borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{ps.label}</span>
                                                {p.status === 'rejected' && p.rejection_reason && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>"{p.rejection_reason}"</div>}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {canApprovePayment && p.status === 'pending' && (
                                                    <>
                                                        <button className="icon-btn" title="Approve" style={{ color: '#10b981' }} onClick={() => doApprovePayment(p._id)}>✓</button>
                                                        <button className="icon-btn" title="Reject" style={{ color: '#ef4444' }} onClick={() => doRejectPayment(p._id)}>✕</button>
                                                    </>
                                                )}
                                                {canManage && <button className="icon-btn" title="Delete" onClick={() => doDeletePayment(p._id)} style={{ color: '#c62828' }}><Trash2 size={12} /></button>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Total row */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, borderTop: '2px solid var(--border)', marginTop: 4, gap: 16, fontSize: 13, fontWeight: 700 }}>
                                    <span>Total Paid:</span>
                                    <span style={{ color: '#2e7d32' }}>{fmt(order.amount_paid)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Tasks */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div className="section-title" style={{ margin: 0 }}>
                                Tasks {tasks.length > 0 && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-3)', fontWeight: 400 }}>{completedTasks}/{tasks.length} done</span>}
                            </div>
                        </div>
                        {tasks.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(completedTasks / tasks.length) * 100}%`, background: '#2e7d32', transition: 'width 0.4s ease' }} />
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{Math.round((completedTasks / tasks.length) * 100)}% complete</div>
                            </div>
                        )}
                        {tasks.length === 0
                            ? <div className="empty"><CheckSquare style={{ margin: '0 auto 8px', opacity: 0.2, display: 'block' }} /><p>No tasks yet</p></div>
                            : tasks.map(t => (
                                <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: !isCompleted ? 'pointer' : 'default' }}
                                    onClick={() => !isCompleted && toggleTask(t._id, t.completed)}>
                                    <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: '2px solid', borderColor: t.completed ? '#2e7d32' : 'var(--border)', background: t.completed ? '#2e7d32' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        {t.completed && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#fff" strokeWidth="2"><polyline points="1,4 4,7 9,1" /></svg>}
                                    </div>
                                    <span style={{ fontSize: 13, color: t.completed ? 'var(--ink-3)' : 'var(--ink)', textDecoration: t.completed ? 'line-through' : 'none', flex: 1 }}>{t.title || t.description}</span>
                                </div>
                            ))
                        }
                    </div>

                    {/* Status History */}
                    <div className="card">
                        <div className="section-title">Status History</div>
                        {(order.status_history || []).length === 0
                            ? <div className="empty"><p>No history yet</p></div>
                            : (
                                <div className="timeline">
                                    {[...order.status_history].reverse().map((s, i) => (
                                        <div key={i} className="timeline-item">
                                            <div className={`tl-dot${i === 0 ? ' accent' : ''}`} style={i === 0 ? { background: STATUS_COLORS[s.status] } : {}} />
                                            <div className="tl-body">
                                                <div className="tl-action">Status → <span className={`pill pill-${s.status}`}>{s.status?.replace(/_/g, ' ')}</span></div>
                                                {s.note && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3 }}>{s.note}</div>}
                                                <div className="tl-time">
                                                    {s.changed_by?.name && `by ${s.changed_by.name} · `}
                                                    {new Date(s.changed_at || s.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* RIGHT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Assignment Card (manager/admin only) */}
                    {canManage && (
                        <div className="card" style={{ borderTop: `3px solid ${order.assigned_to ? '#5c6bc0' : '#ffa726'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>Assignment</div>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setAssignForm({ assigned_to: order.assigned_to?._id || '', priority: order.priority, due_date: order.due_date ? order.due_date.slice(0, 10) : '', note: '' }); setAssignModal(true); }}>
                                    {order.assigned_to ? 'Reassign' : 'Assign →'}
                                </button>
                            </div>
                            {order.assigned_to ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div className="avatar" style={{ background: '#5c6bc0', color: '#fff', width: 34, height: 34, fontSize: 14, flexShrink: 0 }}>{order.assigned_to.name?.charAt(0)}</div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{order.assigned_to.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{order.assigned_to.email}</div>
                                        {order.assigned_by && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Assigned by {order.assigned_by.name}</div>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '12px 0', textAlign: 'center' }}>
                                    <User size={28} style={{ display: 'block', margin: '0 auto 6px', color: '#ffa726', opacity: 0.7 }} />
                                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Not assigned yet</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Documents */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div className="section-title" style={{ margin: 0 }}>Documents</div>
                            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{docs.length} file{docs.length !== 1 ? 's' : ''}</span>
                        </div>
                        {docs.length === 0
                            ? <div className="empty" style={{ padding: '20px 0' }}><FileText style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2, width: 28 }} /><p>No documents</p></div>
                            : docs.map(d => (
                                <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                                    <FileText size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.original_name || d.filename}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{d.uploaded_by?.name}</div>
                                    </div>
                                    <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', flexShrink: 0 }}>View</a>
                                </div>
                            ))
                        }
                    </div>

                    {/* Activity */}
                    <div className="card">
                        <div className="section-title">Activity</div>
                        {activity.length === 0
                            ? <div className="empty" style={{ padding: '16px 0' }}><p>No activity yet</p></div>
                            : (
                                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                                    {activity.map((a, i) => (
                                        <div key={a._id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, flexShrink: 0 }}>{a.performed_by?.name?.charAt(0)}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{a.description}</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                                                    {a.performed_by?.name} · {new Date(a.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>

            {/* ── UPDATE STATUS MODAL ── */}
            {statusModal && (
                <div className="modal-overlay" onClick={() => setStatusModal(false)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Update Status</span>
                            <button className="icon-btn" onClick={() => setStatusModal(false)}><X size={14} /></button>
                        </div>
                        <form onSubmit={doUpdateStatus}>
                            <div className="form-group">
                                <label className="form-label">Current Status</label>
                                <span className={`pill pill-${order.status}`}>{order.status?.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Status *</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {SO_STATUSES.filter(s => s !== order.status).map(s => (
                                        <button key={s} type="button" onClick={() => setNewStatus(s)}
                                            style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid', borderColor: newStatus === s ? STATUS_COLORS[s] : 'var(--border)', background: newStatus === s ? STATUS_COLORS[s] : 'transparent', color: newStatus === s ? '#fff' : 'var(--ink-2)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                                            {s.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note (optional)</label>
                                <textarea className="form-textarea" rows={2} value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStatusModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!newStatus || updatingStatus}>
                                    {updatingStatus ? 'Updating…' : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── ASSIGN MODAL (manager/admin) ── */}
            {assignModal && canManage && (
                <div className="modal-overlay" onClick={() => setAssignModal(false)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{order.assigned_to ? 'Reassign Order' : 'Assign to Operations'}</span>
                            <button className="icon-btn" onClick={() => setAssignModal(false)}><X size={14} /></button>
                        </div>
                        <form onSubmit={doAssign}>
                            <div className="form-group">
                                <label className="form-label">Operations Staff *</label>
                                <select className="form-input" value={assignForm.assigned_to} onChange={e => setAssignForm(f => ({ ...f, assigned_to: e.target.value }))} required>
                                    <option value="">— Select a team member —</option>
                                    {opsUsers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-input" value={assignForm.priority} onChange={e => setAssignForm(f => ({ ...f, priority: e.target.value }))}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" type="date" value={assignForm.due_date} onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note for the assignee</label>
                                <textarea className="form-textarea" rows={2} placeholder="Any instructions or context…" value={assignForm.note} onChange={e => setAssignForm(f => ({ ...f, note: e.target.value }))} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setAssignModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={assigning || !assignForm.assigned_to}>
                                    {assigning ? 'Assigning…' : 'Assign Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── ADD PAYMENT MODAL ── */}
            {paymentModal && (
                <div className="modal-overlay" onClick={() => setPaymentModal(false)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">💳 Add Payment</span>
                            <button className="icon-btn" onClick={() => setPaymentModal(false)}><X size={14} /></button>
                        </div>
                        {order.project_value > 0 && (
                            <div style={{ display: 'flex', gap: 16, padding: '8px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                                <div style={{ fontSize: 12 }}>Project: <strong>{fmt(order.project_value)}</strong></div>
                                <div style={{ fontSize: 12 }}>Paid: <strong style={{ color: '#2e7d32' }}>{fmt(order.amount_paid)}</strong></div>
                                <div style={{ fontSize: 12 }}>Balance: <strong style={{ color: '#c62828' }}>{fmt(order.balance_due)}</strong></div>
                            </div>
                        )}
                        <form onSubmit={doAddPayment}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹) *</label>
                                    <input className="form-input" type="number" min={1} step="0.01" required
                                        value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                        placeholder={order.balance_due > 0 ? `Balance: ${fmt(order.balance_due)}` : '0'} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Date</label>
                                    <input className="form-input" type="date" value={payForm.paid_at} onChange={e => setPayForm(f => ({ ...f, paid_at: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Method</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {PAYMENT_METHODS.map(m => (
                                        <button key={m} type="button" onClick={() => setPayForm(f => ({ ...f, method: m }))}
                                            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid', borderColor: payForm.method === m ? '#5c6bc0' : 'var(--border)', background: payForm.method === m ? '#5c6bc0' : 'transparent', color: payForm.method === m ? '#fff' : 'var(--ink-2)', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                                            {PAYMENT_METHOD_LABELS[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reference / Transaction No.</label>
                                <input className="form-input" value={payForm.reference_no} onChange={e => setPayForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="UTR, cheque no., etc." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note</label>
                                <input className="form-input" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional memo" />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setPaymentModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={addingPayment || !payForm.amount}>
                                    {addingPayment ? 'Saving…' : '✓ Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
