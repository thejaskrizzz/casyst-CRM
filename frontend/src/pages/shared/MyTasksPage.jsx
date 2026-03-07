import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Clock, AlertCircle, ExternalLink, RefreshCw, TrendingUp, Briefcase } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const STATUS_META = {
    pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
    in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#dbeafe' },
    done: { label: 'Done', color: '#10b981', bg: '#d1fae5' },
};

const LEAD_STATUS_COLORS = {
    new: '#6366f1', contacted: '#3b82f6', follow_up: '#f59e0b',
    qualified: '#10b981', proposal: '#8b5cf6', negotiation: '#f97316',
    converted: '#10b981', lost: '#ef4444',
};

const ORDER_STATUS_COLORS = {
    pending_documents: '#f57c00', documents_received: '#1976d2',
    verification: '#7b1fa2', gov_submission: '#0097a7',
    approval_waiting: '#ff8f00', completed: '#2e7d32',
    rejected: '#c62828', on_hold: '#546e7a',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

// ── Task card (manual task) ──
function TaskCard({ task, onStatusChange, basePath }) {
    const navigate = useNavigate();
    const [updating, setUpdating] = useState(false);

    const handleStatus = async (newStatus) => {
        setUpdating(true);
        try {
            await api.patch(`/tasks/${task._id}/status`, { status: newStatus });
            toast.success(`Marked as ${STATUS_META[newStatus].label}`);
            onStatusChange();
        } catch { toast.error('Failed to update task'); }
        finally { setUpdating(false); }
    };

    const orderPath = task.service_order?._id ? `${basePath}/service-orders/${task.service_order._id}` : null;

    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${STATUS_META[task.status]?.color || '#6366f1'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <button onClick={() => handleStatus(task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending')} disabled={updating} title="Cycle status" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 2, color: STATUS_META[task.status]?.color }}>
                {task.status === 'done' ? <CheckCircle2 size={20} /> : task.status === 'in_progress' ? <Clock size={20} /> : <AlertCircle size={20} />}
            </button>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: task.status === 'done' ? 'var(--ink-3)' : 'var(--ink)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, background: STATUS_META[task.status]?.bg, color: STATUS_META[task.status]?.color, flexShrink: 0 }}>{STATUS_META[task.status]?.label}</span>
                </div>
                {task.description && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{task.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    {task.service_order?.client?.company_name && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>🏢 {task.service_order.client.company_name}</span>}
                    {task.created_by?.name && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>By {task.created_by.name}</span>}
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtDate(task.createdAt)} {fmtTime(task.createdAt)}</span>
                    {orderPath && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, gap: 4, padding: '2px 8px' }} onClick={() => navigate(orderPath)}><ExternalLink size={11} /> View Order</button>}
                </div>
            </div>
        </div>
    );
}

// ── Lead card (sales role) ──
function LeadCard({ lead, basePath, isNew }) {
    const navigate = useNavigate();
    const statusColor = LEAD_STATUS_COLORS[lead.status] || '#888';
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${statusColor}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{lead.company_name || lead.contact_person}</div>
                    {lead.contact_person && lead.company_name && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{lead.contact_person}</div>}
                </div>
                <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 999, fontWeight: 700, background: `${statusColor}22`, color: statusColor, flexShrink: 0, textTransform: 'capitalize' }}>{lead.status?.replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                {lead.phone && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>📞 {lead.phone}</span>}
                {lead.source && <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>via {lead.source}</span>}
                {isNew && lead.assigned_by?.name && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Assigned by {lead.assigned_by.name}</span>}
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{fmtDate(lead.createdAt)}</span>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, gap: 4, padding: '2px 8px' }} onClick={() => navigate(`${basePath}/leads/${lead._id}`)}><ExternalLink size={11} /> Open Lead</button>
            </div>
        </div>
    );
}

