import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import api from '../../api/axios';
import {
    Users, TrendingUp, Package, CheckCircle, DollarSign,
    Briefcase, ArrowUpRight, ChevronRight, Activity
} from 'lucide-react';

// ── Colours ──────────────────────────────────────────────
const ROLE_COLORS = { admin: '#1a1a1a', manager: '#1976d2', sales: '#7b1fa2', operations: '#2e7d32' };
const STATUS_COLORS = {
    new: '#90a4ae', contacted: '#42a5f5', followup: '#ff8f00', interested: '#66bb6a',
    not_interested: '#ef5350', lost: '#b71c1c', converted: '#1b5e20',
    pending_documents: '#f57c00', documents_received: '#1976d2',
    verification: '#7b1fa2', gov_submission: '#0097a7', approval_waiting: '#ff8f00',
    completed: '#2e7d32', rejected: '#c62828', on_hold: '#546e7a',
};
const CHART_COLORS = ['#1a1a1a', '#1976d2', '#7b1fa2', '#2e7d32', '#f57c00', '#0097a7'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helpers ───────────────────────────────────────────────
const fmt = (n) => n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;
const fmtMonth = (d) => `${MONTHS[d.month - 1]} ${String(d.year).slice(2)}`;

const TooltipBox = ({ active, payload, label, currency }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: 120 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 5, fontWeight: 600 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ color: '#555' }}>{p.name}: </span>
                    <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{currency ? fmt(p.value) : p.value}</span>
                </div>
            ))}
        </div>
    );
};

