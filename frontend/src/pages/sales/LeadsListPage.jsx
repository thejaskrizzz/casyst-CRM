import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Plus, Search, Eye, Phone, TrendingUp, UserCheck, LayoutList, Columns } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SOURCES = ['', 'ads', 'website', 'referral', 'walkin'];
const STATUSES = ['', 'new', 'contacted', 'followup', 'interested', 'not_interested', 'lost', 'converted'];

const KANBAN_COLS = [
    { id: 'new', label: 'New', color: 'var(--s-new-ink)' },
    { id: 'contacted', label: 'Contacted', color: 'var(--s-contacted-ink)' },
    { id: 'followup', label: 'Follow-up', color: 'var(--s-followup-ink)' },
    { id: 'interested', label: 'Interested', color: 'var(--s-interested-ink)' },
    { id: 'not_interested', label: 'Not Interested', color: 'var(--s-not_interested-ink)' },
    { id: 'lost', label: 'Lost', color: 'var(--s-lost-ink)' },
    { id: 'converted', label: 'Converted ✓', color: 'var(--s-converted-ink)' },
];

// ── Inline assign dropdown ──────────────────────────────
function AssignCell({ lead, salesUsers, onAssigned, canAssign, compact }) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const ref = useRef();

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const assign = async (userId) => {
        setSaving(true);
        try {
            await api.patch(`/leads/${lead._id}/assign`, { assigned_to: userId || null });
            onAssigned();
        } catch (err) { alert(err.response?.data?.message || 'Failed to assign'); }
        finally { setSaving(false); setOpen(false); }
    };

    if (!canAssign) {
        return compact
            ? <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{lead.assigned_to?.name || 'Unassigned'}</span>
            : <span className="td-muted">{lead.assigned_to?.name || '—'}</span>;
    }

    return (
        <div style={{ position: 'relative' }} ref={ref}>
            <button
                className="btn btn-ghost btn-sm"
                style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: compact ? 11 : 12,
                    color: lead.assigned_to ? 'var(--ink-2)' : 'var(--s-medium-ink)',
                    background: lead.assigned_to ? 'transparent' : 'var(--s-medium)',
                    borderRadius: 999, padding: compact ? '2px 8px' : '4px 10px',
                }}
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                disabled={saving || lead.converted}
            >
                <UserCheck size={compact ? 10 : 12} />
                {saving ? '…' : (lead.assigned_to?.name || 'Assign')}
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: '110%', left: 0, zIndex: 999,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-lg)', padding: 6, minWidth: 200,
                    boxShadow: 'var(--shadow-lg)', maxHeight: 240, overflowY: 'auto',
                }}>
                    <div
                        style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 8, color: 'var(--ink-3)' }}
                        onClick={() => assign(null)}
                    >— Unassign —</div>
                    {salesUsers.map(u => (
                        <div key={u._id} style={{
                            padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 8,
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontWeight: lead.assigned_to?._id === u._id ? 600 : 400,
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            onClick={() => assign(u._id)}
                        >
                            <div className="avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{u.name?.charAt(0)}</div>
                            {u.name}
                        </div>
                    ))}
                    {salesUsers.length === 0 && <div style={{ padding: '7px 12px', fontSize: 12, color: 'var(--ink-3)' }}>No active sales staff</div>}
                </div>
            )}
        </div>
    );
}

// ── Kanban Card ──────────────────────────────────────────
function KanbanCard({ lead, canAssign, salesUsers, onAssigned, onView, onDragStart }) {
    const isDraggable = !lead.converted;
    return (
        <div
            className="item-card"
            draggable={isDraggable}
            onDragStart={isDraggable ? (e) => onDragStart(e, lead) : undefined}
            onClick={() => onView(lead._id)}
            style={{
                cursor: isDraggable ? 'grab' : 'pointer',
                padding: '14px',
                opacity: 1,
                transition: 'opacity var(--ease)',
            }}
        >
            {/* Drag handle hint */}
            {isDraggable && (
                <div style={{ position: 'absolute', top: 8, right: 36, opacity: 0.25, cursor: 'grab' }} title="Drag to move">
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                        <circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" />
                        <circle cx="2.5" cy="7" r="1.5" /><circle cx="7.5" cy="7" r="1.5" />
                        <circle cx="2.5" cy="11.5" r="1.5" /><circle cx="7.5" cy="11.5" r="1.5" />
                    </svg>
                </div>
            )}
            {/* Top row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}>
                    {lead.name?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={9} />{lead.phone}
                    </div>
                </div>
                <button
                    className="icon-btn"
                    style={{ width: 24, height: 24, opacity: 0.5, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); onView(lead._id); }}
                    title="View"
                >
                    <Eye size={11} />
                </button>
            </div>

            {/* Package tag */}
            {lead.interested_package?.name && (
                <div className="tag" style={{ fontSize: 10, marginBottom: 8, display: 'inline-block' }}>
                    {lead.interested_package.name}
                </div>
            )}

            {/* Bottom: source + assign */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'capitalize' }}>{lead.source}</span>
                <div onClick={e => e.stopPropagation()}>
                    <AssignCell lead={lead} salesUsers={salesUsers} canAssign={canAssign && !lead.converted} onAssigned={onAssigned} compact />
                </div>
            </div>
        </div>
    );
}

