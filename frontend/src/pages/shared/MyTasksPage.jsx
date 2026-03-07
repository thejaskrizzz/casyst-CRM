import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle2, Clock, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const STATUS_META = {
    pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
    in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#dbeafe' },
    done: { label: 'Done', color: '#10b981', bg: '#d1fae5' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

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

    const orderPath = task.service_order?._id
        ? `${basePath}/service-orders/${task.service_order._id}`
        : null;

    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderLeft: `3px solid ${STATUS_META[task.status]?.color || '#6366f1'}`,
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
        }}>
            {/* Status toggle icon */}
            <button
                onClick={() => handleStatus(task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending')}
                disabled={updating}
                title="Cycle status"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 2, color: STATUS_META[task.status]?.color }}
            >
                {task.status === 'done'
                    ? <CheckCircle2 size={20} />
                    : task.status === 'in_progress'
                        ? <Clock size={20} />
                        : <AlertCircle size={20} />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: task.status === 'done' ? 'var(--ink-3)' : 'var(--ink)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, background: STATUS_META[task.status]?.bg, color: STATUS_META[task.status]?.color, flexShrink: 0 }}>
                        {STATUS_META[task.status]?.label}
                    </span>
                </div>

                {task.description && (
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{task.description}</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                    {task.service_order?.client?.company_name && (
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            🏢 {task.service_order.client.company_name}
                        </span>
                    )}
                    {task.created_by?.name && (
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                            By {task.created_by.name}
                        </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {fmtDate(task.createdAt)} {fmtTime(task.createdAt)}
                    </span>
                    {orderPath && (
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, gap: 4, padding: '2px 8px' }}
                            onClick={() => navigate(orderPath)}
                        >
                            <ExternalLink size={11} /> View Order
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Section({ title, icon, count, children, color = '#6366f1', emptyMsg }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h2>
                {count !== undefined && (
                    <span style={{ fontSize: 11, background: `${color}22`, color, borderRadius: 999, padding: '1px 8px', fontWeight: 700 }}>{count}</span>
                )}
            </div>
            {count === 0
                ? <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>{emptyMsg}</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
            }
        </div>
    );
}

export default function MyTasksPage() {
    const { user } = useAuth();
    const basePath = {
        admin: '/admin', manager: '/manager', sales: '/sales',
        operations: '/operations', accountant: '/accountant',
    }[user.role] || '/';

    const [data, setData] = useState({ new_today: [], pending: [], order_updates: [] });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/tasks/mine');
            setData(res.data.data || { new_today: [], pending: [], order_updates: [] });
        } catch {
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalPending = data.new_today.length + data.pending.length;

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div className="spinner" />
        </div>
    );

    return (
        <div style={{ maxWidth: 760, paddingBottom: 40 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Tasks</h1>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                        {totalPending === 0
                            ? '🎉 All caught up! No pending tasks.'
                            : `${totalPending} task${totalPending !== 1 ? 's' : ''} pending`}
                    </p>
                </div>
                <button className="btn btn-outline btn-sm" style={{ gap: 6 }} onClick={load}>
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            {/* New assignments today */}
            <Section
                title="Newly Assigned Today"
                icon="🆕"
                count={data.new_today.length}
                color="#6366f1"
                emptyMsg="No tasks assigned to you today"
            >
                {data.new_today.map(t => (
                    <TaskCard key={t._id} task={t} onStatusChange={load} basePath={basePath} />
                ))}
            </Section>

            {/* Older pending */}
            <Section
                title="Pending Tasks"
                icon="⏳"
                count={data.pending.length}
                color="#f59e0b"
                emptyMsg="No pending tasks from previous days"
            >
                {data.pending.map(t => (
                    <TaskCard key={t._id} task={t} onStatusChange={load} basePath={basePath} />
                ))}
            </Section>

            {/* For ops: new tasks on their orders */}
            {data.order_updates?.length > 0 && (
                <Section
                    title="New Activity on Your Orders"
                    icon="📋"
                    count={data.order_updates.length}
                    color="#10b981"
                    emptyMsg=""
                >
                    {data.order_updates.map(t => (
                        <TaskCard key={t._id} task={t} onStatusChange={load} basePath={basePath} />
                    ))}
                </Section>
            )}
        </div>
    );
}
