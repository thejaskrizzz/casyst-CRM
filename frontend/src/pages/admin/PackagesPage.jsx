import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Edit2 } from 'lucide-react';

export default function PackagesPage() {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editPkg, setEditPkg] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', estimated_days: '', required_documents: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchPackages = () => {
        setLoading(true);
        api.get('/packages').then(r => setPackages(r.data.data)).finally(() => setLoading(false));
    };
    useEffect(fetchPackages, []);

    const openCreate = () => { setEditPkg(null); setForm({ name: '', description: '', price: '', estimated_days: '', required_documents: '' }); setShowModal(true); };
    const openEdit = (p) => { setEditPkg(p); setForm({ name: p.name, description: p.description || '', price: p.price, estimated_days: p.estimated_days, required_documents: (p.required_documents || []).join(', ') }); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true);
        const payload = { ...form, price: Number(form.price), estimated_days: Number(form.estimated_days), required_documents: form.required_documents.split(',').map(s => s.trim()).filter(Boolean) };
        try {
            if (editPkg) await api.put(`/packages/${editPkg._id}`, payload);
            else await api.post('/packages', payload);
            setShowModal(false); fetchPackages();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
        finally { setSubmitting(false); }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Packages</div>
                    <div className="page-subtitle">Service offerings available to clients</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New Package</button>
            </div>

            {loading
                ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><div className="spinner" /></div>
                : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 16 }}>
                        {packages.map(p => (
                            <div key={p._id} className="card" style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 20, right: 20 }}>
                                    <button className="icon-btn" onClick={() => openEdit(p)} title="Edit"><Edit2 size={13} /></button>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', marginBottom: 4 }}>{p.name}</div>
                                    <div className="text-muted" style={{ fontSize: 13 }}>{p.description}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Price</div>
                                        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>₹{p.price?.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Est. Days</div>
                                        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>{p.estimated_days}</div>
                                    </div>
                                </div>
                                <div className="divider" style={{ margin: '12px 0' }} />
                                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Required Documents</div>
                                <div className="tag-list">
                                    {(p.required_documents || []).map((d, i) => <span key={i} className="tag">{d}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editPkg ? 'Edit Package' : 'New Package'}</span>
                            <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group"><label className="form-label">Package Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Price (₹) *</label><input className="form-input" type="number" required min={0} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Estimated Days *</label><input className="form-input" type="number" required min={1} value={form.estimated_days} onChange={e => setForm({ ...form, estimated_days: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Required Documents (comma separated)</label><textarea className="form-textarea" rows={2} placeholder="Aadhaar Card, PAN Card, Address Proof" value={form.required_documents} onChange={e => setForm({ ...form, required_documents: e.target.value })} /></div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editPkg ? 'Save Changes' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