// ── Full Kanban Board with DnD ───────────────────────────────────────
function KanbanBoard({ leads, canAssign, salesUsers, onAssigned, onView, onStatusChange }) {
    const [draggingId, setDraggingId] = useState(null);
    const [overCol, setOverCol] = useState(null);
    const grouped = {};
    KANBAN_COLS.forEach(c => { grouped[c.id] = leads.filter(l => l.status === c.id); });

    const handleDragStart = (e, lead) => {
        setDraggingId(lead._id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('leadId', lead._id);
        e.dataTransfer.setData('fromStatus', lead.status);
        // Ghost image: semi-transparent
        e.currentTarget.style.opacity = '0.45';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggingId(null);
        setOverCol(null);
    };

    const handleDragOver = (e, colId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setOverCol(colId);
    };

    const handleDragLeave = (e) => {
        // Only clear if truly leaving this column (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null);
    };

    const handleDrop = async (e, targetColId) => {
        e.preventDefault();
        setOverCol(null);
        const leadId = e.dataTransfer.getData('leadId');
        const fromStatus = e.dataTransfer.getData('fromStatus');
        if (!leadId || fromStatus === targetColId) return;
        // "converted" can only be set via the Convert Lead button — block DnD
        if (targetColId === 'converted') {
            alert('To convert a lead, use the "Convert Lead" button on the Lead Detail page. This creates a Client and Service Order.');
            return;
        }
        await onStatusChange(leadId, targetColId);
    };


    return (
        <div className="kanban-scroll" style={{ paddingBottom: 8 }}>
            {KANBAN_COLS.map(col => (
                <div
                    key={col.id}
                    className="lane"
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                    style={{
                        outline: overCol === col.id ? `2px solid ${col.color}` : '2px solid transparent',
                        outlineOffset: -2,
                        background: overCol === col.id ? `${col.color}0f` : undefined,
                        transition: 'outline 0.12s, background 0.12s',
                    }}
                >
                    <div className="lane-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                            <span className="lane-title">{col.label}</span>
                        </div>
                        <span className="lane-count">{grouped[col.id]?.length || 0}</span>
                    </div>
                    {grouped[col.id]?.length === 0 && (
                        <div style={{
                            padding: '20px 8px', textAlign: 'center',
                            color: overCol === col.id ? col.color : 'var(--ink-4)',
                            fontSize: 12,
                            border: overCol === col.id ? `1.5px dashed ${col.color}` : '1.5px dashed transparent',
                            borderRadius: 10, margin: '4px',
                            transition: 'all 0.15s',
                        }}>
                            {overCol === col.id ? 'Drop here' : 'No leads'}
                        </div>
                    )}
                    {grouped[col.id]?.map(lead => (
                        <KanbanCard
                            key={lead._id}
                            lead={lead}
                            canAssign={canAssign}
                            salesUsers={salesUsers}
                            onAssigned={onAssigned}
                            onView={onView}
                            onDragStart={(e, l) => handleDragStart(e, l)}
                        />
                    ))}
                    {overCol === col.id && grouped[col.id]?.length > 0 && (
                        <div style={{ height: 52, border: `1.5px dashed ${col.color}`, borderRadius: 10, margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: col.color, fontSize: 12 }}>
                            Drop here
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}


// ── Main Leads List Page ─────────────────────────────────
export default function LeadsListPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFS] = useState('');
    const [filterSource, setFSrc] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [view, setView] = useState('table'); // 'table' | 'kanban'
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', source: 'website', notes: '', interested_package: '', assigned_to: '' });
    const [packages, setPackages] = useState([]);
    const [salesUsers, setSalesUsers] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const canAssign = ['admin', 'manager'].includes(user.role);
    const basePath = user.role === 'sales' ? '/sales' : user.role === 'manager' ? '/manager' : '/admin';

    const fetchLeads = async () => {
        setLoading(true);
        try {
            // For kanban, fetch all (no pagination); for table, use page
            const limit = view === 'kanban' ? 500 : 15;
            const params = { page: view === 'kanban' ? 1 : page, limit, ...(search && { search }), ...(filterStatus && { status: filterStatus }), ...(filterSource && { source: filterSource }) };
            const { data } = await api.get('/leads', { params });
            setLeads(data.data); setTotal(data.count);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchLeads(); }, [page, search, filterStatus, filterSource, view]);

    useEffect(() => {
        api.get('/packages').then(r => setPackages(r.data.data)).catch(() => { });
        if (canAssign) {
            api.get('/users').then(r => {
                setSalesUsers(r.data.data.filter(u => u.role === 'sales' && u.status === 'active'));
            }).catch(() => { });
        }
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            const payload = { ...form };
            if (!payload.assigned_to) delete payload.assigned_to;
            if (!payload.interested_package) delete payload.interested_package;
            await api.post('/leads', payload);
            setShowModal(false);
            setForm({ name: '', phone: '', email: '', source: 'website', notes: '', interested_package: '', assigned_to: '' });
            fetchLeads();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
        finally { setSubmitting(false); }
    };

    const goToDetail = (id) => navigate(`${basePath}/leads/${id}`);

    const handleStatusChange = async (leadId, newStatus) => {
        // Optimistically move the card in local state
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
        try {
            await api.patch(`/leads/${leadId}/status`, { status: newStatus });
        } catch (err) {
            // Revert on failure
            fetchLeads();
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">{user.role === 'sales' ? 'My Leads' : 'All Leads'}</div>
                    <div className="page-subtitle">{total} leads total</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* View toggle */}
                    <div style={{ display: 'flex', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)' }}>
                        <button
                            onClick={() => setView('table')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: view === 'table' ? 'var(--accent)' : 'transparent', color: view === 'table' ? '#fff' : 'var(--ink-3)', transition: 'all var(--ease)' }}
                        >
                            <LayoutList size={14} /> Table
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: view === 'kanban' ? 'var(--accent)' : 'transparent', color: view === 'kanban' ? '#fff' : 'var(--ink-3)', transition: 'all var(--ease)' }}
                        >
                            <Columns size={14} /> Board
                        </button>
                    </div>
                    {['admin', 'manager', 'sales'].includes(user.role) && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New Lead</button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <div className="search-wrap" style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
                    <Search />
                    <input className="form-input" placeholder="Search leads…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                {view === 'table' && (
                    <>
                        <select className="form-select" style={{ width: 150 }} value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}>
                            {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Status'}</option>)}
                        </select>
                        <select className="form-select" style={{ width: 140 }} value={filterSource} onChange={e => { setFSrc(e.target.value); setPage(1); }}>
                            {SOURCES.map(s => <option key={s} value={s}>{s || 'All Sources'}</option>)}
                        </select>
                    </>
                )}
            </div>

            {/* KANBAN VIEW */}
            {view === 'kanban' && (
                loading
                    ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>
                    : <KanbanBoard
                        leads={leads}
                        canAssign={canAssign}
                        salesUsers={salesUsers}
                        onAssigned={fetchLeads}
                        onView={goToDetail}
                        onStatusChange={handleStatusChange}
                    />
            )}

            {/* TABLE VIEW */}
            {view === 'table' && (
                <>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Name</th><th>Phone</th><th>Source</th><th>Package</th><th>Status</th><th>Assigned To</th><th></th></tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                                ) : leads.length === 0 ? (
                                    <tr><td colSpan={7}><div className="empty"><TrendingUp /><p>No leads found</p></div></td></tr>
                                ) : leads.map(l => (
                                    <tr key={l._id} style={{ cursor: 'pointer' }} onClick={() => goToDetail(l._id)}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar">{l.name?.charAt(0)}</div>
                                                <div>
                                                    <div className="td-name">{l.name}</div>
                                                    <div className="td-muted">{l.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-2)', fontSize: 13 }}>
                                                <Phone size={11} />{l.phone}
                                            </div>
                                        </td>
                                        <td className="td-muted" style={{ textTransform: 'capitalize' }}>{l.source}</td>
                                        <td className="td-muted">{l.interested_package?.name || '—'}</td>
                                        <td><span className={`pill pill-${l.status}`}>{l.status?.replace(/_/g, ' ')}</span></td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <AssignCell lead={l} salesUsers={salesUsers} canAssign={canAssign && !l.converted} onAssigned={fetchLeads} />
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="icon-btn" onClick={() => goToDetail(l._id)} title="View"><Eye size={13} /></button>
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
                </>
            )}

            {/* New Lead Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">New Lead</span>
                            <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Phone *</label><input className="form-input" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Source *</label>
                                    <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                        <option value="website">Website</option><option value="ads">Ads</option>
                                        <option value="referral">Referral</option><option value="walkin">Walk-in</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Interested Package</label>
                                    <select className="form-select" value={form.interested_package} onChange={e => setForm({ ...form, interested_package: e.target.value })}>
                                        <option value="">— None —</option>
                                        {packages.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {canAssign && (
                                <div className="form-group">
                                    <label className="form-label">Assign To (Sales Staff)</label>
                                    <select className="form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                                        <option value="">— Unassigned —</option>
                                        {salesUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Lead'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
