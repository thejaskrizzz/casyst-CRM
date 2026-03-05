import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft, Phone, Mail, Building2, Calendar, Edit3, Check,
    X, MessageSquare, Clock, AlertCircle, RefreshCw, Receipt, ExternalLink
} from 'lucide-react';

const STATUSES = ['new', 'contacted', 'followup', 'interested', 'not_interested', 'lost'];

const statusFlow = {
    new: ['contacted'],
    contacted: ['followup', 'interested', 'not_interested', 'lost'],
    followup: ['contacted', 'interested', 'not_interested', 'lost'],
    interested: ['followup', 'not_interested', 'lost'],
    not_interested: ['followup', 'interested', 'lost'],
    lost: ['followup'],
};

export default function LeadDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const basePath = user.role === 'sales' ? '/sales' : user.role === 'manager' ? '/manager' : '/admin';

    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Status update
    const [statusModal, setStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Call log
    const [callModal, setCallModal] = useState(false);
    const [callForm, setCallForm] = useState({ note: '', outcome: 'interested', next_followup_date: '' });
    const [addingCall, setAddingCall] = useState(false);
    const [calls, setCalls] = useState([]);

    // Convert modal (manager/admin)
    const [convertModal, setConvertModal] = useState(false);
    const [convertForm, setConvertForm] = useState({ company_name: '', priority: 'medium', due_date: '', assigned_to_ops: '' });
    const [converting, setConverting] = useState(false);
    const [opsUsers, setOpsUsers] = useState([]);

    // Quotes for this lead
    const [quotes, setQuotes] = useState([]);

    const canConvert = ['admin', 'manager'].includes(user.role);
    const canAssign = ['admin', 'manager'].includes(user.role);
    const nextStatuses = statusFlow[lead?.status] || [];

    const fetchLead = async () => {
        setLoading(true);
        try {
            const [leadRes, callRes] = await Promise.all([
                api.get(`/leads/${id}`),
                api.get(`/leads/${id}/calls`),
            ]);
            setLead(leadRes.data.data);
            setCalls(callRes.data.data);
            // Fetch quotes linked to this lead
            api.get('/quotes', { params: { lead_id: id, limit: 50 } })
                .then(r => setQuotes(r.data.data || []))
                .catch(() => { });
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load lead');
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchLead(); }, [id]);

    // Load ops staff for assignment in Convert modal
    useEffect(() => {
        if (canConvert) {
            api.get('/users').then(r => {
                setOpsUsers(r.data.data.filter(u => u.role === 'operations' && u.status === 'active'));
            }).catch(() => { });
        }
    }, []);

    const updateStatus = async (e) => {
        e.preventDefault(); setUpdatingStatus(true);
        try {
            await api.patch(`/leads/${id}/status`, { status: newStatus, note: statusNote });
            setStatusModal(false); setStatusNote(''); fetchLead();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
        finally { setUpdatingStatus(false); }
    };

    const logCall = async (e) => {
        e.preventDefault(); setAddingCall(true);
        try {
            await api.post(`/leads/${id}/calls`, callForm);
            setCallModal(false); setCallForm({ note: '', outcome: 'interested', next_followup_date: '' }); fetchLead();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
        finally { setAddingCall(false); }
    };

    const convertLead = async (e) => {
        e.preventDefault(); setConverting(true);
        try {
            await api.post(`/leads/${id}/convert`, {
                company_name: convertForm.company_name || lead.name,
                package_id: lead.interested_package?._id,
                priority: convertForm.priority,
                due_date: convertForm.due_date,
                assigned_to_ops: convertForm.assigned_to_ops || undefined,
            });
            setConvertModal(false); fetchLead();
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
        finally { setConverting(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div className="spinner" />
        </div>
    );
    if (error) return (
        <div className="empty" style={{ paddingTop: 80 }}>
            <AlertCircle style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3, width: 40, height: 40 }} />
            <p>{error}</p>
        </div>
    );
    if (!lead) return null;

    const isConverted = lead.converted;

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="icon-btn" onClick={() => navigate(`${basePath}/leads`)} title="Back">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="page-title">{lead.name}</div>
                        <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span className={`pill pill-${lead.status}`}>{lead.status?.replace(/_/g, ' ')}</span>
                            {isConverted && <span className="pill pill-converted">Converted ✓</span>}
                            {lead.source && <span className="tag" style={{ textTransform: 'capitalize' }}>{lead.source}</span>}
                        </div>
                    </div>
                </div>
                {!isConverted && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline" onClick={() => { setNewStatus(nextStatuses[0] || ''); setStatusModal(true); }}>
                            <RefreshCw size={13} /> Update Status
                        </button>
                        <button className="btn btn-outline" onClick={() => setCallModal(true)}>
                            <Phone size={13} /> Log Call
                        </button>
                        {canConvert && (
                            <button className="btn btn-primary" onClick={() => {
                                setConvertForm({ company_name: lead.name, priority: 'medium', due_date: '', assigned_to_ops: '' });
                                setConvertModal(true);
                            }}>
                                <Check size={13} /> Convert Lead
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* LEFT: Lead info + call history */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Contact Info */}
                    <div className="card">
                        <div className="section-title">Contact Information</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {[
                                { icon: Phone, label: 'Phone', value: lead.phone },
                                { icon: Mail, label: 'Email', value: lead.email || '—' },
                                { icon: Building2, label: 'Source', value: lead.source, cap: true },
                                { icon: Calendar, label: 'Created', value: new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                                { icon: Building2, label: 'Interested Package', value: lead.interested_package?.name || '—' },
                                { icon: Building2, label: 'Assigned To', value: lead.assigned_to?.name || 'Unassigned' },
                            ].map(({ icon: Icon, label, value, cap }) => (
                                <div key={label}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>{label}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)', fontSize: 14 }}>
                                        <Icon size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                                        <span style={{ textTransform: cap ? 'capitalize' : 'none' }}>{value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {lead.notes && (
                            <>
                                <div className="divider" />
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Notes</div>
                                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{lead.notes}</p>
                            </>
                        )}
                    </div>

                    {/* Status History */}
                    <div className="card">
                        <div className="section-title">Status History</div>
                        {(lead.status_history || []).length === 0
                            ? <div className="empty"><p>No history yet</p></div>
                            : (
                                <div className="timeline">
                                    {[...lead.status_history].reverse().map((s, i) => (
                                        <div key={i} className="timeline-item">
                                            <div className={`tl-dot${i === 0 ? ' accent' : ''}`} />
                                            <div className="tl-body">
                                                <div className="tl-action">
                                                    Status changed to <span className={`pill pill-${s.status}`}>{s.status?.replace(/_/g, ' ')}</span>
                                                </div>
                                                {s.note && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 3 }}>{s.note}</div>}
                                                <div className="tl-time">
                                                    {s.changed_by?.name && `by ${s.changed_by.name} · `}
                                                    {new Date(s.timestamp || s.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* RIGHT: Call Logs */}
                <div className="card" style={{ height: 'fit-content' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div className="section-title" style={{ margin: 0 }}>Call Logs</div>
                        {!isConverted && (
                            <button className="btn btn-outline btn-sm" onClick={() => setCallModal(true)}>
                                <Phone size={12} /> Log
                            </button>
                        )}
                    </div>
                    {calls.length === 0
                        ? <div className="empty" style={{ padding: '24px 0' }}>
                            <Phone style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2, width: 28 }} />
                            <p>No calls logged yet</p>
                        </div>
                        : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {calls.map((c, i) => (
                                    <div key={c._id} style={{ padding: '12px 0', borderBottom: i < calls.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span className={`pill pill-${c.outcome}`} style={{ fontSize: 10 }}>{c.outcome?.replace(/_/g, ' ')}</span>
                                            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                                                {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, margin: '4px 0' }}>{c.note}</p>
                                        {c.next_followup_date && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
                                                <Clock size={10} /> Follow up: {new Date(c.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>by {c.performed_by?.name}</div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>
            </div>

            {/* ── QUOTES PANEL ── */}
            <div className="card" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Receipt size={15} style={{ color: 'var(--ink-3)' }} />
                        <div className="section-title" style={{ margin: 0 }}>Quotes</div>
                        {quotes.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 99, color: 'var(--ink-2)' }}>{quotes.length}</span>}
                    </div>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`${basePath}/quotes/new?lead_id=${id}`)}
                    >
                        <Receipt size={12} /> New Quote
                    </button>
                </div>
                {quotes.length === 0 ? (
                    <div className="empty" style={{ padding: '20px 0' }}>
                        <Receipt style={{ display: 'block', margin: '0 auto 8px', opacity: 0.2, width: 28 }} />
                        <p style={{ fontSize: 13 }}>No quotes yet for this lead</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {quotes.map(q => {
                            const STATUS_META = {
                                draft: { color: '#546e7a', bg: '#546e7a18' }, sent: { color: '#1976d2', bg: '#1976d218' },
                                viewed: { color: '#7b1fa2', bg: '#7b1fa218' }, accepted: { color: '#2e7d32', bg: '#2e7d3218' },
                                rejected: { color: '#c62828', bg: '#c6282818' }, expired: { color: '#bf360c', bg: '#bf360c18' },
                                revised: { color: '#ff8f00', bg: '#ff8f0018' },
                            };
                            const m = STATUS_META[q.status] || {};
                            return (
                                <div
                                    key={q._id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                                    onClick={() => navigate(`${basePath}/quotes/${q._id}`)}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{q.reference_no}</span>
                                            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, textTransform: 'capitalize' }}>{q.status}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                                            {q.items?.length || 0} item{q.items?.length !== 1 ? 's' : ''} · {q.valid_until ? `Valid till ${new Date(q.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'No expiry'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>₹{(q.total || 0).toLocaleString('en-IN')}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                                    </div>
                                    <ExternalLink size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── UPDATE STATUS MODAL ── */}
            {statusModal && (
                <div className="modal-overlay" onClick={() => setStatusModal(false)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Update Status</span>
                            <button className="icon-btn" onClick={() => setStatusModal(false)}><X size={14} /></button>
                        </div>
                        <form onSubmit={updateStatus}>
                            <div className="form-group">
                                <label className="form-label">Current Status</label>
                                <div><span className={`pill pill-${lead.status}`}>{lead.status?.replace(/_/g, ' ')}</span></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Status *</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {STATUSES.filter(s => s !== lead.status && s !== 'converted').map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setNewStatus(s)}
                                            style={{
                                                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                                                cursor: 'pointer', border: '2px solid',
                                                borderColor: newStatus === s ? 'var(--accent)' : 'var(--border)',
                                                background: newStatus === s ? 'var(--accent)' : 'transparent',
                                                color: newStatus === s ? '#fff' : 'var(--ink-2)',
                                                transition: 'all var(--ease)',
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {s.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note (optional)</label>
                                <textarea className="form-textarea" rows={2} placeholder="Add a note about this status change…" value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStatusModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!newStatus || updatingStatus}>
                                    {updatingStatus ? 'Updating…' : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── LOG CALL MODAL ── */}
            {callModal && (
                <div className="modal-overlay" onClick={() => setCallModal(false)}>
                    <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Log Call</span>
                            <button className="icon-btn" onClick={() => setCallModal(false)}><X size={14} /></button>
                        </div>
                        <form onSubmit={logCall}>
                            <div className="form-group">
                                <label className="form-label">Call Outcome *</label>
                                <select className="form-select" value={callForm.outcome} onChange={e => setCallForm({ ...callForm, outcome: e.target.value })}>
                                    <option value="interested">Interested</option>
                                    <option value="not_interested">Not Interested</option>
                                    <option value="followup">Need Follow-up</option>
                                    <option value="no_answer">No Answer</option>
                                    <option value="callback_requested">Callback Requested</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes *</label>
                                <textarea className="form-textarea" rows={3} required placeholder="What was discussed in this call?" value={callForm.note} onChange={e => setCallForm({ ...callForm, note: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Next Follow-up Date</label>
                                <input className="form-input" type="date" value={callForm.next_followup_date} onChange={e => setCallForm({ ...callForm, next_followup_date: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setCallModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={addingCall}>{addingCall ? 'Saving…' : 'Save Call'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── CONVERT LEAD MODAL (manager/admin only) ── */}
            {convertModal && canConvert && (
                <div className="modal-overlay" onClick={() => setConvertModal(false)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Convert Lead to Client</span>
                            <button className="icon-btn" onClick={() => setConvertModal(false)}><X size={14} /></button>
                        </div>
                        <div className="alert alert-success" style={{ marginBottom: 20 }}>
                            This will create a Client and a Service Order from this lead.
                        </div>
                        <form onSubmit={convertLead}>
                            <div className="form-group">
                                <label className="form-label">Company Name</label>
                                <input className="form-input" value={convertForm.company_name} onChange={e => setConvertForm({ ...convertForm, company_name: e.target.value })} placeholder={lead.name} />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={convertForm.priority} onChange={e => setConvertForm({ ...convertForm, priority: e.target.value })}>
                                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" type="date" value={convertForm.due_date} onChange={e => setConvertForm({ ...convertForm, due_date: e.target.value })} />
                                </div>
                            </div>
                            {/* Assign to Operations staff */}
                            <div className="form-group">
                                <label className="form-label">Assign to Operations Staff <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(recommended)</span></label>
                                <select className="form-select" value={convertForm.assigned_to_ops} onChange={e => setConvertForm({ ...convertForm, assigned_to_ops: e.target.value })}>
                                    <option value="">— Unassigned (will appear in all ops queues) —</option>
                                    {opsUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                </select>
                                {opsUsers.length === 0 && (
                                    <p style={{ fontSize: 11, color: 'var(--s-medium-ink)', marginTop: 4 }}>No active operations staff found. The order will be unassigned.</p>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setConvertModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={converting}>{converting ? 'Converting…' : '✓ Convert to Client'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
