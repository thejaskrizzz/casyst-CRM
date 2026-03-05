import { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
    AreaChart, Area, BarChart, Bar, Tooltip, XAxis, YAxis,
    ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
    Users, TrendingUp, Receipt, Briefcase, Phone, Star,
    Download, RefreshCw, ChevronDown, ChevronUp, Search, Filter
} from 'lucide-react';

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtK = n => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : fmt(n);

const ROLE_COLORS = { sales: '#66bb6a', operations: '#ffa726', manager: '#5c6bc0' };

function ScoreBadge({ score }) {
    const color = score >= 70 ? '#2e7d32' : score >= 40 ? '#f57c00' : '#c62828';
    const bg = score >= 70 ? '#e8f5e9' : score >= 40 ? '#fff8e1' : '#fce4ec';
    const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Good' : 'Needs Attention';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color }}>{score}</div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 700, color }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Score /100</div>
            </div>
        </div>
    );
}

function ChartTip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
            {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: <b>{typeof p.value === 'number' && p.value > 1000 ? fmtK(p.value) : p.value}</b></div>)}
        </div>
    );
}

/* ── Report Modal ───────────────────────────────── */
function ReportModal({ staff, onClose }) {
    const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 2); d.setDate(1); return d.toISOString().slice(0, 10); });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const generate = async () => {
        setLoading(true);
        try {
            const r = await api.get(`/analytics/staff/${staff._id}/report?from=${from}&to=${to}`);
            setReport(r.data.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { generate(); }, []);

    const printReport = () => {
        const win = window.open('', '_blank');
        const d = report;
        const s = d.staff;
        const fmt2 = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
        const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const rangeStr = `${new Date(d.range.from).toLocaleDateString('en-IN')} – ${new Date(d.range.to).toLocaleDateString('en-IN')}`;
        const scoreColor = d.summary.performance_score >= 70 ? '#2e7d32' : d.summary.performance_score >= 40 ? '#f57c00' : '#c62828';

        win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Staff Report — ${s.name}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:'Segoe UI',Arial,sans-serif;color:#111;font-size:13px;padding:40px;max-width:900px;margin:0 auto}
            h1{font-size:26px;font-weight:800;letter-spacing:-0.5px}
            h2{font-size:16px;font-weight:700;margin:28px 0 12px;border-bottom:2px solid #eee;padding-bottom:6px}
            h3{font-size:14px;font-weight:700;margin-bottom:8px}
            .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:3px solid #2563eb;padding-bottom:20px}
            .badge{background:#2563eb;color:#fff;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase;display:inline-block}
            .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
            .kpi{background:#f7f7f6;border-radius:10px;padding:14px 16px}
            .kpi-val{font-size:24px;font-weight:800;margin-bottom:2px}
            .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600}
            table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
            th{background:#f0f0ef;padding:8px 12px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.3px}
            td{padding:8px 12px;border-bottom:1px solid #f0f0ef}
            tr:last-child td{border-bottom:none}
            .pill{display:inline-block;padding:2px 10px;border-radius:99px;font-size:10px;font-weight:700;text-transform:capitalize}
            .score-circle{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;background:${scoreColor}}
            .footer{margin-top:40px;font-size:10px;color:#888;border-top:1px solid #eee;padding-top:12px;display:flex;justify-content:space-between}
            @media print{@page{margin:20mm}button{display:none!important}}
        </style></head><body>
        <div class="header">
            <div>
                <h1>${s.name}</h1>
                <p style="color:#666;margin-top:4px">${s.email} &nbsp;·&nbsp; <span class="badge">${s.role}</span></p>
                <p style="color:#888;font-size:12px;margin-top:6px">Period: ${rangeStr}</p>
            </div>
            <div style="text-align:right">
                <div class="score-circle" style="margin-left:auto">${d.summary.performance_score}</div>
                <p style="font-size:11px;color:#888;margin-top:4px">Performance Score</p>
                <p style="font-size:10px;color:#aaa">Generated ${now}</p>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi"><div class="kpi-label">Total Leads</div><div class="kpi-val">${d.summary.total_leads}</div></div>
            <div class="kpi"><div class="kpi-label">Converted</div><div class="kpi-val">${d.summary.converted_leads} <span style="font-size:14px;color:#26a69a">(${d.summary.conv_rate}%)</span></div></div>
            <div class="kpi"><div class="kpi-label">Quotes Sent</div><div class="kpi-val">${d.summary.total_quotes}</div></div>
            <div class="kpi"><div class="kpi-label">Quote Value</div><div class="kpi-val" style="font-size:18px">${fmt2(d.summary.quote_value)}</div></div>
            <div class="kpi"><div class="kpi-label">Orders Created</div><div class="kpi-val">${d.summary.total_orders}</div></div>
            <div class="kpi"><div class="kpi-label">Revenue</div><div class="kpi-val" style="font-size:18px">${fmt2(d.summary.total_revenue)}</div></div>
            <div class="kpi"><div class="kpi-label">Calls Made</div><div class="kpi-val">${d.summary.total_calls}</div></div>
            <div class="kpi"><div class="kpi-label">Accept Rate</div><div class="kpi-val">${d.summary.accept_rate}%</div></div>
        </div>

        ${d.leads.length ? `<h2>Leads</h2>
        <table><thead><tr><th>Lead Name</th><th>Status</th><th>Source</th><th>Date</th></tr></thead><tbody>
        ${d.leads.map(l => `<tr><td>${l.name}</td><td><span class="pill">${l.status?.replace(/_/g, ' ')}</span></td><td>${l.source || '—'}</td><td>${new Date(l.createdAt).toLocaleDateString('en-IN')}</td></tr>`).join('')}
        </tbody></table>` : ''}

        ${d.quotes.length ? `<h2>Quotes</h2>
        <table><thead><tr><th>Ref No</th><th>Client</th><th>Status</th><th>Amount</th><th>Date</th></tr></thead><tbody>
        ${d.quotes.map(q => `<tr><td style="font-family:monospace">${q.reference_no}</td><td>${q.contact_name}</td><td><span class="pill">${q.status}</span></td><td>${fmt2(q.total)}</td><td>${new Date(q.createdAt).toLocaleDateString('en-IN')}</td></tr>`).join('')}
        </tbody></table>` : ''}

        ${d.orders.length ? `<h2>Orders</h2>
        <table><thead><tr><th>Client</th><th>Status</th><th>Value</th><th>Collected</th><th>Date</th></tr></thead><tbody>
        ${d.orders.map(o => `<tr><td>${o.client?.company_name || '—'}</td><td><span class="pill">${o.status?.replace(/_/g, ' ')}</span></td><td>${fmt2(o.project_value)}</td><td>${fmt2(o.amount_paid)}</td><td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td></tr>`).join('')}
        </tbody></table>` : ''}

        <div class="footer"><span>Casyst CRM — Staff Performance Report</span><span>${now}</span></div>
        <script>window.onload=()=>{window.print();}</script>
        </body></html>`);
        win.document.close();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 740, maxHeight: '90vh', overflow: 'auto', padding: 28 }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{staff.name}'s Report</h2>
                        <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>{staff.email} · <span style={{ textTransform: 'capitalize' }}>{staff.role}</span></p>
                    </div>
                    <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 20, padding: '4px 10px' }}>×</button>
                </div>

                {/* Date Range */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="form-input" style={{ flex: 1 }} />
                    <span style={{ color: 'var(--ink-3)' }}>→</span>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className="form-input" style={{ flex: 1 }} />
                    <button className="btn btn-primary" onClick={generate}><RefreshCw size={14} /> Generate</button>
                    {report && <button className="btn btn-outline" onClick={printReport}><Download size={14} /> Print/PDF</button>}
                </div>

                {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}

                {report && !loading && (() => {
                    const d = report;
                    return (
                        <>
                            {/* Score + KPIs */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <ScoreBadge score={d.summary.performance_score} />
                                </div>
                                <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '12px 16px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Leads / Converted</div>
                                    <div style={{ fontSize: 20, fontWeight: 800 }}>{d.summary.total_leads}<span style={{ fontSize: 13, color: '#26a69a', marginLeft: 8 }}>→ {d.summary.converted_leads} ({d.summary.conv_rate}%)</span></div>
                                </div>
                                <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '12px 16px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Quotes / Accepted</div>
                                    <div style={{ fontSize: 20, fontWeight: 800 }}>{d.summary.total_quotes}<span style={{ fontSize: 13, color: '#ffa726', marginLeft: 8 }}>→ {d.summary.accepted_quotes} ({d.summary.accept_rate}%)</span></div>
                                </div>
                                <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '12px 16px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Revenue · Calls</div>
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtK(d.summary.total_revenue)} <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>· {d.summary.total_calls} calls</span></div>
                                </div>
                            </div>

                            {/* Lead Trend chart */}
                            {d.lead_trend.length > 0 && (
                                <div className="card" style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Monthly Lead Performance</div>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <BarChart data={d.lead_trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <Tooltip content={<ChartTip />} />
                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                            <Bar dataKey="total" name="Leads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="converted" name="Converted" fill="#26a69a" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Recent Leads table */}
                            {d.leads.length > 0 && (
                                <div className="card" style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Leads ({d.leads.length})</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            {['Name', 'Status', 'Source', 'Date'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>)}
                                        </tr></thead>
                                        <tbody>{d.leads.slice(0, 10).map(l => (
                                            <tr key={l._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{l.name}</td>
                                                <td style={{ padding: '8px 10px' }}><span className={`pill pill-${l.status}`} style={{ fontSize: 10 }}>{l.status?.replace(/_/g, ' ')}</span></td>
                                                <td style={{ padding: '8px 10px', color: 'var(--ink-3)', textTransform: 'capitalize' }}>{l.source || '—'}</td>
                                                <td style={{ padding: '8px 10px', color: 'var(--ink-3)' }}>{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                    {d.leads.length > 10 && <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8, textAlign: 'center' }}>+ {d.leads.length - 10} more (download PDF for full report)</p>}
                                </div>
                            )}

                            {/* Quotes table */}
                            {d.quotes.length > 0 && (
                                <div className="card">
                                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Quotes ({d.quotes.length})</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                        <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                                            {['Ref', 'Client', 'Status', 'Amount', 'Date'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--ink-3)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>)}
                                        </tr></thead>
                                        <tbody>{d.quotes.slice(0, 8).map(q => (
                                            <tr key={q._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }}>{q.reference_no}</td>
                                                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{q.contact_name}</td>
                                                <td style={{ padding: '8px 10px' }}><span className={`pill pill-${q.status}`} style={{ fontSize: 10 }}>{q.status}</span></td>
                                                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fmtK(q.total)}</td>
                                                <td style={{ padding: '8px 10px', color: 'var(--ink-3)' }}>{new Date(q.createdAt).toLocaleDateString('en-IN')}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════
   Main Staff Performance Page
══════════════════════════════════════════════════════ */
export default function StaffPerformance() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 2); d.setDate(1); return d.toISOString().slice(0, 10); });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [roleFilter, setRoleFilter] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'performance_score', dir: -1 });
    const [reportStaff, setReportStaff] = useState(null);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ from, to });
            if (roleFilter) params.append('role', roleFilter);
            const r = await api.get(`/analytics/staff?${params}`);
            setStaff(r.data.data);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchStaff(); }, []);

    const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }));
    const SortIcon = ({ k }) => sort.key === k ? (sort.dir === 1 ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : null;

    const filtered = staff
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const av = sort.key.split('.').reduce((o, k) => o?.[k], a) ?? 0;
            const bv = sort.key.split('.').reduce((o, k) => o?.[k], b) ?? 0;
            return sort.dir * (av > bv ? 1 : -1);
        });

    const Col = ({ k, label }) => (
        <th onClick={() => toggleSort(k)} style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: sort.key === k ? 'var(--ink)' : 'var(--ink-3)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', letterSpacing: '0.3px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{label} <SortIcon k={k} /></span>
        </th>
    );

    return (
        <div className="page-body">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Staff Performance</h1>
                    <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>Track and compare team performance. Click any row to generate a report.</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="form-input" style={{ width: 145 }} />
                    <span style={{ color: 'var(--ink-3)' }}>→</span>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className="form-input" style={{ width: 145 }} />
                    <button className="btn btn-primary" onClick={fetchStaff}><RefreshCw size={14} /> Apply</button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                    <input className="form-input" style={{ paddingLeft: 36 }} placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 160 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                    <option value="">All Roles</option>
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                    <option value="manager">Manager</option>
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 80, color: 'var(--ink-3)' }}>
                    <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: 12 }}>Loading staff data…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="card"><div className="empty"><p>No staff found</p></div></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--ink-3)', letterSpacing: '0.3px' }}>Staff</th>
                                <Col k="leads.total" label="Leads" />
                                <Col k="leads.converted" label="Converted" />
                                <Col k="leads.conv_rate" label="Conv %" />
                                <Col k="quotes.total" label="Quotes" />
                                <Col k="quotes.accept_rate" label="Accept %" />
                                <Col k="quotes.value" label="Quote Value" />
                                <Col k="orders.total" label="Orders" />
                                <Col k="orders.revenue" label="Revenue" />
                                <Col k="calls" label="Calls" />
                                <Col k="performance_score" label="Score" />
                                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', color: 'var(--ink-3)', letterSpacing: '0.3px' }}>Report</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, idx) => {
                                const scoreColor = s.performance_score >= 70 ? '#2e7d32' : s.performance_score >= 40 ? '#f57c00' : '#c62828';
                                const scoreBg = s.performance_score >= 70 ? '#e8f5e9' : s.performance_score >= 40 ? '#fff8e1' : '#fce4ec';
                                return (
                                    <tr
                                        key={s._id}
                                        style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.12s', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                        onClick={() => setReportStaff(s)}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: (ROLE_COLORS[s.role] || '#888') + '22', color: ROLE_COLORS[s.role] || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.name.charAt(0)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>{s.leads.total}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#26a69a' }}>{s.leads.converted}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                            <span style={{ fontWeight: 700, color: s.leads.conv_rate >= 50 ? '#2e7d32' : s.leads.conv_rate >= 25 ? '#f57c00' : '#c62828' }}>{s.leads.conv_rate}%</span>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>{s.quotes.total}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                            <span style={{ fontWeight: 700, color: s.quotes.accept_rate >= 50 ? '#2e7d32' : '#f57c00' }}>{s.quotes.accept_rate}%</span>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{fmtK(s.quotes.value)}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>{s.orders.total}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#2e7d32' }}>{fmtK(s.orders.revenue)}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>{s.calls}</td>
                                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                            <span style={{ background: scoreBg, color: scoreColor, fontWeight: 800, fontSize: 13, padding: '3px 10px', borderRadius: 99 }}>{s.performance_score}</span>
                                        </td>
                                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={e => { e.stopPropagation(); setReportStaff(s); }}
                                                style={{ padding: '4px 10px', fontSize: 11 }}
                                            >
                                                <Download size={12} /> Report
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {reportStaff && <ReportModal staff={reportStaff} onClose={() => setReportStaff(null)} />}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
