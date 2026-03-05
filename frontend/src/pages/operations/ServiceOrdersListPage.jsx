import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Eye, Calendar, Building2, LayoutList, Columns, AlertTriangle, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const STATUSES = ['', 'pending_documents', 'documents_received', 'verification', 'gov_submission', 'approval_waiting', 'completed', 'rejected', 'on_hold'];
const PRIORITIES = ['', 'low', 'medium', 'high'];

const KANBAN_COLS = [
    { id: 'pending_documents', label: 'Pending Docs', color: '#f57c00' },
    { id: 'documents_received', label: 'Docs Received', color: '#1976d2' },
    { id: 'verification', label: 'Verification', color: '#7b1fa2' },
    { id: 'gov_submission', label: 'Gov Submission', color: '#0097a7' },
    { id: 'approval_waiting', label: 'Approval Waiting', color: '#ff8f00' },
    { id: 'completed', label: 'Completed ✓', color: '#2e7d32' },
    { id: 'rejected', label: 'Rejected', color: '#c62828' },
    { id: 'on_hold', label: 'On Hold', color: '#546e7a' },
];

// ── Kanban Card ──────────────────────────────────────────
function SOKanbanCard({ order, onView, onDragStart }) {
    const dueDate = order.due_date ? new Date(order.due_date) : null;
    const isOverdue = dueDate && dueDate < new Date() && order.status !== 'completed' && order.status !== 'rejected';

    return (
        <div
            className="item-card"
            draggable
            onDragStart={(e) => onDragStart(e, order)}
            onClick={() => onView(order._id)}
            style={{ cursor: 'grab', padding: '14px', position: 'relative' }}
        >
            {/* Drag handle dots */}
            <div style={{ position: 'absolute', top: 8, right: 34, opacity: 0.2 }}>
                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                    <circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" />
                    <circle cx="2.5" cy="7" r="1.5" /><circle cx="7.5" cy="7" r="1.5" />
                    <circle cx="2.5" cy="11.5" r="1.5" /><circle cx="7.5" cy="11.5" r="1.5" />
                </svg>
            </div>
            {/* Top */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>
                    {order.client?.company_name?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.client?.company_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.package?.name}
                    </div>
                </div>
                <button
                    className="icon-btn"
                    style={{ width: 22, height: 22, opacity: 0.4, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); onView(order._id); }}
                >
                    <Eye size={11} />
                </button>
            </div>
            {/* Tags row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className={`pill pill-${order.priority}`} style={{ fontSize: 10 }}>{order.priority}</span>
                {isOverdue && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#c62828', fontWeight: 600 }}>
                        <AlertTriangle size={9} /> overdue
                    </span>
                )}
                {dueDate && !isOverdue && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--ink-3)' }}>
                        <Calendar size={9} />
                        {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                )}
            </div>
            {/* Assigned to */}
            {order.assigned_to && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div className="avatar" style={{ width: 14, height: 14, fontSize: 8 }}>{order.assigned_to.name?.charAt(0)}</div>
                    {order.assigned_to.name}
                </div>
            )}
        </div>
    );
}

