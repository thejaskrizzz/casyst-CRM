import { useState, useEffect } from 'react';
import { Plus, Trash2, FileDown, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const METHODS = ['cash', 'bank_transfer', 'upi', 'cheque', 'other'];
const METHOD_LABELS = { cash: 'Cash', bank_transfer: 'Bank Transfer', upi: 'UPI', cheque: 'Cheque', other: 'Other' };

const today = () => new Date().toISOString().slice(0, 10);
const fmtNum = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmt = (n) => `₹${fmtNum(n)}`;

function newItem() {
    return { id: Date.now(), description: '', qty: 1, rate: '', };
}

export default function ManualInvoicePage() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    // Invoice fields
    const [invoiceNo, setInvoiceNo] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(today());
    const [dueDate, setDueDate] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [referenceNo, setReferenceNo] = useState('');
    const [notes, setNotes] = useState('');

    // Bill To
    const [clientName, setClientName] = useState('');
    const [clientContact, setClientContact] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');

    // Line items
    const [items, setItems] = useState([newItem()]);

    // Discount / tax
    const [discountPct, setDiscountPct] = useState(0);
    const [taxPct, setTaxPct] = useState(0);

    useEffect(() => {
        api.get('/settings').then(r => {
            setSettings(r.data.data);
            const p = r.data.data?.invoice_prefix || 'INV';
            setInvoiceNo(`${p}-${Date.now().toString().slice(-6)}`);
            setTaxPct(r.data.data?.default_tax_pct || 0);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const updateItem = (id, field, val) =>
        setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it));
    const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id));
    const addItem = () => setItems(prev => [...prev, newItem()]);

    const subtotal = items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate || 0)), 0);
    const discountAmt = subtotal * (Number(discountPct) / 100);
    const taxable = subtotal - discountAmt;
    const taxAmt = taxable * (Number(taxPct) / 100);
    const total = taxable + taxAmt;

    const reset = () => {
        setClientName(''); setClientContact(''); setClientPhone(''); setClientEmail('');
        setItems([newItem()]); setDiscountPct(0); setNotes(''); setReferenceNo('');
        setDueDate(''); setInvoiceDate(today());
        const p = settings?.invoice_prefix || 'INV';
        setInvoiceNo(`${p}-${Date.now().toString().slice(-6)}`);
    };

    const generateInvoice = () => {
        if (!clientName.trim()) { toast.error('Client name is required'); return; }
        if (items.every(it => !it.rate)) { toast.error('Add at least one line item with a rate'); return; }

        const s = settings || {};
        const logoSrc = s.logo_url
            ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://casyst-crm.onrender.com'}${s.logo_url}`
            : null;
        const address = [s.address_line1, s.address_line2, s.city, s.state, s.pincode, s.country].filter(Boolean).join(', ');
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

        const itemRows = items.filter(it => it.rate).map((it, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${it.description || 'Service'}</td>
                <td style="text-align:center">${it.qty}</td>
                <td style="text-align:right">${fmt(it.rate)}</td>
                <td style="text-align:right;font-weight:700">${fmt(Number(it.qty) * Number(it.rate))}</td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a2e;font-size:13px;line-height:1.5}
  .page{max-width:760px;margin:0 auto;padding:48px 48px 60px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:28px;border-bottom:2px solid #e8e8f0}
  .logo-img{width:54px;height:54px;object-fit:contain;border-radius:10px;border:1px solid #e8e8f0}
  .logo-ph{width:54px;height:54px;background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:800}
  .logo-block{display:flex;align-items:center;gap:14px}
  .company-name{font-size:20px;font-weight:800;letter-spacing:-0.5px}
  .company-sub{font-size:11px;color:#888;margin-top:2px}
  .inv-title{font-size:32px;font-weight:800;color:#6366f1;letter-spacing:-1px;text-transform:uppercase;text-align:right}
  .inv-meta{font-size:12px;color:#888;margin-top:4px;text-align:right}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px}
  .info-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#6366f1;margin-bottom:8px}
  .info-value strong{font-weight:700;font-size:14px;display:block}
  .info-value .muted{color:#888;font-size:12px}
  .table-wrap{border:1px solid #e8e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px}
  table{width:100%;border-collapse:collapse}
  thead tr{background:linear-gradient(135deg,#6366f1,#818cf8)}
  thead th{padding:12px 16px;text-align:left;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
  tbody tr:nth-child(even){background:#f8f8ff}
  tbody td{padding:13px 16px;border-bottom:1px solid #f0f0f8;font-size:13px}
  tbody tr:last-child td{border-bottom:none}
  .totals{display:flex;justify-content:flex-end;margin-bottom:36px}
  .totals-box{width:280px}
  .tot-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e8e8f0;font-size:13px}
  .tot-row:last-child{border:none;border-top:2px solid #6366f1;padding-top:12px;font-size:16px;font-weight:800;color:#6366f1}
  .notes-box{background:#fafafa;border:1px solid #e8e8f0;border-radius:10px;padding:14px 18px;margin-bottom:32px;font-size:12px;color:#555}
  .footer{border-top:1px solid #e8e8f0;padding-top:24px;display:flex;justify-content:space-between;font-size:11px;color:#aaa}
  .footer strong{color:#1a1a2e;font-size:12px;display:block;margin-bottom:4px}
  .watermark{position:fixed;bottom:40px;right:40px;opacity:.04;font-size:80px;font-weight:900;color:#6366f1;transform:rotate(-30deg);pointer-events:none}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}.page{padding:24px}}
</style>
</head>
<body>
<div class="page">
<div class="watermark">INVOICE</div>
<div class="header">
  <div class="logo-block">
    ${logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Logo"/>` : `<div class="logo-ph">${(s.company_name || 'C').charAt(0)}</div>`}
    <div>
      <div class="company-name">${s.company_name || 'Company Name'}</div>
      <div class="company-sub">${s.tagline || s.website || ''}</div>
    </div>
  </div>
  <div>
    <div class="inv-title">Invoice</div>
    <div class="inv-meta"># ${invoiceNo}</div>
    <div class="inv-meta">Date: ${fmtDate(invoiceDate)}</div>
    ${dueDate ? `<div class="inv-meta">Due: ${fmtDate(dueDate)}</div>` : ''}
  </div>
</div>

<div class="info-grid">
  <div>
    <div class="info-label">From</div>
    <div class="info-value">
      <strong>${s.company_name || '—'}</strong>
      ${address ? `<span class="muted">${address}</span>` : ''}
      ${s.phone ? `<span class="muted">📞 ${s.phone}</span>` : ''}
      ${s.email ? `<span class="muted">✉ ${s.email}</span>` : ''}
      ${s.gst_number ? `<span class="muted">GST: ${s.gst_number}</span>` : ''}
    </div>
  </div>
  <div>
    <div class="info-label">Billed To</div>
    <div class="info-value">
      <strong>${clientName}</strong>
      ${clientContact ? `<span class="muted">${clientContact}</span>` : ''}
      ${clientPhone ? `<span class="muted">📞 ${clientPhone}</span>` : ''}
      ${clientEmail ? `<span class="muted">✉ ${clientEmail}</span>` : ''}
    </div>
  </div>
</div>

<div class="table-wrap">
  <table>
    <thead><tr>
      <th>#</th><th>Description</th><th style="text-align:center">Qty</th>
      <th style="text-align:right">Rate</th><th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
</div>

<div class="totals">
  <div class="totals-box">
    <div class="tot-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    ${discountPct > 0 ? `<div class="tot-row"><span>Discount (${discountPct}%)</span><span>- ${fmt(discountAmt)}</span></div>` : ''}
    ${taxPct > 0 ? `<div class="tot-row"><span>Tax / GST (${taxPct}%)</span><span>${fmt(taxAmt)}</span></div>` : ''}
    <div class="tot-row"><span>Total</span><span>${fmt(total)}</span></div>
  </div>
</div>

${referenceNo || paymentMethod !== 'bank_transfer' ? `
<div class="notes-box">
  Payment Method: <strong>${METHOD_LABELS[paymentMethod] || paymentMethod}</strong>
  ${referenceNo ? ` &nbsp;|&nbsp; Reference: <strong>${referenceNo}</strong>` : ''}
</div>` : ''}

${notes ? `<div class="notes-box"><strong>Notes:</strong><br/>${notes}</div>` : ''}

<div class="footer">
  <div>Thank you for your business. This is a computer-generated invoice.${s.website ? `<br/>Visit us at <strong>${s.website}</strong>` : ''}</div>
  <div style="text-align:right"><strong>${s.company_name || ''}</strong>${s.email ? s.email + '<br/>' : ''}${s.phone || ''}</div>
</div>
</div>

<div class="no-print" style="position:fixed;top:20px;right:20px;display:flex;gap:10px">
  <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(99,102,241,.3)">⬇ Download / Print PDF</button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#555;border:none;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer;font-family:Inter,sans-serif">Close</button>
</div>
</body>
</html>`;

        const win = window.open('', '_blank', 'width=820,height=960,scrollbars=yes');
        if (win) { win.document.write(html); win.document.close(); }
        else toast.error('Pop-up blocked — please allow pop-ups to download invoices.');
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" /></div>;

    // ─── RENDER ───
    const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, width: '100%' };

    return (
        <div style={{ maxWidth: 920, paddingBottom: 60 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700 }}>Create Invoice</h1>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Build a custom invoice and download it as PDF</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline" style={{ gap: 6 }} onClick={reset}><RotateCcw size={14} /> Reset</button>
                    <button className="btn btn-primary" style={{ gap: 6, padding: '10px 20px' }} onClick={generateInvoice}><FileDown size={15} /> Generate & Download</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Invoice Meta */}
                <div className="card">
                    <div className="section-title">Invoice Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Invoice No.</label>
                            <input style={inputStyle} value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Invoice Date</label>
                            <input type="date" style={inputStyle} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input type="date" style={inputStyle} value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Payment Method</label>
                            <select style={inputStyle} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Reference / Transaction No.</label>
                            <input style={inputStyle} value={referenceNo} placeholder="UTR, cheque no., etc." onChange={e => setReferenceNo(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="card">
                    <div className="section-title">Bill To</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Client / Company Name *</label>
                            <input style={inputStyle} value={clientName} placeholder="ABC Corp" onChange={e => setClientName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Contact Person</label>
                            <input style={inputStyle} value={clientContact} placeholder="John Doe" onChange={e => setClientContact(e.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input style={inputStyle} value={clientPhone} placeholder="+91 98765 43210" onChange={e => setClientPhone(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input style={inputStyle} value={clientEmail} placeholder="client@email.com" onChange={e => setClientEmail(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div className="section-title" style={{ margin: 0 }}>Line Items</div>
                    <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} onClick={addItem}><Plus size={13} /> Add Item</button>
                </div>

                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px 36px', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                    {['Description', 'Qty', 'Rate (₹)', ''].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
                    ))}
                </div>

                {items.map((it) => (
                    <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px 36px', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                        <input style={inputStyle} placeholder="Service description…" value={it.description} onChange={e => updateItem(it.id, 'description', e.target.value)} />
                        <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min={1} value={it.qty} onChange={e => updateItem(it.id, 'qty', e.target.value)} />
                        <input style={{ ...inputStyle, textAlign: 'right' }} type="number" min={0} step="0.01" placeholder="0.00" value={it.rate} onChange={e => updateItem(it.id, 'rate', e.target.value)} />
                        <button className="icon-btn" style={{ color: '#ef4444' }} onClick={() => items.length > 1 && removeItem(it.id)} disabled={items.length === 1}><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Notes + discount/tax */}
                <div className="card">
                    <div className="section-title">Additional Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Discount (%)</label>
                            <input style={inputStyle} type="number" min={0} max={100} value={discountPct} onChange={e => setDiscountPct(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax / GST (%)</label>
                            <input style={inputStyle} type="number" min={0} max={100} value={taxPct} onChange={e => setTaxPct(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: 4 }}>
                        <label className="form-label">Notes</label>
                        <textarea rows={3} style={{ ...inputStyle, resize: 'none' }} placeholder="Payment terms, thank you message, etc." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                {/* Totals preview */}
                <div className="card">
                    <div className="section-title">Summary</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                            { label: 'Subtotal', val: subtotal },
                            discountPct > 0 && { label: `Discount (${discountPct}%)`, val: -discountAmt, color: '#ef4444' },
                            taxPct > 0 && { label: `Tax / GST (${taxPct}%)`, val: taxAmt },
                        ].filter(Boolean).map(({ label, val, color }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px dashed var(--border)' }}>
                                <span style={{ color: 'var(--ink-3)' }}>{label}</span>
                                <span style={{ fontWeight: 600, color: color || 'var(--ink)' }}>{val < 0 ? `- ${fmt(-val)}` : fmt(val)}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800, color: '#6366f1', paddingTop: 6 }}>
                            <span>Total</span>
                            <span>{fmt(total)}</span>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: '12px', fontSize: 14, gap: 8 }}
                        onClick={generateInvoice}
                    >
                        <FileDown size={16} /> Generate & Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}
