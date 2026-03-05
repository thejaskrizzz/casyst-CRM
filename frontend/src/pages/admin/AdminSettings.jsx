import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
    Building2, MapPin, Phone, Mail, Globe, FileText,
    Upload, Save, RefreshCw, Settings, Hash, Percent
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
function Field({ label, required, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {label}{required && <span style={{ color: '#ef5350', marginLeft: 2 }}>*</span>}
            </label>
            {children}
        </div>
    );
}

const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)',
    boxSizing: 'border-box', outline: 'none', transition: 'border 0.15s',
};

/* ═══════════════════════════════════════════ */
export default function AdminSettings() {
    const [form, setForm] = useState({
        company_name: '', tagline: '', logo_url: '',
        address_line1: '', address_line2: '',
        city: '', state: '', pincode: '', country: 'India',
        gst_number: '', pan_number: '',
        email: '', phone: '', website: '',
        currency: 'INR', invoice_prefix: 'INV', quote_prefix: 'QT', default_tax_pct: 18,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState('');
    const fileRef = useRef();

    useEffect(() => {
        api.get('/settings').then(r => {
            setForm(r.data.data);
            setLogoPreview(r.data.data.logo_url || '');
        }).finally(() => setLoading(false));
    }, []);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const r = await api.put('/settings', form);
            setForm(r.data.data);
            toast.success('Settings saved!');
        } catch {
            toast.error('Failed to save settings');
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
            const r = await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            set('logo_url', r.data.data.logo_url);
            toast.success('Logo uploaded!');
        } catch {
            toast.error('Logo upload failed');
        } finally { setUploading(false); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

    const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    return (
        <div style={{ maxWidth: 900, paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 28 }}>
                <div>
                    <div className="page-title">Company Settings</div>
                    <div className="page-subtitle">Configure your company information used across the CRM and documents</div>
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
                            <input style={inputStyle} value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="e.g. Casyst Consultants" />
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                    <Field label="Email" required>
                        <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@casyst.in" />
                    </Field>
                    <Field label="Phone">
                        <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
                    </Field>
                </div>
            </SectionCard>

            {/* ── Address ── */}
            <SectionCard icon={MapPin} title="Address">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                    <Field label="Address Line 1">
                        <input style={inputStyle} value={form.address_line1} onChange={e => set('address_line1', e.target.value)} placeholder="Building, Street" />
                    </Field>
                    <Field label="Address Line 2">
                        <input style={inputStyle} value={form.address_line2} onChange={e => set('address_line2', e.target.value)} placeholder="Area, Landmark" />
                    </Field>
                    <Field label="City">
                        <input style={inputStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Chennai" />
                    </Field>
                    <Field label="State">
                        <input style={inputStyle} value={form.state} onChange={e => set('state', e.target.value)} placeholder="e.g. Tamil Nadu" />
                    </Field>
                    <Field label="Pincode">
                        <input style={inputStyle} value={form.pincode} onChange={e => set('pincode', e.target.value)} placeholder="600001" />
                    </Field>
                    <Field label="Country">
                        <input style={inputStyle} value={form.country} onChange={e => set('country', e.target.value)} placeholder="India" />
                    </Field>
                </div>
            </SectionCard>

            {/* ── Tax & Registration ── */}
            <SectionCard icon={Hash} title="Tax & Registration">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 20px' }}>
                    <Field label="Currency">
                        <select style={inputStyle} value={form.currency} onChange={e => set('currency', e.target.value)}>
                            <option value="INR">INR — ₹ Indian Rupee</option>
                            <option value="USD">USD — $ US Dollar</option>
                            <option value="EUR">EUR — € Euro</option>
                            <option value="GBP">GBP — £ British Pound</option>
                        </select>
                    </Field>
                    <Field label="Invoice Number Prefix">
                        <input style={inputStyle} value={form.invoice_prefix} onChange={e => set('invoice_prefix', e.target.value.toUpperCase())} placeholder="INV" maxLength={6} />
                    </Field>
                    <Field label="Quote Number Prefix">
                        <input style={inputStyle} value={form.quote_prefix} onChange={e => set('quote_prefix', e.target.value.toUpperCase())} placeholder="QT" maxLength={6} />
                    </Field>
                    <Field label="Default Tax %">
                        <div style={{ position: 'relative' }}>
                            <input
                                style={{ ...inputStyle, paddingRight: 32 }}
                                type="number" min={0} max={100}
                                value={form.default_tax_pct}
                                onChange={e => set('default_tax_pct', Number(e.target.value))}
                            />
                            <Percent size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                        </div>
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
