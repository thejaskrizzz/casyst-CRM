import { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    LineChart, Line, Tooltip, XAxis, YAxis, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts';
import {
    TrendingUp, Users, Receipt, Briefcase, DollarSign,
    CheckCircle, Target, Phone, BarChart2, RefreshCw
} from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#5c6bc0', '#29b6f6', '#ffa726', '#66bb6a', '#ef5350', '#8d6e63', '#26a69a', '#ab47bc'];
const ACCENT = '#2563eb';

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtK = n => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : fmt(n);
const pct = (a, b) => b ? `${Math.round((a / b) * 100)}%` : '0%';

const ChartTip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
            {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: <b>{typeof p.value === 'number' && p.value > 1000 ? fmtK(p.value) : p.value}</b></div>)}
        </div>
    );
};

function KPI({ label, value, sub, icon: Icon, color = ACCENT, trend }) {
    return (
        <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: color + '18' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}><Icon size={18} /></div>
                {trend != null && <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#2e7d32' : '#c62828', background: (trend >= 0 ? '#e8f5e9' : '#fce4ec'), padding: '2px 8px', borderRadius: 99 }}>{trend >= 0 ? '+' : ''}{trend}%</span>}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
        </div>
    );
}

export default function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return d.toISOString().slice(0, 10); });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

    const fetch = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/analytics/overview?from=${from}&to=${to}`);
            setData(r.data.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    if (loading) return <div className="page-body"><div style={{ textAlign: 'center', padding: 80, color: 'var(--ink-3)' }}><RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} /><p style={{ marginTop: 12 }}>Loading analytics…</p></div></div>;
    if (!data) return null;

    const { kpis, lead_status_breakdown, lead_source_breakdown, quote_status_breakdown, lead_trend, revenue_trend, conversion_trend, top_packages } = data;

    const revTrend = kpis.revenue_last_month ? Math.round(((kpis.total_revenue - kpis.revenue_last_month) / kpis.revenue_last_month) * 100) : null;

    return (
        <div className="page-body">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Analytics</h1>
                    <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>Business-wide performance overview</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="form-input" style={{ width: 150 }} />
                    <span style={{ color: 'var(--ink-3)' }}>→</span>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className="form-input" style={{ width: 150 }} />
                    <button className="btn btn-primary" onClick={fetch}><RefreshCw size={14} /> Apply</button>
                </div>
            </div>

            {/* KPI Row 1 — Leads */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                <KPI label="Total Leads" value={kpis.total_leads} icon={Users} color="#5c6bc0" sub={`+${kpis.new_this_month} this month`} />
                <KPI label="Converted (Month)" value={kpis.converted_this_month} icon={CheckCircle} color="#26a69a" sub={`${kpis.conversion_rate}% rate`} />
                <KPI label="Total Quotes" value={kpis.total_quotes} icon={Receipt} color="#ffa726" sub={`${kpis.quote_acceptance_rate}% acceptance`} />
                <KPI label="Total Orders" value={kpis.total_orders} icon={Briefcase} color="#29b6f6" sub={`+${kpis.orders_this_month} this month`} />
            </div>

            {/* KPI Row 2 — Revenue */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <KPI label="Total Revenue" value={fmtK(kpis.total_revenue)} icon={DollarSign} color="#2e7d32" trend={revTrend} />
                <KPI label="Collected" value={fmtK(kpis.total_paid)} icon={Target} color={ACCENT} sub={pct(kpis.total_paid, kpis.total_revenue) + ' collected'} />
                <KPI label="Balance Due" value={fmtK(kpis.total_balance)} icon={BarChart2} color="#c62828" sub="pending collection" />
            </div>

            {/* Charts Row 1 — Lead Trend + Revenue */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 20 }}>
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>Lead Acquisition Trend</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={lead_trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} /><stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#26a69a" stopOpacity={0.2} /><stop offset="95%" stopColor="#26a69a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="created" name="Leads Created" stroke={ACCENT} strokeWidth={2} fill="url(#gC)" dot={{ r: 3, fill: ACCENT }} />
                            <Area type="monotone" dataKey="converted" name="Converted" stroke="#26a69a" strokeWidth={2} fill="url(#gConv)" dot={{ r: 3, fill: '#26a69a' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>Revenue Trend</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={revenue_trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-3)' }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
                            <Tooltip content={<ChartTip />} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="value" name="Project Value" fill={ACCENT} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="paid" name="Collected" fill="#66bb6a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 — Status Breakdowns + Source */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Lead Status Donut */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>Lead Pipeline Status</div>
                    {lead_status_breakdown.length === 0 ? <div className="empty"><p>No data</p></div> : (
                        <>
                            <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie data={lead_status_breakdown.map(x => ({ name: x._id, value: x.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                                        {lead_status_breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v, n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
                                {lead_status_breakdown.slice(0, 5).map((x, i) => (
                                    <div key={x._id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                        <span style={{ flex: 1, color: 'var(--ink-2)', textTransform: 'capitalize' }}>{x._id?.replace(/_/g, ' ')}</span>
                                        <span style={{ fontWeight: 700 }}>{x.count}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Lead Source */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>Lead Sources</div>
                    {lead_source_breakdown.length === 0 ? <div className="empty"><p>No data</p></div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {lead_source_breakdown.slice(0, 7).map((s, i) => {
                                const max = Math.max(...lead_source_breakdown.map(x => x.count));
                                return (
                                    <div key={s._id || i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                            <span style={{ color: 'var(--ink-2)', textTransform: 'capitalize', fontWeight: 500 }}>{s._id || 'Unknown'}</span>
                                            <span style={{ fontWeight: 700 }}>{s.count}</span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(s.count / max) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 99, transition: 'width 0.6s' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Top Packages */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>Top Packages by Orders</div>
                    {top_packages.length === 0 ? <div className="empty"><p>No orders yet</p></div> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {top_packages.map((p, i) => {
                                const max = Math.max(...top_packages.map(x => x.count));
                                return (
                                    <div key={p._id || i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                            <span style={{ color: 'var(--ink-2)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{p.name}</span>
                                            <span style={{ fontWeight: 700, flexShrink: 0 }}>{p.count} orders · {fmtK(p.revenue)}</span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(p.count / max) * 100}%`, background: '#66bb6a', borderRadius: 99, transition: 'width 0.6s' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Quote Status */}
            <div className="card">
                <div className="section-title" style={{ marginBottom: 16 }}>Quote Performance Breakdown</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {quote_status_breakdown.map((q, i) => (
                        <div key={q._id} style={{ flex: '1 1 140px', background: 'var(--surface-2)', borderRadius: 14, padding: '14px 18px' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-3)', fontWeight: 600, marginBottom: 6 }}>{q._id}</div>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{q.count}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{fmtK(q.value)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