// ── Service order card (operations role) ──
function OrderCard({ order, basePath, isNew }) {
    const navigate = useNavigate();
    const statusColor = ORDER_STATUS_COLORS[order.status] || '#888';
    const due = order.due_date ? new Date(order.due_date) : null;
    const overdue = due && due < new Date() && !['completed', 'rejected'].includes(order.status);
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${statusColor}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{order.client?.company_name || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{order.package?.name || '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 999, fontWeight: 700, background: `${statusColor}22`, color: statusColor, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{order.status?.replace(/_/g, ' ')}</span>
                    {overdue && <span style={{ fontSize: 10, background: '#fee2e2', color: '#c62828', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>⚠ Overdue</span>}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                {order.priority && <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'capitalize' }}>🔥 {order.priority} priority</span>}
                {due && <span style={{ fontSize: 11, color: overdue ? '#c62828' : 'var(--ink-3)' }}>Due: {fmtDate(order.due_date)}</span>}
                {isNew && order.assigned_by?.name && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Assigned by {order.assigned_by.name}</span>}
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, gap: 4, padding: '2px 8px' }} onClick={() => navigate(`${basePath}/service-orders/${order._id}`)}><ExternalLink size={11} /> Open Order</button>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, iconColor, count, children, emptyMsg }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Icon size={16} color={iconColor || '#6366f1'} />
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
                {count !== undefined && <span style={{ fontSize: 11, background: `${iconColor || '#6366f1'}22`, color: iconColor || '#6366f1', borderRadius: 999, padding: '1px 8px', fontWeight: 700 }}>{count}</span>}
            </div>
            {count === 0
                ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>{emptyMsg}</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
        </div>
    );
}

export default function MyTasksPage() {
    const { user } = useAuth();
    const basePath = { admin: '/admin', manager: '/manager', sales: '/sales', operations: '/operations', accountant: '/accountant' }[user.role] || '/';

    const [data, setData] = useState({ new_today: [], pending: [], new_leads: [], active_leads: [], new_orders: [], active_orders: [] });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/tasks/mine');
            setData(res.data.data || {});
        } catch {
            toast.error('Failed to load tasks');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalWork = (data.new_today?.length || 0) + (data.pending?.length || 0)
        + (data.new_leads?.length || 0) + (data.active_leads?.length || 0)
        + (data.new_orders?.length || 0) + (data.active_orders?.length || 0);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 760, paddingBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Tasks</h1>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                        {totalWork === 0 ? '🎉 All caught up! Nothing pending.' : `${totalWork} item${totalWork !== 1 ? 's' : ''} requiring attention`}
                    </p>
                </div>
                <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={load}><RefreshCw size={13} /> Refresh</button>
            </div>

            {/* ── SALES SECTIONS ── */}
            {user.role === 'sales' && (
                <>
                    <Section title="New Leads Assigned Today" icon={TrendingUp} iconColor="#6366f1" count={data.new_leads?.length || 0} emptyMsg="No new leads assigned to you today">
                        {(data.new_leads || []).map(l => <LeadCard key={l._id} lead={l} basePath={basePath} isNew />)}
                    </Section>
                    <Section title="Active Leads" icon={TrendingUp} iconColor="#f59e0b" count={data.active_leads?.length || 0} emptyMsg="No active leads pending action">
                        {(data.active_leads || []).map(l => <LeadCard key={l._id} lead={l} basePath={basePath} />)}
                    </Section>
                </>
            )}

            {/* ── OPERATIONS SECTIONS ── */}
            {user.role === 'operations' && (
                <>
                    <Section title="Newly Assigned Orders" icon={Briefcase} iconColor="#6366f1" count={data.new_orders?.length || 0} emptyMsg="No new service orders assigned to you today">
                        {(data.new_orders || []).map(o => <OrderCard key={o._id} order={o} basePath={basePath} isNew />)}
                    </Section>
                    <Section title="Active Orders" icon={Briefcase} iconColor="#f59e0b" count={data.active_orders?.length || 0} emptyMsg="No active orders pending completion">
                        {(data.active_orders || []).map(o => <OrderCard key={o._id} order={o} basePath={basePath} />)}
                    </Section>
                </>
            )}

            {/* ── MANUAL TASKS (all roles) ── */}
            <Section title="Newly Assigned Tasks" icon={AlertCircle} iconColor="#6366f1" count={data.new_today?.length || 0} emptyMsg="No tasks assigned to you today">
                {(data.new_today || []).map(t => <TaskCard key={t._id} task={t} onStatusChange={load} basePath={basePath} />)}
            </Section>
            <Section title="Pending Tasks" icon={Clock} iconColor="#f59e0b" count={data.pending?.length || 0} emptyMsg="No pending tasks from previous days">
                {(data.pending || []).map(t => <TaskCard key={t._id} task={t} onStatusChange={load} basePath={basePath} />)}
            </Section>
        </div>
    );
}