// ── Stat Card ─────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color = '#1a1a1a', sub, trend, onClick }) => (
    <div className="stat-card" style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }} onClick={onClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                <Icon size={18} />
            </div>
            {trend !== undefined && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#2e7d32' : '#c62828', background: (trend >= 0 ? '#2e7d32' : '#c62828') + '18', padding: '3px 8px', borderRadius: 99 }}>
                    <ArrowUpRight size={10} /> {trend >= 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <div style={{ marginTop: 16, fontWeight: 800, fontSize: 28, letterSpacing: '-1px', color: '#1a1a1a' }}>{value}</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 3, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{sub}</div>}
    </div>
);

// ── Mini donut (custom SVG) ────────────────────────────────
const MiniDonut = ({ data, total }) => {
    if (!data?.length) return null;
    let offset = 0;
    const r = 52, cx = 60, cy = 60, stroke = 18;
    const circ = 2 * Math.PI * r;
    return (
        <svg width={120} height={120} viewBox="0 0 120 120">
            {data.map((d, i) => {
                const pct = d.count / total;
                const dash = pct * circ;
                const gap = circ - dash;
                const el = (
                    <circle key={d._id} cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={ROLE_COLORS[d._id] || CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={stroke}
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 60 60)"
                    />
                );
                offset += dash;
                return el;
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#1a1a1a" fontSize={20} fontWeight={800}>{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#888" fontSize={9} fontWeight={600}>TOTAL</text>
        </svg>
    );
};

// ── Main Dashboard ─────────────────────────────────────────
export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/dashboard/admin').then(r => setData(r.data.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div className="spinner" />
        </div>
    );

    const completionRate = data?.total_service_orders
        ? Math.round((data.completed_orders / data.total_service_orders) * 100) : 0;
    const conversionRate = data?.total_leads
        ? Math.round(((data.leads_by_status?.find(s => s._id === 'converted')?.count || 0) / data.total_leads) * 100) : 0;

    // Shape time-series data for recharts
    const leadsChartData = (data?.leads_over_time || []).map(d => ({
        month: fmtMonth(d._id), created: d.created, converted: d.converted,
    }));
    const revenueChartData = (data?.revenue_over_time || []).map(d => ({
        month: fmtMonth(d._id), revenue: d.revenue, orders: d.count,
    }));

    // Lead status for pie
    const leadPieData = (data?.leads_by_status || []).filter(s => s.count > 0);

    return (
        <div>
            {/* ── Header ── */}
            <div className="page-header">
                <div>
                    <div className="page-title">CRM Overview</div>
                    <div className="page-subtitle">System-wide analytics & performance metrics</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline" onClick={() => navigate('/admin/leads')}>
                        Manage Leads <ChevronRight size={13} />
                    </button>
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div className="grid-4 mb-6">
                <StatCard label="Total Users" value={data?.total_users || 0} icon={Users} color="#1a1a1a" onClick={() => navigate('/admin/users')} />
                <StatCard label="Total Leads" value={data?.total_leads || 0} icon={TrendingUp} color="#1976d2" onClick={() => navigate('/admin/leads')} />
                <StatCard label="Active Clients" value={data?.total_clients || 0} icon={Briefcase} color="#7b1fa2" />
                <StatCard label="Total Revenue" value={fmt(data?.total_revenue || 0)} icon={DollarSign} color="#2e7d32" />
            </div>
            <div className="grid-4 mb-6">
                <StatCard label="Service Orders" value={data?.total_service_orders || 0} icon={Activity} color="#f57c00" onClick={() => navigate('/admin/service-orders')} />
                <StatCard label="Completed Orders" value={data?.completed_orders || 0} icon={CheckCircle} color="#2e7d32" />
                <StatCard label="Active Packages" value={data?.total_packages || 0} icon={Package} color="#0097a7" onClick={() => navigate('/admin/packages')} />
                <StatCard label="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} color="#7b1fa2"
                    sub={`${completionRate}% order completion`} />
            </div>

            {/* ── Row 1: Lead Trend + Revenue Chart ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Lead Trend — Area */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div>
                            <div className="section-title" style={{ margin: 0 }}>Lead Trend</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Created vs Converted · last 6 months</div>
                        </div>
                    </div>
                    {leadsChartData.length === 0
                        ? <div className="empty"><p>Not enough data yet</p></div>
                        : (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={leadsChartData}>
                                    <defs>
                                        <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1976d2" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gConverted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<TooltipBox />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                    <Area type="monotone" dataKey="created" name="Created" stroke="#1976d2" fill="url(#gCreated)" strokeWidth={2} dot={{ r: 3 }} />
                                    <Area type="monotone" dataKey="converted" name="Converted" stroke="#2e7d32" fill="url(#gConverted)" strokeWidth={2} dot={{ r: 3 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )
                    }
                </div>

                {/* Revenue Chart — Bar */}
                <div className="card">
                    <div style={{ marginBottom: 20 }}>
                        <div className="section-title" style={{ margin: 0 }}>Monthly Revenue</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>From completed service orders · last 6 months</div>
                    </div>
                    {revenueChartData.length === 0
                        ? <div className="empty"><p>No completed orders yet</p></div>
                        : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={revenueChartData} barSize={28}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<TooltipBox currency />} />
                                    <Bar dataKey="revenue" name="Revenue" fill="#1a1a1a" radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )
                    }
                </div>
            </div>

            {/* ── Row 2: Lead Status Pie + Users Donut + Order Pipeline ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Lead Status Pie */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>Lead Pipeline</div>
                    {leadPieData.length === 0
                        ? <div className="empty"><p>No leads yet</p></div>
                        : (
                            <>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie data={leadPieData} dataKey="count" nameKey="_id" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                                            {leadPieData.map((entry, i) => (
                                                <Cell key={entry._id} fill={STATUS_COLORS[entry._id] || CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v, n) => [v, n.replace(/_/g, ' ')]} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                                    {leadPieData.map((s, i) => (
                                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s._id] || CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, textTransform: 'capitalize', flex: 1, color: 'var(--ink-2)' }}>{s._id?.replace(/_/g, ' ')}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700 }}>{s.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    }
                </div>

                {/* Users by role — custom donut */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="section-title" style={{ width: '100%', marginBottom: 16 }}>Users by Role</div>
                    <MiniDonut data={data?.users_by_role || []} total={data?.total_users || 0} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                        {(data?.users_by_role || []).map(r => (
                            <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[r._id] || '#ccc' }} />
                                <span style={{ textTransform: 'capitalize', color: 'var(--ink-2)' }}>{r._id}</span>
                                <span style={{ fontWeight: 700 }}>{r.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Service Order Pipeline */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 16 }}>Order Pipeline</div>
                    {(data?.orders_by_status || []).length === 0
                        ? <div className="empty"><p>No service orders</p></div>
                        : (data.orders_by_status || []).map(s => {
                            const maxCount = Math.max(...(data.orders_by_status || []).map(x => x.count));
                            return (
                                <div key={s._id} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                        <span style={{ color: 'var(--ink-2)', textTransform: 'capitalize' }}>{s._id?.replace(/_/g, ' ')}</span>
                                        <span style={{ fontWeight: 700 }}>{s.count}</span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(s.count / maxCount) * 100}%`, background: STATUS_COLORS[s._id] || '#ccc', borderRadius: 99, transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            {/* ── Row 3: Sales Performance + Top Packages ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Sales Performance — grouped bar */}
                <div className="card">
                    <div style={{ marginBottom: 16 }}>
                        <div className="section-title" style={{ margin: 0 }}>Sales Performance</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Leads assigned vs Converted per rep</div>
                    </div>
                    {(data?.sales_performance || []).length === 0
                        ? <div className="empty"><p>No sales data</p></div>
                        : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={(data.sales_performance || []).map(s => ({ name: s.name?.split(' ')[0], total: s.total, converted: s.converted, interested: s.interested }))} barGap={2} barSize={14}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<TooltipBox />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="total" name="Total" fill="#1976d2" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="converted" name="Converted" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="interested" name="Interested" fill="#ff8f00" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )
                    }
                </div>

                {/* Top Packages */}
                <div className="card">
                    <div style={{ marginBottom: 16 }}>
                        <div className="section-title" style={{ margin: 0 }}>Top Packages</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Revenue from completed orders</div>
                    </div>
                    {(data?.top_packages || []).length === 0
                        ? <div className="empty"><p>No completed orders yet</p></div>
                        : (data.top_packages || []).map((p, i) => {
                            const maxRev = Math.max(...(data.top_packages || []).map(x => x.revenue));
                            return (
                                <div key={p._id} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: 6, background: CHART_COLORS[i % CHART_COLORS.length] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: CHART_COLORS[i % CHART_COLORS.length] }}>
                                                {i + 1}
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{p._id}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(p.revenue)}</div>
                                            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{p.count} order{p.count !== 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                    <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(p.revenue / maxRev) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length], transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            {/* ── Row 4: Ops Completion + Recent Conversions ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Ops Completion */}
                <div className="card">
                    <div style={{ marginBottom: 16 }}>
                        <div className="section-title" style={{ margin: 0 }}>Operations Completion</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Total vs completed per staff member</div>
                    </div>
                    {(data?.ops_completion || []).length === 0
                        ? <div className="empty"><p>No data yet</p></div>
                        : (data.ops_completion || []).map(o => {
                            const rate = o.total ? Math.round((o.completed / o.total) * 100) : 0;
                            return (
                                <div key={o._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div className="avatar">{o.name?.charAt(0)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</span>
                                            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{o.completed}/{o.total}</span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 99, background: 'var(--surface-2)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${rate}%`, background: rate === 100 ? '#2e7d32' : rate > 50 ? '#1976d2' : '#ff8f00', transition: 'width 0.6s ease' }} />
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: rate >= 80 ? '#2e7d32' : 'var(--ink-2)', width: 34, textAlign: 'right' }}>{rate}%</span>
                                </div>
                            );
                        })
                    }
                </div>

                {/* Recent Conversions */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div className="section-title" style={{ margin: 0 }}>Recent Conversions</div>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/leads')}>View all</button>
                    </div>
                    {(data?.recent_conversions || []).length === 0
                        ? <div className="empty"><p>No conversions yet</p></div>
                        : (data.recent_conversions || []).map(l => (
                            <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                onClick={() => navigate(`/admin/leads/${l._id}`)}>
                                <div className="avatar" style={{ background: '#1b5e20', color: '#fff' }}>{l.name?.charAt(0)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                                        {l.assigned_to?.name && `via ${l.assigned_to.name} · `}
                                        {new Date(l.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </div>
                                </div>
                                <span className="pill pill-converted" style={{ fontSize: 10 }}>converted ✓</span>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}
