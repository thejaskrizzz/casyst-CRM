import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, RefreshCw, Edit3, X, Check, AlertCircle, Search, User, Package, Rocket, Calendar, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTS = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'];
const STATUS_META = {
    draft: { color: '#546e7a', bg: '#546e7a18', label: 'Draft' },
    sent: { color: '#1976d2', bg: '#1976d218', label: 'Sent' },
    viewed: { color: '#7b1fa2', bg: '#7b1fa218', label: 'Viewed' },
    accepted: { color: '#2e7d32', bg: '#2e7d3218', label: 'Accepted ✓' },
    rejected: { color: '#c62828', bg: '#c6282818', label: 'Rejected' },
    expired: { color: '#bf360c', bg: '#bf360c18', label: 'Expired' },
    revised: { color: '#ff8f00', bg: '#ff8f0018', label: 'Revised' },
};

const StatusPill = ({ status }) => {
    const m = STATUS_META[status] || {};
    return (
        <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: m.bg, color: m.color }}>
            {m.label || status}
        </span>
    );
};

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Blank item template
const blankItem = () => ({ description: '', quantity: 1, unit_price: '' });

function QuoteForm({ initial, isNew, onSave, onCancel, saving, preselectedLead }) {
    const [form, setForm] = useState(initial);
    const [leads, setLeads] = useState([]);
    const [leadSearch, setLeadSearch] = useState('');
    const [showLeadDrop, setShowLeadDrop] = useState(false);
    const [selectedLead, setSelectedLead] = useState(preselectedLead || null);
    const leadRef = useRef(null);
    const setF = k => v => setForm(f => ({ ...f, [k]: v }));

    // Fetch interested leads
    useEffect(() => {
        api.get('/leads', { params: { status: 'interested', limit: 100 } })
            .then(r => setLeads(r.data.data || []))
            .catch(() => { });
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = e => { if (leadRef.current && !leadRef.current.contains(e.target)) setShowLeadDrop(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const pickLead = (lead) => {
        setSelectedLead(lead);
        setLeadSearch(lead.name);
        setShowLeadDrop(false);
        // Auto-fill contact fields
        setForm(f => ({
            ...f,
            lead: lead._id,
            contact_name: lead.name || f.contact_name,
            contact_email: lead.email || f.contact_email,
            contact_phone: lead.phone || f.contact_phone,
            company_name: lead.company_name || f.company_name,
        }));
    };

    const clearLead = () => {
        setSelectedLead(null); setLeadSearch('');
        setForm(f => ({ ...f, lead: '' }));
    };

    const filteredLeads = leads.filter(l =>
        l.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        l.phone?.includes(leadSearch)
    );

    // Packages for item description combo
    const [packages, setPackages] = useState([]);
    const [activeItemDrop, setActiveItemDrop] = useState(-1); // index of item with open dropdown
    const itemRefs = useRef([]);

    useEffect(() => {
        api.get('/packages').then(r => setPackages(r.data.data || [])).catch(() => { });
    }, []);

    // Close item dropdown on outside click
    useEffect(() => {
        const handler = e => {
            if (activeItemDrop >= 0 && itemRefs.current[activeItemDrop] && !itemRefs.current[activeItemDrop].contains(e.target))
                setActiveItemDrop(-1);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activeItemDrop]);

    const pickPackage = (i, pkg) => {
        setItem(i, 'description', pkg.name);
        setItem(i, 'unit_price', pkg.price ?? '');
        setActiveItemDrop(-1);
    };

    const addItem = () => setForm(f => ({ ...f, items: [...f.items, blankItem()] }));
    const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
    const setItem = (i, k, v) => setForm(f => {
        const items = [...f.items];
        items[i] = { ...items[i], [k]: v };
        return { ...f, items };
    });

    // Live computed totals
    const subtotal = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
    const discount = subtotal * ((Number(form.discount_pct) || 0) / 100);
    const afterDisc = subtotal - discount;
    const tax = afterDisc * ((Number(form.tax_pct) || 0) / 100);
    const total = afterDisc + tax;

    return (
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
            {/* Lead Selector — only on create/edit */}
            <div className="card" style={{ marginBottom: 16, background: 'var(--surface-2)', border: '1.5px dashed var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <User size={14} style={{ color: 'var(--ink-3)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Link to an Interested Lead</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', marginLeft: 4 }}>(optional — auto-fills contact details)</span>
                </div>
                {selectedLead ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div className="avatar" style={{ background: '#66bb6a', color: '#fff', width: 28, height: 28, fontSize: 12 }}>{selectedLead.name?.charAt(0)}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedLead.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{selectedLead.phone} · Interested</div>
                        </div>
                        <button type="button" className="icon-btn" onClick={clearLead} title="Remove link"><X size={12} /></button>
                    </div>
                ) : (
                    <div ref={leadRef} style={{ position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }} />
                            <input
                                className="form-input"
                                style={{ paddingLeft: 34 }}
                                placeholder={`Search from ${leads.length} interested leads…`}
                                value={leadSearch}
                                onChange={e => { setLeadSearch(e.target.value); setShowLeadDrop(true); }}
                                onFocus={() => setShowLeadDrop(true)}
                            />
                        </div>
                        {showLeadDrop && filteredLeads.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 220, overflowY: 'auto' }}>
                                {filteredLeads.map(l => (
                                    <div
                                        key={l._id}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                        onMouseDown={() => pickLead(l)}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>{l.name?.charAt(0)}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.phone}{l.email ? ` · ${l.email}` : ''}</div>
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: '#66bb6a', background: '#66bb6a18', padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>Interested</span>
                                    </div>
                                ))}
                                {filteredLeads.length === 0 && <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink-3)' }}>No interested leads found</div>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Contact */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-title">Client Details</div>
                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">Contact Name *</label>
                        <input className="form-input" required value={form.contact_name} onChange={e => setF('contact_name')(e.target.value)} placeholder="Client name" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input className="form-input" value={form.company_name} onChange={e => setF('company_name')(e.target.value)} placeholder="Business name" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.contact_email} onChange={e => setF('contact_email')(e.target.value)} placeholder="client@email.com" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input className="form-input" value={form.contact_phone} onChange={e => setF('contact_phone')(e.target.value)} placeholder="+91 ..." />
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div className="section-title" style={{ margin: 0 }}>Line Items</div>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addItem}><Plus size={12} /> Add Item</button>
                </div>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 100px 32px', gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit Price (₹)</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Amount</span>
                    <span></span>
                </div>
                {form.items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-3)', fontSize: 13 }}>
                        No items added — click "Add Item" above
                    </div>
                )}
                {form.items.map((item, i) => {
                    const q = item.description?.toLowerCase() || '';
                    const matchedPkgs = packages.filter(
                        p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
                    ).slice(0, 8);
                    return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                            {/* Description + package combo */}
                            <div ref={el => itemRefs.current[i] = el} style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    style={{ fontSize: 13, paddingRight: 32 }}
                                    required
                                    value={item.description}
                                    onChange={e => { setItem(i, 'description', e.target.value); setActiveItemDrop(i); }}
                                    onFocus={() => setActiveItemDrop(i)}
                                    placeholder="Type service or pick package…"
                                />
                                {/* Package browse icon */}
                                <button
                                    type="button"
                                    title="Pick from packages"
                                    onClick={() => setActiveItemDrop(activeItemDrop === i ? -1 : i)}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 2, display: 'flex', alignItems: 'center' }}
                                >
                                    <Package size={12} />
                                </button>
                                {/* Package dropdown */}
                                {activeItemDrop === i && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 210, overflowY: 'auto' }}>
                                        {matchedPkgs.length === 0 ? (
                                            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-3)' }}>{q ? 'No matching packages' : 'Start typing or browse all packages below'}</div>
                                        ) : null}
                                        {(q ? matchedPkgs : packages.slice(0, 8)).map(pkg => (
                                            <div
                                                key={pkg._id}
                                                onMouseDown={() => pickPackage(i, pkg)}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{pkg.name}</div>
                                                    {pkg.description && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{pkg.description}</div>}
                                                </div>
                                                {pkg.price != null && (
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginLeft: 12, flexShrink: 0 }}>₹{Number(pkg.price).toLocaleString('en-IN')}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input className="form-input" style={{ fontSize: 13 }} type="number" min="1" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
                            <input className="form-input" style={{ fontSize: 13 }} type="number" min="0" step="0.01" required value={item.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} placeholder="0.00" />
                            <div style={{ fontWeight: 600, fontSize: 13, textAlign: 'right', color: 'var(--ink)' }}>
                                ₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('en-IN')}
                            </div>
                            <button type="button" className="icon-btn" style={{ color: '#c62828', opacity: 0.6 }} onClick={() => removeItem(i)}><Trash2 size={13} /></button>
                        </div>
                    );
                })}

                {/* Totals */}
                <div className="divider" style={{ margin: '16px 0 12px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="grid-2" style={{ gap: 12 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Discount (%)</label>
                            <input className="form-input" type="number" min="0" max="100" value={form.discount_pct} onChange={e => setF('discount_pct')(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Tax / GST (%)</label>
                            <input className="form-input" type="number" min="0" max="100" value={form.tax_pct} onChange={e => setF('tax_pct')(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px' }}>
                        {[
                            ['Subtotal', fmt(subtotal)],
                            discount > 0 ? [`Discount (${form.discount_pct}%)`, `− ${fmt(discount)}`] : null,
                            [`Tax (${form.tax_pct}%)`, fmt(tax)],
                        ].filter(Boolean).map(([label, val]) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
                                <span>{label}</span><span>{val}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, color: 'var(--ink)', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                            <span>Total</span><span>{fmt(total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes & Validity */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-title">Additional Details</div>
                <div className="grid-2">
                    <div className="form-group">
                        <label className="form-label">Valid Until</label>
                        <input className="form-input" type="date" value={form.valid_until} onChange={e => setF('valid_until')(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setF('notes')(e.target.value)} placeholder="Any terms, conditions, or notes for the client…" />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : isNew ? '✓ Create Quote' : '✓ Save Changes'}
                </button>
            </div>
        </form>
    );
}

// ── Main Page ─────────────────────────────────────────────
export default function QuoteDetailPage() {
    const { id } = useParams();   // 'new' or mongo id
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const basePath = user.role === 'sales' ? '/sales' : user.role === 'manager' ? '/manager' : '/admin';

    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(!isNew);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(isNew);
    const [saving, setSaving] = useState(false);
    const [preselectedLead, setPreselectedLead] = useState(null);

    // Status modal
    const [statusModal, setStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [updatingStatus, setUpdating] = useState(false);

    const emptyForm = { contact_name: '', contact_email: '', contact_phone: '', company_name: '', lead: '', items: [], discount_pct: 0, tax_pct: 18, notes: '', valid_until: '' };

    // Create Order modal
    const [orderModal, setOrderModal] = useState(false);
    const [orderForm, setOrderForm] = useState({ project_value: '', due_date: '', priority: 'medium', project_notes: '' });
    const [creatingOrder, setCreatingOrder] = useState(false);

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        setCreatingOrder(true);
        try {
            const payload = {
                quote_id: quote._id,
                lead_id: quote.lead?._id || quote.lead,
                project_value: Number(orderForm.project_value) || quote.total,
                due_date: orderForm.due_date || undefined,
                priority: orderForm.priority,
                project_notes: orderForm.project_notes,
            };
            const { data } = await api.post('/service-orders', payload);
            toast.success('Order created successfully!');
            setOrderModal(false);
            navigate(`${basePath}/service-orders/${data.data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create order');
        } finally { setCreatingOrder(false); }
    };

    // If lead_id param is in URL, fetch that lead to pre-select
    useEffect(() => {
        const leadId = searchParams.get('lead_id');
        if (isNew && leadId) {
            api.get(`/leads/${leadId}`)
                .then(r => setPreselectedLead(r.data.data))
                .catch(() => { });
        }
    }, []);

    useEffect(() => {
        if (!isNew) {
            setLoading(true);
            api.get(`/quotes/${id}`)
                .then(r => setQuote(r.data.data))
                .catch(e => setError(e.response?.data?.message || 'Failed to load quote'))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSave = async (form) => {
        setSaving(true);
        try {
            if (isNew) {
                const { data } = await api.post('/quotes', form);
                navigate(`${basePath}/quotes/${data.data._id}`, { replace: true });
            } else {
                const { data } = await api.put(`/quotes/${id}`, form);
                setQuote(data.data); setEditing(false);
            }
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault(); setUpdating(true);
        try {
            const { data } = await api.patch(`/quotes/${id}/status`, { status: newStatus, note: statusNote });
            setQuote(data.data); setStatusModal(false); setStatusNote(''); setNewStatus('');
        } catch (e) { alert(e.response?.data?.message || 'Error'); }
        finally { setUpdating(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;
    if (error) return <div className="empty" style={{ paddingTop: 80 }}><AlertCircle style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3, width: 40 }} /><p>{error}</p></div>;

    // ── CREATE (new) form ──
    if (isNew) {
        return (
            <div>
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="icon-btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /></button>
                        <div>
                            <div className="page-title">New Quote</div>
                            <div className="page-subtitle">Fill in client details and line items</div>
                        </div>
                    </div>
                </div>
                <QuoteForm initial={emptyForm} isNew saving={saving} onSave={handleSave} onCancel={() => navigate(`${basePath}/quotes`)} preselectedLead={preselectedLead} />
            </div>
        );
    }

    // ── EDIT mode ──
    if (editing) {
        const editInitial = {
            contact_name: quote.contact_name, contact_email: quote.contact_email || '',
            contact_phone: quote.contact_phone || '', company_name: quote.company_name || '',
            items: quote.items?.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) || [],
            discount_pct: quote.discount_pct || 0, tax_pct: quote.tax_pct || 18,
            notes: quote.notes || '', valid_until: quote.valid_until ? quote.valid_until.slice(0, 10) : '',
        };
        return (
            <div>
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="icon-btn" onClick={() => setEditing(false)}><ArrowLeft size={16} /></button>
                        <div>
                            <div className="page-title">Edit Quote · {quote.reference_no}</div>
                            <div className="page-subtitle" style={{ marginTop: 4 }}><StatusPill status={quote.status} /></div>
                        </div>
                    </div>
                </div>
                <QuoteForm initial={editInitial} isNew={false} saving={saving} onSave={handleSave} onCancel={() => setEditing(false)} />
            </div>
        );
    }

    // ── VIEW mode ──
    const subtotal = (quote.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const discount = subtotal * ((quote.discount_pct || 0) / 100);
    const afterDisc = subtotal - discount;
    const tax = afterDisc * ((quote.tax_pct || 0) / 100);
    const canEdit = ['draft', 'revised'].includes(quote.status);

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="icon-btn" onClick={() => navigate(`${basePath}/quotes`)}><ArrowLeft size={16} /></button>
                    <div>
                        <div className="page-title">{quote.reference_no}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                            <StatusPill status={quote.status} />
                            {quote.company_name && <span className="tag">{quote.company_name}</span>}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {canEdit && (
                        <button className="btn btn-outline" onClick={() => setEditing(true)}><Edit3 size={13} /> Edit</button>
                    )}
                    {quote.status === 'accepted' && (
                        <button className="btn btn-primary" style={{ background: '#2e7d32', borderColor: '#2e7d32', gap: 6 }}
                            onClick={() => { setOrderForm({ project_value: quote.total || '', due_date: '', priority: 'medium', project_notes: '' }); setOrderModal(true); }}>
                            <Rocket size={13} /> Create Order
                        </button>
                    )}
                    <button className="btn btn-outline" onClick={() => { setNewStatus(''); setStatusModal(true); }}>
                        <RefreshCw size={13} /> Update Status
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
                {/* LEFT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Client */}
                    <div className="card">
                        <div className="section-title">Client Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {[
                                ['Contact Name', quote.contact_name],
                                ['Company', quote.company_name || '—'],
                                ['Email', quote.contact_email || '—'],
                                ['Phone', quote.contact_phone || '—'],
                                ['Created by', quote.created_by?.name],
                                ['Valid Until', quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>{val}</div>
                                </div>
                            ))}
                        </div>
                        {quote.notes && (
                            <>
                                <div className="divider" />
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Notes</div>
                                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>{quote.notes}</p>
                            </>
                        )}
                    </div>

                    {/* Line Items */}
                    <div className="card">
                        <div className="section-title">Line Items</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
                            {['Description', 'Qty', 'Unit Price', 'Amount'].map(h => (
                                <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h !== 'Description' ? 'right' : 'left' }}>{h}</div>
                            ))}
                        </div>
                        {(quote.items || []).map((item, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px 110px', gap: 8, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 13, color: 'var(--ink)' }}>{item.description}</span>
                                <span style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>{item.quantity}</span>
                                <span style={{ fontSize: 13, color: 'var(--ink-2)', textAlign: 'right' }}>{fmt(item.unit_price)}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{fmt(item.quantity * item.unit_price)}</span>
                            </div>
                        ))}
                        {/* Totals */}
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ minWidth: 240 }}>
                                {[
                                    ['Subtotal', fmt(subtotal)],
                                    quote.discount_pct > 0 ? [`Discount (${quote.discount_pct}%)`, `− ${fmt(discount)}`] : null,
                                    [`Tax / GST (${quote.tax_pct}%)`, fmt(tax)],
                                ].filter(Boolean).map(([l, v]) => (
                                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>
                                        <span>{l}</span><span>{v}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 18, color: 'var(--ink)', paddingTop: 10, borderTop: '2px solid var(--border)', marginTop: 6 }}>
                                    <span>Total</span><span>{fmt(quote.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Status History */}
                <div className="card" style={{ height: 'fit-content' }}>
                    <div className="section-title">Status History</div>
                    {(quote.status_history || []).length === 0
                        ? <div className="empty" style={{ padding: '16px 0' }}><p>No history yet</p></div>
                        : (
                            <div className="timeline">
                                {[...quote.status_history].reverse().map((s, i) => (
                                    <div key={i} className="timeline-item">
                                        <div className={`tl-dot${i === 0 ? ' accent' : ''}`} style={i === 0 ? { background: STATUS_META[s.status]?.color } : {}} />
                                        <div className="tl-body">
                                            <div className="tl-action">
                                                <StatusPill status={s.status} />
                                            </div>
                                            {s.note && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{s.note}</div>}
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

            {/* ── STATUS UPDATE MODAL ── */}
            {statusModal && (
                <div className="modal-overlay" onClick={() => setStatusModal(false)}>
                    <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">Update Quote Status</span>
                            <button className="icon-btn" onClick={() => setStatusModal(false)}><X size={14} /></button>
                        </div>
                        <form onSubmit={handleStatusUpdate}>
                            <div className="form-group">
                                <label className="form-label">Current Status</label>
                                <div><StatusPill status={quote.status} /></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Status *</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {STATUS_OPTS.filter(s => s !== quote.status).map(s => {
                                        const m = STATUS_META[s];
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setNewStatus(s)}
                                                style={{
                                                    padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                                                    cursor: 'pointer', border: '2px solid',
                                                    borderColor: newStatus === s ? m.color : 'var(--border)',
                                                    background: newStatus === s ? m.color : 'transparent',
                                                    color: newStatus === s ? '#fff' : 'var(--ink-2)',
                                                    transition: 'all 0.15s', textTransform: 'capitalize',
                                                }}
                                            >
                                                {m.label || s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Note (optional)</label>
                                <textarea className="form-textarea" rows={2} placeholder="Add a note about this status change…" value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setStatusModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!newStatus || updatingStatus}>
                                    <Check size={13} /> {updatingStatus ? 'Updating…' : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ── CREATE ORDER MODAL ── */}
            {orderModal && (
                <div className="modal-overlay" onClick={() => setOrderModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">🚀 Create Service Order</span>
                            <button className="icon-btn" onClick={() => setOrderModal(false)}><X size={14} /></button>
                        </div>
                        <div style={{ padding: '4px 0 8px', fontSize: 13, color: 'var(--ink-3)' }}>Based on {quote.reference_no} — {quote.contact_name}</div>
                        <form onSubmit={handleCreateOrder}>
                            <div className="form-group">
                                <label className="form-label">Project Value (₹) *</label>
                                <input className="form-input" type="number" min={0} value={orderForm.project_value}
                                    onChange={e => setOrderForm(f => ({ ...f, project_value: e.target.value }))}
                                    placeholder={`Quote total: ₹${Number(quote.total || 0).toLocaleString('en-IN')}`} />
                                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>Leave blank to use the quote total.</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" type="date" value={orderForm.due_date}
                                        onChange={e => setOrderForm(f => ({ ...f, due_date: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-input" value={orderForm.priority}
                                        onChange={e => setOrderForm(f => ({ ...f, priority: e.target.value }))}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Project Notes</label>
                                <textarea className="form-textarea" rows={3} value={orderForm.project_notes}
                                    onChange={e => setOrderForm(f => ({ ...f, project_notes: e.target.value }))}
                                    placeholder="Any special instructions or notes for the operations team…" />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setOrderModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={creatingOrder} style={{ background: '#2e7d32', borderColor: '#2e7d32' }}>
                                    {creatingOrder ? 'Creating…' : '🚀 Create Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
