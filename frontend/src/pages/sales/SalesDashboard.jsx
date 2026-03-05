import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    Tooltip, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
    TrendingUp, Phone, CheckCircle, XCircle, ChevronRight,
    Receipt, Star, AlertTriangle, Clock, Users, ArrowUpRight, Target
} from 'lucide-react';

/* ── palette ─────────────────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_COLORS = {
    new: '#5c6bc0', contacted: '#29b6f6', followup: '#ffa726',
    interested: '#66bb6a', not_interested: '#ef5350', lost: '#8d6e63', converted: '#26a69a',
};
const DONUT_COLORS = ['#5c6bc0', '#29b6f6', '#ffa726', '#66bb6a', '#ef5350', '#8d6e63', '#26a69a'];
const ACCENT = '#5c6bc0';

/* ── helpers ─────────────────────────────── */
const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const pctOf = (n, d) => d ? Math.round((n / d) * 100) : 0;

/* ── KPI Card ─────────────────────────────── */
function StatCard({ label, value, icon: Icon, color = ACCENT, sub, href }) {
    const navigate = useNavigate();
    return (
        <div
            className="card"
            style={{ cursor: href ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s', position: 'relative', overflow: 'hidden' }}
            onClick={() => href && navigate(href)}
            onMouseEnter={e => { if (href) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
            {/* Colored accent blob */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: color + '18', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    <Icon size={18} />
                </div>
                {href && <ArrowUpRight size={14} style={{ color: 'var(--ink-3)', marginTop: 2 }} />}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
        </div>
    );
}

/* ── Section Header ─────────────────────── */
const SectionHeader = ({ title, action, onAction }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="section-title" style={{ margin: 0 }}>{title}</div>
        {action && <button className="btn btn-ghost btn-sm" onClick={onAction}>{action} →</button>}
    </div>
);

/* ── Custom tooltip ─────────────────────── */
const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>{label}</div>
            {payload.map(p => (
                <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
                    {p.name}: <b>{p.value}</b>
                </div>
            ))}
        </div>
    );
};

/* ══════════════════════════════════════════ */
export default function SalesDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/dashboard/sales').then(r => setData(r.data.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
    if (!data) return null;

    /* ── derive chart data ─────────────────── */
    const total = (data.status_breakdown || []).reduce((s, b) => s + b.count, 0);
    const convRate = pctOf(data.conversions_this_month, data.myLeads);
    const qRate = pctOf(data.quote_stats?.accepted, data.quote_stats?.total);

    // Build 6-month trend with month labels
    const trendData = (() => {
        const now = new Date();
        return Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now); d.setMonth(d.getMonth() - (5 - i));
            const yr = d.getFullYear(), mo = d.getMonth() + 1;
            const found = (data.lead_trend || []).find(t => t._id.year === yr && t._id.month === mo);
            return { month: MONTHS[d.getMonth()], created: found?.created || 0, converted: found?.converted || 0 };
        });
    })();

    // Build 7-day call data
    const callData = (() => {
        const now = new Date();
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now); d.setDate(d.getDate() - (6 - i));
            const key = d.toISOString().slice(0, 10);
            const found = (data.call_activity || []).find(c => c._id === key);
            return { day: DAYS[d.getDay()], calls: found?.calls || 0 };
        });
    })();

    // Pipeline donut
    const pieData = (data.status_breakdown || []).map(b => ({
        name: b._id?.replace(/_/g, ' '),
        value: b.count,
        color: STATUS_COLORS[b._id] || '#90a4ae',
    }));

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <div className="page-title">My Sales Dashboard</div>
                    <div className="page-subtitle">Your pipeline, quotes, and activity at a glance</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline" onClick={() => navigate('/sales/quotes/new')}>
                        <Receipt size={13} /> New Quote
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/sales/leads')}>
                        View Leads <ChevronRight size={13} />
                    </button>
                </div>
            </div>

            {/* ── Followup alert strip ── */}
            {data.followups_today > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 12, background: '#fff9c418', border: '1px solid #ffa72640', marginBottom: 20 }}>
                    <Phone size={16} style={{ color: '#ffa726', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                        You have <strong>{data.followups_today}</strong> follow-up{data.followups_today > 1 ? 's' : ''} scheduled for <strong>today</strong>
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/sales/leads')}>View →</button>
                </div>
            )}

            {/* ── Overdue alert ── */}
            {(data.overdue_followups || []).length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 12, background: '#ffebee', border: '1px solid #ef535040', marginBottom: 20 }}>
                    <AlertTriangle size={16} style={{ color: '#ef5350', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#c62828', flex: 1 }}>
                        {data.overdue_followups.length} overdue follow-up{data.overdue_followups.length > 1 ? 's' : ''} — action needed
                    </span>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/sales/leads')}>Review →</button>
                </div>
            )}

            {/* ── KPI row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard label="My Leads" value={data.myLeads || 0} icon={Users} color={ACCENT} href="/sales/leads" />
                <StatCard label="Interested" value={data.interested_leads || 0} icon={Star} color="#66bb6a" href="/sales/leads" />
                <StatCard label="Converted (Month)" value={data.conversions_this_month || 0} icon={CheckCircle} color="#26a69a"
                    sub={convRate > 0 ? `${convRate}% rate` : null} />
                <StatCard label="Follow-ups Today" value={data.followups_today || 0} icon={Phone} color="#ffa726" />
                <StatCard label="Lost" value={data.lost_leads || 0} icon={XCircle} color="#ef5350" />
            </div>

            {/* ── Quote KPI row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                <StatCard label="Total Quotes" value={data.quote_stats?.total || 0} icon={Receipt} color="#7b1fa2" href="/sales/quotes" />
                <StatCard label="Quote Value" value={fmt(data.quote_stats?.totalValue)} icon={TrendingUp} color="#1976d2" />
                <StatCard label="Accepted" value={data.quote_stats?.accepted || 0} icon={CheckCircle} color="#2e7d32"
                    sub={qRate > 0 ? `${qRate}% acceptance` : null} />
                <StatCard label="Sent / Pending" value={data.quote_stats?.sent || 0} icon={Clock} color="#ff8f00" href="/sales/quotes" />
            </div>

            {/* ── Row: Lead Trend + Call Activity ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Lead Trend Area Chart */}
                <div className="card">
                    <SectionHeader title="6-Month Lead Trend" />
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradConverted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#26a69a" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#26a69a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                            <Area type="monotone" dataKey="created" name="Leads Created" stroke={ACCENT} strokeWidth={2} fill="url(#gradCreated)" dot={{ r: 3, fill: ACCENT }} />
                            <Area type="monotone" dataKey="converted" name="Converted" stroke="#26a69a" strokeWidth={2} fill="url(#gradConverted)" dot={{ r: 3, fill: '#26a69a' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Call Activity Bar Chart */}
                <div className="card">
                    <SectionHeader title="Call Activity (7 Days)" />
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={callData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTip />} />
                            <Bar dataKey="calls" name="Calls Logged" fill="#29b6f6" radius={[4, 4, 0, 0]}>
                                {callData.map((_, i) => (
                                    <Cell key={i} fill={callData[i].calls > 0 ? '#29b6f6' : '#e3f2fd'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>



            {/* ── Row: Recent Leads + Recent Quotes ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Recent Leads */}
                <div className="card">
                    <SectionHeader title="Recent Leads" action="See all" onAction={() => navigate('/sales/leads')} />
                    {(data.recent_leads || []).length === 0 ? (
                        <div className="empty"><p>No leads yet</p></div>
                    ) : (
                        <div>
                            {(data.recent_leads || []).map((l, i) => (
                                <div
                                    key={l._id}
                                    onClick={() => navigate(`/sales/leads/${l._id}`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < data.recent_leads.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                >
                                    <div className="avatar" style={{ background: STATUS_COLORS[l.status] + '33', color: STATUS_COLORS[l.status], width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>{l.name?.charAt(0)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l.phone}{l.interested_package?.name ? ` · ${l.interested_package.name}` : ''}</div>
                                    </div>
                                    <span className={`pill pill-${l.status}`} style={{ fontSize: 10, flexShrink: 0 }}>{l.status?.replace(/_/g, ' ')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Quotes */}
                <div className="card">
                    <SectionHeader title="Recent Quotes" action="See all" onAction={() => navigate('/sales/quotes')} />
                    {(data.recent_quotes || []).length === 0 ? (
                        <div className="empty">
                            <Receipt style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2, width: 28 }} />
                            <p>No quotes created yet</p>
                            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/sales/quotes/new')}>Create First Quote</button>
                        </div>
                    ) : (
                        <div>
                            {(data.recent_quotes || []).map((q, i) => {
                                const SM = { draft: '#546e7a', sent: '#1976d2', viewed: '#7b1fa2', accepted: '#2e7d32', rejected: '#c62828', expired: '#bf360c', revised: '#ff8f00' };
                                const col = SM[q.status] || '#546e7a';
                                return (
                                    <div
                                        key={q._id}
                                        onClick={() => navigate(`/sales/quotes/${q._id}`)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < data.recent_quotes.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: col + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, flexShrink: 0 }}>
                                            <Receipt size={14} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{q.reference_no}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{q.contact_name}{q.company_name ? ` · ${q.company_name}` : ''}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(q.total)}</div>
                                            <span style={{ fontSize: 10, fontWeight: 700, background: col + '18', color: col, padding: '2px 7px', borderRadius: 99 }}>{q.status}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
