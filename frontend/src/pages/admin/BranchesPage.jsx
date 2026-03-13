import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, X, Building2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EMPTY = { name: '', code: '', address: '', phone: '', email: '' };

export default function BranchesPage() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null); // null = create
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try { setLoading(true); const { data } = await api.get('/branches'); setBranches(data.data || []); }
        catch { toast.error('Failed to load branches'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
    const openEdit = (b) => { setEditing(b); setForm({ name: b.name, code: b.code, address: b.address || '', phone: b.phone || '', email: b.email || '' }); setModal(true); };

    const save = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.code.trim()) { toast.error('Name and Code are required'); return; }
        setSaving(true);
        try {
            if (editing) { await api.patch(`/branches/${editing._id}`, form); toast.success('Company updated'); }
            else { await api.post('/branches', form); toast.success('Company created'); }
            setModal(false);
            load();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to save company'); }
        finally { setSaving(false); }
    };

    const toggleActive = async (b) => {
        try {
            await api.patch(`/branches/${b._id}`, { is_active: !b.is_active });
            toast.success(b.is_active ? 'Company deactivated' : 'Company activated');
            load();
        } catch { toast.error('Failed to update company'); }
    };

    return (
        <div style={{ maxWidth: 860, paddingBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Companies</h1>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Manage system companies. Each company has its own manager, sales, and operations team.</p>
                </div>
                <button className="btn btn-primary" style={{ gap: 6 }} onClick={openCreate}><Plus size={14} /> New Company</button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>
            ) : branches.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
                    <Building2 size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 500 }}>No companies yet</p>
                    <button className="btn btn-primary" style={{ marginTop: 16, gap: 6 }} onClick={openCreate}><Plus size={13} /> Create First Company</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                    {branches.map(b => (
                        <div key={b._id} className="card" style={{ opacity: b.is_active ? 1 : 0.6 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</span>
                                        <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 999, fontWeight: 700, background: b.is_active ? '#d1fae5' : '#f1f5f9', color: b.is_active ? '#065f46' : '#64748b' }}>
                                            {b.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', background: '#eef2ff', borderRadius: 6, padding: '2px 8px', display: 'inline-block', marginTop: 4 }}>{b.code}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="icon-btn" title="Edit" onClick={() => openEdit(b)}><Edit2 size={13} /></button>
                                    <button className="icon-btn" title={b.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(b)} style={{ color: b.is_active ? '#ef4444' : '#10b981' }}>
                                        {b.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                    </button>
                                </div>
                            </div>
                            {b.address && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>📍 {b.address}</div>}
                            {b.phone && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>📞 {b.phone}</div>}
                            {b.email && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>✉️ {b.email}</div>}
                        </div>
                    ))}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editing ? 'Edit Company' : '🏢 New Company'}</span>
                            <button className="icon-btn" onClick={() => setModal(false)}><X size={14} /></button>
                        </div>
                        <form onSubmit={save}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Company Name *</label>
                                    <input className="form-input" required placeholder="e.g. Mumbai HQ" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Company Code *</label>
                                    <input className="form-input" required placeholder="e.g. MUM" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={10} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" placeholder="info@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Address</label>
                                    <textarea className="form-input" rows={2} style={{ resize: 'none' }} placeholder="Full address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? '✓ Update' : '✓ Create Company'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
