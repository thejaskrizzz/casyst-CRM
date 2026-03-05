import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
    TrendingUp, AlertTriangle, Users, Building2, CheckCircle,
    ArrowUpRight, Receipt, Briefcase, Target, ChevronRight, Star
} from 'lucide-react';

/* ──────────────────────── palette ───────────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ACCENT = '#5c6bc0';
const LEAD_STATUS_COLORS = {
    new: '#5c6bc0', contacted: '#29b6f6', followup: '#ffa726',
    interested: '#66bb6a', not_interested: '#ef5350', lost: '#8d6e63', converted: '#26a69a',
};
const ORDER_STATUS_COLORS = {
    pending_documents: '#f57c00', documents_received: '#1976d2',
    verification: '#7b1fa2', gov_submission: '#0097a7',
    approval_waiting: '#ff8f00', completed: '#2e7d32', rejected: '#c62828', on_hold: '#546e7a',
};
const CHART_PALETTE = ['#5c6bc0', '#29b6f6', '#ffa726', '#66bb6a', '#ef5350', '#8d6e63', '#26a69a', '#ff8f00'];

/* ──────────────────────── helpers ──────────────────────── */
const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pctOf = (n, d) => d ? Math.round((n / d) * 100) : 0;

/* ──────────────────────── reusable components ─────────────── */
function StatCard({ label, value, icon: Icon, color = ACCENT, sub, href }) {
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
export default function ManagerDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/dashboard/manager').then(r => setData(r.data.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
    if (!data) return null;

    /* ── derive chart data ────────────────────────────────── */
    const now = new Date();

    // 6-month lead+conversion trend
    const trendData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now); d.setMonth(d.getMonth() - (5 - i));
        const yr = d.getFullYear(), mo = d.getMonth() + 1;
        const lt = (data.lead_trend || []).find(t => t._id.year === yr && t._id.month === mo);
        const ot = (data.order_trend || []).find(t => t._id.year === yr && t._id.month === mo);
        return { month: MONTHS[d.getMonth()], leads: lt?.created || 0, converted: lt?.converted || 0, orders: ot?.completed || 0 };
    });

    // Sales performance bar data
    const salesBarData = (data.sales_performance || []).slice(0, 6).map(s => ({
        name: s.name?.split(' ')[0] || 'Unknown',
        total: s.total,
        converted: s.converted,
        interested: s.interested || 0,
        rate: pctOf(s.converted, s.total),
    }));

    // Revenue bar data
    const revenueData = (data.revenue_by_package || []).slice(0, 6).map(r => ({
        name: r._id?.length > 18 ? r._id.slice(0, 16) + '…' : r._id,
        revenue: r.revenue || 0,
        count: r.count,
    }));

    // Lead status donut
    const leadPieData = (data.lead_status_breakdown || []).map(b => ({
        name: b._id?.replace(/_/g, ' '),
        value: b.count,
        color: LEAD_STATUS_COLORS[b._id] || '#90a4ae',
    }));
    const totalLeadsAll = leadPieData.reduce((s, p) => s + p.value, 0);

    // Order status donut
    const orderPieData = (data.order_status_breakdown || []).map(b => ({
        name: b._id?.replace(/_/g, ' '),
        value: b.count,
        color: ORDER_STATUS_COLORS[b._id] || '#90a4ae',
    }));
    const totalOrdersAll = orderPieData.reduce((s, p) => s + p.value, 0);

    const convRate = pctOf(data.conversions_this_month, data.total_leads);
    const qAccRate = pctOf(data.quote_stats?.accepted, data.quote_stats?.total);

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header">
                <div>
                    <div className="page-title">Manager Overview</div>
                    <div className="page-subtitle">Team pipeline, revenue, and performance at a glance</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline" onClick={() => navigate('/manager/leads')}>
                        Leads <ChevronRight size={13} />
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/manager/service-orders')}>
                        Service Orders <ChevronRight size={13} />
                    </button>
                </div>
            </div>

            {/* Delayed alert */}
            {data.delayed_services > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 12, background: '#ffebee', border: '1px solid #ef535040', marginBottom: 20 }}>
                    <AlertTriangle size={16} style={{ color: '#c62828', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#c62828', flex: 1 }}>
                        <strong>{data.delayed_services}</strong> overdue service order{data.delayed_services > 1 ? 's' : ''} — action needed
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/manager/service-orders')}>Review →</button>
                </div>
            )}

            {/* KPI Row 1 — Lead & Client */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <StatCard label="Total Leads" value={data.total_leads || 0} icon={TrendingUp} color={ACCENT} href="/manager/leads" />
                <StatCard label="Conversions (Month)" value={data.conversions_this_month || 0} icon={CheckCircle} color="#26a69a"
                    sub={convRate > 0 ? `${convRate}% rate` : null} />
                <StatCard label="Total Clients" value={data.total_clients || 0} icon={Users} color="#1976d2" href="/manager/clients" />
                <StatCard label="Delayed Orders" value={data.delayed_services || 0} icon={AlertTriangle} color="#c62828" href="/manager/service-orders" />
            </div>

            {/* KPI Row 2 — Orders & Quotes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard label="Total Orders" value={data.total_orders || 0} icon={Briefcase} color="#7b1fa2" href="/manager/service-orders" />
                <StatCard label="Completed Orders" value={data.completed_orders || 0} icon={CheckCircle} color="#2e7d32"
                    sub={`${data.ops_rate || 0}% completion rate`} />
                <StatCard label="Total Quotes" value={data.quote_stats?.total || 0} icon={Receipt} color="#f57c00" />
                <StatCard label="Quote Value" value={fmt(data.quote_stats?.totalValue)} icon={Target} color="#0097a7"
                    sub={qAccRate > 0 ? `${qAccRate}% accepted` : null} />
            </div>

            {/* Row: 6-Month Trend Chart */}
            <div className="card" style={{ marginBottom: 20 }}>
                <SectionHeader title="6-Month Performance Trend" />
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trendData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                        <defs>
                            <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#26a69a" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#26a69a" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.20} />
                                <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Area type="monotone" dataKey="leads" name="Leads Created" stroke={ACCENT} strokeWidth={2} fill="url(#gLeads)" dot={{ r: 3, fill: ACCENT }} />
                        <Area type="monotone" dataKey="converted" name="Converted" stroke="#26a69a" strokeWidth={2} fill="url(#gConv)" dot={{ r: 3, fill: '#26a69a' }} />
                        <Area type="monotone" dataKey="orders" name="Orders Completed" stroke="#2e7d32" strokeWidth={2} fill="url(#gOrders)" dot={{ r: 3, fill: '#2e7d32' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Row: Sales Performance Bar + Revenue Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Sales Team Performance */}
                <div className="card">
                    <SectionHeader title="Sales Team Performance" />
                    {salesBarData.length === 0 ? (
                        <div className="empty"><p>No sales data yet</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={salesBarData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<ChartTip />} />
                                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                                    <Bar dataKey="total" name="Total" fill={ACCENT} radius={[3, 3, 0, 0]} />
                                    <Bar dataKey="converted" name="Converted" fill="#26a69a" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Leaderboard */}
                            <div style={{ marginTop: 12 }}>
                                {(data.sales_performance || []).slice(0, 4).map((s, i) => {
                                    const maxT = Math.max(...(data.sales_performance || []).map(x => x.total));
                                    return (
                                        <div key={s._id || i} style={{ marginBottom: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                                <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{s.name}</span>
                                                <span style={{ color: '#26a69a', fontWeight: 700 }}>{pctOf(s.converted, s.total)}% conv. rate</span>
                                            </div>
                                            <div style={{ display: 'flex', height: 5, gap: 2, borderRadius: 99, overflow: 'hidden', background: 'var(--surface-2)' }}>
                                                <div style={{ width: `${pctOf(s.total, maxT)}%`, background: ACCENT }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Revenue by Package (horizontal bars) */}
                <div className="card">
                    <SectionHeader title="Revenue by Package" />
                    {revenueData.length === 0 ? (
                        <div className="empty"><p>No completed orders yet</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={revenueData} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false}
                                        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--ink-2)' }} axisLine={false} tickLine={false} width={110} />
                                    <Tooltip formatter={(v, name) => [fmt(v), name === 'revenue' ? 'Revenue' : name]} />
                                    <Bar dataKey="revenue" name="Revenue" fill="#ffa726" radius={[0, 4, 4, 0]}>
                                        {revenueData.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div style={{ marginTop: 12 }}>
                                {(data.revenue_by_package || []).slice(0, 4).map((r, i) => (
                                    <div key={r._id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_PALETTE[i % CHART_PALETTE.length], flexShrink: 0 }} />
                                            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{r._id}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, fontSize: 12 }}>{fmt(r.revenue)}</div>
                                            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{r.count} order{r.count > 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Row: Lead Pipeline + Order Pipeline + Ops Completion */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Lead Pipeline Donut */}
                <div className="card">
                    <SectionHeader title="Lead Pipeline" />
                    {leadPieData.length === 0 ? (
                        <div className="empty"><p>No leads yet</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie data={leadPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                                        dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                                        {leadPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(val, name) => [val, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{totalLeadsAll}</div>
                            </div>
                            {leadPieData.map(p => (
                                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, marginBottom: 4 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1, textTransform: 'capitalize', color: 'var(--ink-2)' }}>{p.name}</span>
                                    <span style={{ fontWeight: 700 }}>{p.value}</span>
                                    <span style={{ color: 'var(--ink-3)', fontSize: 10, width: 28, textAlign: 'right' }}>{pctOf(p.value, totalLeadsAll)}%</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Order Pipeline Donut */}
                <div className="card">
                    <SectionHeader title="Order Pipeline" />
                    {orderPieData.length === 0 ? (
                        <div className="empty"><p>No orders yet</p></div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={140}>
                                <PieChart>
                                    <Pie data={orderPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                                        dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                                        {orderPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(val, name) => [val, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{totalOrdersAll}</div>
                            </div>
                            {orderPieData.slice(0, 6).map(p => (
                                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, marginBottom: 4 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                    <span style={{ flex: 1, textTransform: 'capitalize', color: 'var(--ink-2)' }}>{p.name}</span>
                                    <span style={{ fontWeight: 700 }}>{p.value}</span>
                                    <span style={{ color: 'var(--ink-3)', fontSize: 10, width: 28, textAlign: 'right' }}>{pctOf(p.value, totalOrdersAll)}%</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Ops Completion Leaderboard */}
                <div className="card">
                    <SectionHeader title="Ops Team Completion" />
                    {(data.ops_completion || []).length === 0 ? (
                        <div className="empty"><p>No data yet</p></div>
                    ) : (data.ops_completion || []).map((op, i) => {
                        const rate = pctOf(op.completed, op.total);
                        return (
                            <div key={op._id || i} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <div className="avatar" style={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}>{op.name?.charAt(0)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{op.completed}/{op.total} completed</div>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: rate >= 75 ? '#2e7d32' : rate >= 40 ? '#ffa726' : '#c62828' }}>{rate}%</span>
                                </div>
                                <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${rate}%`, background: rate >= 75 ? '#2e7d32' : rate >= 40 ? '#ffa726' : '#c62828', borderRadius: 99, transition: 'width 0.6s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Conversions */}
            <div className="card">
                <SectionHeader title="Recent Conversions" action="All leads" onAction={() => navigate('/manager/leads')} />
                {(data.recent_conversions || []).length === 0 ? (
                    <div className="empty"><p>No conversions yet this month</p></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {(data.recent_conversions || []).map(l => (
                            <div key={l._id}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#e8f5e920', border: '1px solid #26a69a30', borderRadius: 10 }}>
                                <div className="avatar" style={{ background: '#26a69a', color: '#fff', width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>{l.name?.charAt(0)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                                        {l.assigned_to?.name ? `by ${l.assigned_to.name}` : ''}
                                        {l.interested_package?.name ? ` · ${l.interested_package.name}` : ''}
                                    </div>
                                </div>
                                <Star size={13} style={{ color: '#26a69a', flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
