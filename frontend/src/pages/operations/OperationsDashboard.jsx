import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
    Briefcase, AlertTriangle, FileText, CheckCircle, ChevronRight,
    Clock, TrendingUp, Zap, ArrowUpRight, CheckSquare, XCircle
} from 'lucide-react';

/* ──────────────────────── palette ────────────────────────── */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_COLORS = {
    pending_documents: '#f57c00',
    documents_received: '#1976d2',
    verification: '#7b1fa2',
    gov_submission: '#0097a7',
    approval_waiting: '#ff8f00',
    completed: '#2e7d32',
    rejected: '#c62828',
    on_hold: '#546e7a',
};
const PRIORITY_COLORS = { high: '#c62828', medium: '#ffa726', low: '#66bb6a' };
const CHART_COLORS = ['#5c6bc0', '#29b6f6', '#ffa726', '#66bb6a', '#ef5350', '#8d6e63', '#26a69a', '#ff8f00'];

/* ──────────────────────── helpers ─────────────────────────── */
const pctOf = (n, d) => d ? Math.round((n / d) * 100) : 0;

/* ──────────────────────── KPI Card ────────────────────────── */
function StatCard({ label, value, icon: Icon, color = '#5c6bc0', sub, href }) {
    const navigate = useNavigate();
    return (
        <div
            className="card"
            style={{ cursor: href ? 'pointer' : 'default', position: 'relative', overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onClick={() => href && navigate(href)}
            onMouseEnter={e => { if (href) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: color + '18', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    <Icon size={18} />
                </div>
                {href && <ArrowUpRight size={14} style={{ color: 'var(--ink-3)', marginTop: 2 }} />}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
        </div>
    );
}

const SectionHeader = ({ title, action, onAction }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>{title}</div>
        {action && <button className="btn btn-ghost btn-sm" onClick={onAction}>{action} →</button>}
    </div>
);

const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
            {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></div>)}
        </div>
    );
};

/* ══════════════════════════════════════════════════════════ */
export default function OperationsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/dashboard/operations').then(r => setData(r.data.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
    if (!data) return null;

    const breakdown = data.status_breakdown || [];
    const total = breakdown.reduce((s, b) => s + b.count, 0);

    // Build 7-day completion trend
    const trendData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        const found = (data.completion_trend || []).find(c => c._id === key);
        return { day: DAYS[d.getDay()], completed: found?.completed || 0 };
    });

    // Priority pie
    const priorityData = (data.priority_breakdown || []).map(p => ({
        name: p._id || 'normal',
        value: p.count,
        color: PRIORITY_COLORS[p._id] || '#90a4ae',
    }));

    // Status donut
    const statusPieData = breakdown.map(b => ({
        name: b._id?.replace(/_/g, ' '),
        value: b.count,
        color: STATUS_COLORS[b._id] || '#90a4ae',
    }));

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">My Workload</div>
                    <div className="page-subtitle">Assigned service orders, priorities, and progress</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/operations/service-orders')}>
                    View All Orders <ChevronRight size={13} />
                </button>
            </div>

            {/* Alerts */}
            {data.overdue_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 12, background: '#ffebee', border: '1px solid #ef535040', marginBottom: 20 }}>
                    <XCircle size={16} style={{ color: '#c62828', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#c62828', flex: 1 }}>
                        <strong>{data.overdue_count}</strong> overdue order{data.overdue_count > 1 ? 's' : ''} — requires immediate attention
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/operations/service-orders')}>Review →</button>
                </div>
            )}
            {data.due_today > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 12, background: '#fff9c418', border: '1px solid #ffa72640', marginBottom: 20 }}>
                    <AlertTriangle size={16} style={{ color: '#ffa726', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                        <strong>{data.due_today}</strong> order{data.due_today > 1 ? 's' : ''} due <strong>today</strong>
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/operations/service-orders')}>View →</button>
                </div>
            )}

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                <StatCard label="Assigned Orders" value={data.assigned_jobs || 0} icon={Briefcase} color="#5c6bc0" href="/operations/service-orders" />
                <StatCard label="Awaiting Docs" value={data.pending_documents || 0} icon={FileText} color="#1976d2"
                    sub={data.pending_documents > 0 ? 'Needs follow-up' : 'All clear'} href="/operations/service-orders" />
                <StatCard label="Completed (Week)" value={data.completed_this_week || 0} icon={CheckCircle} color="#2e7d32" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard label="Due Today" value={data.due_today || 0} icon={AlertTriangle} color="#f57c00" />
                <StatCard label="Overdue" value={data.overdue_count || 0} icon={Clock} color="#c62828" />
                <StatCard label="Completion Rate" value={`${data.completion_rate || 0}%`} icon={TrendingUp} color="#26a69a"
                    sub={data.completion_rate >= 50 ? '✓ On track' : 'Needs attention'} />
            </div>

            {/* Row: Completion Trend + Priority Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* 7-day completion bar chart */}
                <div className="card">
                    <SectionHeader title="7-Day Completion Trend" />
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTip />} />
                            <Bar dataKey="completed" name="Completed" fill="#2e7d32" radius={[4, 4, 0, 0]}>
                                {trendData.map((_, i) => <Cell key={i} fill={trendData[i].completed > 0 ? '#2e7d32' : '#e8f5e9'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Priority donut */}
                <div className="card">
                    <SectionHeader title="By Priority" />
                    {priorityData.length === 0 ? (
                        <div className="empty"><Zap style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2, width: 28 }} /><p>No active orders</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={130}>
                                <PieChart>
                                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                                        dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                                        {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(val, name) => [val, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: -4 }}>
                                {priorityData.map(p => (
                                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                        <span style={{ flex: 1, textTransform: 'capitalize', color: 'var(--ink-2)' }}>{p.name}</span>
                                        <span style={{ fontWeight: 700 }}>{p.value}</span>
                                        <span style={{ color: p.color, fontSize: 10, fontWeight: 700 }}>{pctOf(p.value, priorityData.reduce((s, x) => s + x.value, 0))}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Row: Status Pipeline + Urgent Jobs + Due Soon */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Status donut */}
                <div className="card">
                    <SectionHeader title="Order Pipeline" />
                    {statusPieData.length === 0 ? (
                        <div className="empty"><p>No orders assigned</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                                        dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                                        {statusPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(val, name) => [val, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{total}</div>
                            </div>
                            {statusPieData.slice(0, 5).map(s => (
                                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, marginBottom: 4, cursor: 'pointer' }}
                                    onClick={() => navigate(`/operations/service-orders?status=${s.name.replace(/ /g, '_')}`)}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1, color: 'var(--ink-2)', textTransform: 'capitalize' }}>{s.name}</span>
                                    <span style={{ fontWeight: 700 }}>{s.value}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Urgent Jobs */}
                <div className="card">
                    <SectionHeader title="🔥 High Priority" action="All orders" onAction={() => navigate('/operations/service-orders')} />
                    {(data.urgent_jobs || []).length === 0 ? (
                        <div className="empty" style={{ padding: '20px 0' }}>
                            <CheckSquare size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2 }} />
                            <p>All clear — no urgent jobs!</p>
                        </div>
                    ) : (data.urgent_jobs || []).map((j, i) => {
                        const dueDate = j.due_date ? new Date(j.due_date) : null;
                        const isOverdue = dueDate && dueDate < new Date();
                        return (
                            <div key={j._id} onClick={() => navigate(`/operations/service-orders/${j._id}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < data.urgent_jobs.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                <div className="avatar" style={{ background: '#c62828', color: '#fff', width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>{j.client?.company_name?.charAt(0)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.client?.company_name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{j.package?.name}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <span className={`pill pill-${j.status}`} style={{ fontSize: 9 }}>{j.status?.replace(/_/g, ' ')}</span>
                                    {dueDate && <div style={{ fontSize: 10, marginTop: 2, color: isOverdue ? '#c62828' : '#ff8f00', fontWeight: 700 }}>{isOverdue ? '⚠ Overdue' : dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Due Soon */}
                <div className="card">
                    <SectionHeader title="⏰ Due Soon (3 Days)" action="See all" onAction={() => navigate('/operations/service-orders')} />
                    {(data.due_soon || []).length === 0 ? (
                        <div className="empty" style={{ padding: '20px 0' }}>
                            <Clock size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2 }} />
                            <p>Nothing due in next 3 days</p>
                        </div>
                    ) : (data.due_soon || []).map((j, i) => (
                        <div key={j._id} onClick={() => navigate(`/operations/service-orders/${j._id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < data.due_soon.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>{j.client?.company_name?.charAt(0)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.client?.company_name}</div>
                                <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{j.package?.name}</div>
                            </div>
                            <div style={{ fontSize: 11, color: '#ff8f00', fontWeight: 700, flexShrink: 0 }}>
                                {new Date(j.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Completions */}
            <div className="card">
                <SectionHeader title="Recent Completions" action="See all" onAction={() => navigate('/operations/service-orders')} />
                {(data.recent_completions || []).length === 0 ? (
                    <div className="empty"><p>No completed orders yet</p></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {(data.recent_completions || []).map(j => (
                            <div key={j._id} onClick={() => navigate(`/operations/service-orders/${j._id}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#e8f5e920', border: '1px solid #2e7d3220', borderRadius: 10, cursor: 'pointer' }}>
                                <div className="avatar" style={{ background: '#2e7d32', color: '#fff', width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>{j.client?.company_name?.charAt(0)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.client?.company_name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{j.package?.name}</div>
                                </div>
                                <CheckCircle size={14} style={{ color: '#2e7d32', flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