// ── Kanban Board ─────────────────────────────────────────
function SOKanbanBoard({ orders, onView, onStatusChange }) {
    const [overCol, setOverCol] = useState(null);
    const grouped = {};
    KANBAN_COLS.forEach(c => { grouped[c.id] = orders.filter(o => o.status === c.id); });

    const handleDragStart = (e, order) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('orderId', order._id);
        e.dataTransfer.setData('fromStatus', order.status);
        e.currentTarget.style.opacity = '0.45';
    };
    const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; setOverCol(null); };
    const handleDragOver = (e, colId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverCol(colId); };
    const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null); };
    const handleDrop = async (e, targetColId) => {
        e.preventDefault(); setOverCol(null);
        const orderId = e.dataTransfer.getData('orderId');
        const fromStatus = e.dataTransfer.getData('fromStatus');
        if (!orderId || fromStatus === targetColId) return;
        await onStatusChange(orderId, targetColId);
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
                            color: overCol === col.id ? col.color : 'var(--ink-4)', fontSize: 12,
                            border: overCol === col.id ? `1.5px dashed ${col.color}` : '1.5px dashed transparent',
                            borderRadius: 10, margin: '4px', transition: 'all 0.15s',
                        }}>
                            {overCol === col.id ? 'Drop here' : 'No orders'}
                        </div>
                    )}
                    {grouped[col.id]?.map(order => (
                        <SOKanbanCard
                            key={order._id}
                            order={order}
                            onView={onView}
                            onDragStart={handleDragStart}
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

// ── Main Page ─────────────────────────────────────────────
export default function ServiceOrdersListPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFS] = useState('');
    const [filterPriority, setFP] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [view, setView] = useState('table'); // 'table' | 'kanban'

    const basePath = user.role === 'operations' ? '/operations' : user.role === 'manager' ? '/manager' : user.role === 'sales' ? '/sales' : '/admin';


    const fetchOrders = async () => {
        setLoading(true);
        try {
            const limit = view === 'kanban' ? 500 : 15;
            const params = {
                page: view === 'kanban' ? 1 : page, limit,
                ...(filterStatus && { status: filterStatus }),
                ...(filterPriority && { priority: filterPriority }),
            };
            const { data } = await api.get('/service-orders', { params });
            setOrders(data.data); setTotal(data.count);
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchOrders(); }, [page, filterStatus, filterPriority, view]);

    const goToDetail = (id) => navigate(`${basePath}/service-orders/${id}`);

    // Optimistic DnD status update
    const handleStatusChange = async (orderId, newStatus) => {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
        try {
            await api.patch(`/service-orders/${orderId}/status`, { status: newStatus });
        } catch (err) {
            fetchOrders();
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">{user.role === 'operations' ? 'My Service Orders' : 'All Service Orders'}</div>
                    <div className="page-subtitle">{total} orders total</div>
                </div>
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
            </div>

            {/* Filters (table only) */}
            {view === 'table' && (
                <div className="filter-bar">
                    <select className="form-select" style={{ width: 220 }} value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All Status'}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 140 }} value={filterPriority} onChange={e => { setFP(e.target.value); setPage(1); }}>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p || 'All Priority'}</option>)}
                    </select>
                </div>
            )}

            {/* BOARD VIEW */}
            {view === 'kanban' && (
                loading
                    ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}><div className="spinner" /></div>
                    : <SOKanbanBoard orders={orders} onView={goToDetail} onStatusChange={handleStatusChange} />
            )}

            {/* TABLE VIEW */}
            {view === 'table' && (
                <>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Client</th><th>Package</th><th>Assigned To</th><th>Priority</th><th>Due Date</th><th>Status</th><th></th></tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                                ) : orders.length === 0 ? (
                                    <tr><td colSpan={7}>
                                        <div className="empty">
                                            <Briefcase style={{ display: 'block', margin: '0 auto 12px', opacity: 0.2, width: 36 }} />
                                            <p>No service orders found</p>
                                        </div>
                                    </td></tr>
                                ) : orders.map(o => {
                                    const dueDate = o.due_date ? new Date(o.due_date) : null;
                                    const isOverdue = dueDate && dueDate < new Date() && o.status !== 'completed' && o.status !== 'rejected';
                                    return (
                                        <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => goToDetail(o._id)}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div className="avatar">{o.client?.company_name?.charAt(0)}</div>
                                                    <div>
                                                        <div className="td-name">{o.client?.company_name}</div>
                                                        <div className="td-muted">{o.client?.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="td-muted">{o.package?.name || '—'}</td>
                                            <td>
                                                {o.assigned_to
                                                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="avatar">{o.assigned_to.name?.charAt(0)}</div>
                                                        <span style={{ fontSize: 13 }}>{o.assigned_to.name}</span>
                                                    </div>
                                                    : <span style={{ color: 'var(--s-medium-ink)', background: 'var(--s-medium)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Unassigned</span>
                                                }
                                            </td>
                                            <td><span className={`pill pill-${o.priority}`}>{o.priority}</span></td>
                                            <td>
                                                {dueDate
                                                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: isOverdue ? '#c62828' : 'var(--ink-2)' }}>
                                                        {isOverdue && <AlertTriangle size={11} />}
                                                        <Calendar size={11} />
                                                        {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    : <span className="td-muted">—</span>
                                                }
                                            </td>
                                            <td><span className={`pill pill-${o.status}`}>{o.status?.replace(/_/g, ' ')}</span></td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <button className="icon-btn" onClick={() => goToDetail(o._id)} title="View"><Eye size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
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
        </div>
    );
}
