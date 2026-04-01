import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
    Building2, MapPin, Phone, Mail, Globe, FileText,
    Upload, Save, RefreshCw, Hash
} from 'lucide-react';

/* ─────────────── Section card helper ─────────────── */
function SectionCard({ icon: Icon, title, children }) {
    return (
        <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent-pastel,#ede7f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Icon size={16} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
            </div>
            {children}
        </div>
    );
}

/* ─────────────── Field helper ─────────────── */
function Field({ label, required, children, helper }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {label}{required && <span style={{ color: '#ef5350', marginLeft: 2 }}>*</span>}
            </label>
            {children}
            {helper && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>{helper}</div>}
        </div>
    );
}

const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)',
    boxSizing: 'border-box', outline: 'none', transition: 'border 0.15s',
};

/* ═══════════════════════════════════════════ */
export default function ManagerSettings() {
    const [form, setForm] = useState({
        name: '', code: '',
        tagline: '', logo_url: '',
        address: '',
        gst_number: '', pan_number: '',
        email: '', phone: '', website: '',
        invoice_prefix: '', quote_prefix: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState('');
    const fileRef = useRef();

    useEffect(() => {
        api.get('/branches/me').then(r => {
            setForm({
                ...r.data.data,
                invoice_prefix: r.data.data.invoice_prefix || '',
                quote_prefix: r.data.data.quote_prefix || ''
            });
            setLogoPreview(r.data.data.logo_url || '');
        }).catch(() => {
            toast.error('Failed to load company details');
        }).finally(() => setLoading(false));
    }, []);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const r = await api.put('/branches/me', form);
            setForm({
                ...r.data.data,
                invoice_prefix: r.data.data.invoice_prefix || '',
                quote_prefix: r.data.data.quote_prefix || ''
            });
            toast.success('Company details saved!');
        } catch {
            toast.error('Failed to save details');
        } finally { setSaving(false); }
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
        // Preview locally
        const reader = new FileReader();
        reader.onload = ev => setLogoPreview(ev.target.result);
        reader.readAsDataURL(file);
        // Upload
        setUploading(true);
        try {
            const fd = new FormData(); fd.append('logo', file);
            const r = await api.post('/branches/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            set('logo_url', r.data.data.logo_url);
            toast.success('Logo uploaded!');
        } catch {
            toast.error('Logo upload failed');
        } finally { setUploading(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

    const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://casyst-crm.onrender.com';

    return (
        <div style={{ maxWidth: 900, paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 28 }}>
                <div>
                    <div className="page-title">Company Settings</div>
                    <div className="page-subtitle">Configure your specific branch details and branding for documents</div>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 8 }}>
                    {saving ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
                </button>
            </div>

            {/* ── Logo & Identity ── */}
            <SectionCard icon={Building2} title="Company Identity">
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Logo upload */}
                    <div style={{ flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Company Logo</label>
                        <div
                            onClick={() => fileRef.current?.click()}
                            style={{
                                width: 120, height: 120, borderRadius: 14, border: '2px dashed var(--border)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', overflow: 'hidden', background: 'var(--surface-2)',
                                transition: 'border-color 0.15s',
                                position: 'relative',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            {logoPreview ? (
                                <img src={logoPreview.startsWith('data:') ? logoPreview : `${BASE}${logoPreview}`}
                                    alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                            ) : (
                                <>
                                    <Upload size={22} style={{ color: 'var(--ink-3)', marginBottom: 6 }} />
                                    <span style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', padding: '0 8px' }}>Click to upload logo</span>
                                </>
                            )}
                            {uploading && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="spinner" style={{ width: 24, height: 24 }} />
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                        <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, textAlign: 'center' }}>PNG, JPG — max 2MB</div>
                    </div>

                    {/* Name + tagline */}
                    <div style={{ flex: 1, minWidth: 240 }}>
                        <Field label="Company Name" required>
                            <input style={inputStyle} value={form.name} disabled title="Contact an admin to change the company name." />
                        </Field>
                        <Field label="Branch Code" required>
                            <input style={inputStyle} value={form.code} disabled title="Contact an admin to change the branch code." />
                        </Field>
                        <Field label="Tagline / Slogan">
                            <input style={inputStyle} value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Registration & Compliance Experts" />
                        </Field>
                        <Field label="Website">
                            <input style={inputStyle} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://casyst.in" />
                        </Field>
                    </div>
                </div>
            </SectionCard>

            {/* ── Contact Info ── */}
            <SectionCard icon={Phone} title="Contact Information">
                <div className="grid-2" style={{ gap: '0 20px' }}>
                    <Field label="Email">
                        <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="company@casyst.in" />
                    </Field>
                    <Field label="Phone">
                        <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                    </Field>
                </div>
            </SectionCard>

            {/* ── Address ── */}
            <SectionCard icon={MapPin} title="Address">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0 20px' }}>
                    <Field label="Full Address">
                        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full office address including city, state, pin..." />
                    </Field>
                </div>
            </SectionCard>

            {/* ── Tax & Registration ── */}
            <SectionCard icon={Hash} title="Tax & Registration">
                <div className="grid-2" style={{ gap: '0 20px' }}>
                    <Field label="GST Number">
                        <input style={inputStyle} value={form.gst_number} onChange={e => set('gst_number', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                    </Field>
                    <Field label="PAN Number">
                        <input style={inputStyle} value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} />
                    </Field>
                </div>
            </SectionCard>

            {/* ── Document Preferences ── */}
            <SectionCard icon={FileText} title="Document Preferences">
                <div className="grid-2" style={{ gap: '0 20px' }}>
                    <Field label="Invoice Number Prefix" helper="Leave blank to use global prefix">
                        <input style={inputStyle} value={form.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value.toUpperCase())} placeholder="e.g. CHN-INV" maxLength={10} />
                    </Field>
                    <Field label="Quote Number Prefix" helper="Leave blank to use global prefix">
                        <input style={inputStyle} value={form.quote_prefix} onChange={e => set('quote_prefix', e.target.value.toUpperCase())} placeholder="e.g. CHN-QT" maxLength={10} />
                    </Field>
                </div>
            </SectionCard>

            {/* Bottom Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 8 }}>
                    {saving ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : <><Save size={13} /> Save All Changes</>}
                </button>
            </div>
        </div>
    );
}
