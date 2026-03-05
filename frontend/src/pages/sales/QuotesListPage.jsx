import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Plus, Eye, FileText, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const STATUSES = ['', 'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'];

const STATUS_META = {
    draft: { color: '#546e7a', bg: '#546e7a18' },
    sent: { color: '#1976d2', bg: '#1976d218' },
    viewed: { color: '#7b1fa2', bg: '#7b1fa218' },
    accepted: { color: '#2e7d32', bg: '#2e7d3218' },
    rejected: { color: '#c62828', bg: '#c6282818' },
    expired: { color: '#bf360c', bg: '#bf360c18' },
    revised: { color: '#ff8f00', bg: '#ff8f0018' },
};

const StatusPill = ({ status }) => {
    const m = STATUS_META[status] || {};
    return (
        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: m.bg, color: m.color }}>
            {status}
        </span>
    );
};

export default function QuotesListPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFS] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const basePath = user.role === 'sales' ? '/sales' : user.role === 'manager' ? '/manager' : '/admin';

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15, ...(filterStatus && { status: filterStatus }), ...(search && { search }) };
            const { data } = await api.get('/quotes', { params });
            setQuotes(data.data); setTotal(data.count);
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchQuotes(); }, [page, filterStatus, search]);

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Quotes</div>
                    <div className="page-subtitle">{total} quotes total</div>
                </div>
                <button className="btn btn-primary" onClick={() => navigate(`${basePath}/quotes/new`)}>
                    <Plus size={14} /> New Quote
                </button>
            </div>

            <div className="filter-bar">
                <div className="search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
                    <Search />
                    <input className="form-input" placeholder="Search by name, company, or QT ref…" value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="form-select" style={{ width: 170 }} value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}</option>)}
                </select>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Ref #</th>
                            <th>Client</th>
                            <th>Company</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Valid Until</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                        ) : quotes.length === 0 ? (
                            <tr><td colSpan={9}>
                                <div className="empty">
                                    <FileText style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2, width: 36 }} />
                                    <p>No quotes yet — create your first one</p>
                                </div>
                            </td></tr>
                        ) : quotes.map(q => (
                            <tr key={q._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`${basePath}/quotes/${q._id}`)}>
                                <td><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{q.reference_no}</span></td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                        <div className="avatar">{q.contact_name?.charAt(0)}</div>
                                        <div>
                                            <div className="td-name">{q.contact_name}</div>
                                            <div className="td-muted">{q.contact_phone}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="td-muted">{q.company_name || '—'}</td>
                                <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{q.items?.length || 0} item{q.items?.length !== 1 ? 's' : ''}</td>
                                <td style={{ fontWeight: 700, fontSize: 14 }}>₹{(q.total || 0).toLocaleString('en-IN')}</td>
                                <td className="td-muted">
                                    {q.valid_until
                                        ? new Date(q.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : '—'}
                                </td>
                                <td><StatusPill status={q.status} /></td>
                                <td className="td-muted">
                                    {new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    {q.created_by?.name && ` · ${q.created_by.name}`}
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                    <button className="icon-btn" onClick={() => navigate(`${basePath}/quotes/${q._id}`)} title="View"><Eye size={13} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {total > 15 && (
                <div className="pagination">
                    <button className="btn btn-outline btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                    <span className="page-info">Page {page} of {Math.ceil(total / 15)}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)}>Next →</button>
                </div>
            )}
        </div>
    );
}
