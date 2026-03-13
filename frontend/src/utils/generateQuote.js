/**
 * generateQuote(quote, settings)
 * Opens a print-ready HTML quote in a new window.
 * The user can save it as PDF using the browser's "Save as PDF" print option.
 */

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export function generateQuote(quote, settings) {
    const s = settings || {};
    const b = quote?.created_by?.branch || {}; // Branch details taking priority

    const prefix = b.quote_prefix || s.quote_prefix || 'QT';
    const quoteNo = quote.reference_no || `${prefix}-${quote._id?.toString().slice(-6).toUpperCase()}`;
    
    // Choose branch logo if it exists, otherwise fallback to global
    const logoSrcUrl = b.logo_url || s.logo_url;
    const logoSrc = logoSrcUrl
        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://casyst-crm.onrender.com'}${logoSrcUrl}`
        : null;

    // Use branch address if available, otherwise global address
    const address = b.address || [s.address_line1, s.address_line2, s.city, s.state, s.pincode, s.country]
        .filter(Boolean).join(', ');

    // Use branch details if available, otherwise global settings
    const companyName = b.name || s.company_name || 'Company Name';
    const companyEmail = b.email || s.email || '';
    const companyPhone = b.phone || s.phone || '';
    const tagline = b.tagline || s.tagline || '';
    const website = b.website || s.website || '';
    const gstNumber = b.gst_number || s.gst_number || '';
    const panNumber = b.pan_number || s.pan_number || '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Quotation ${quoteNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a2e; font-size: 13px; line-height: 1.5; }

  .page { max-width: 760px; margin: 0 auto; padding: 48px 48px 60px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 28px; border-bottom: 2px solid #e8e8f0; }
  .logo-block { display: flex; align-items: center; gap: 14px; }
  .logo-img { width: 54px; height: 54px; object-fit: contain; border-radius: 10px; border: 1px solid #e8e8f0; }
  .logo-placeholder { width: 54px; height: 54px; background: linear-gradient(135deg, #6366f1, #818cf8); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 800; }
  .company-name { font-size: 20px; font-weight: 800; color: #1a1a2e; letter-spacing: -0.5px; }
  .company-sub { font-size: 11px; color: #888; margin-top: 2px; }
  .quote-badge { text-align: right; }
  .quote-title { font-size: 32px; font-weight: 800; color: #6366f1; letter-spacing: -1px; text-transform: uppercase; }
  .quote-no { font-size: 13px; color: #888; margin-top: 4px; }
  .quote-date { font-size: 12px; color: #555; margin-top: 2px; }

  /* Status pill */
  .status-accepted { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
  .status-sent { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }

  /* Info Grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 36px; }
  .info-block { }
  .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6366f1; margin-bottom: 8px; }
  .info-value { font-size: 13px; color: #1a1a2e; font-weight: 500; }
  .info-value strong { font-weight: 700; font-size: 14px; }
  .info-value .muted { color: #888; font-weight: 400; font-size: 12px; }

  /* Table */
  .table-wrap { border: 1px solid #e8e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%); }
  thead th { padding: 12px 16px; text-align: left; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
  tbody tr:nth-child(even) { background: #f8f8ff; }
  tbody td { padding: 14px 16px; border-bottom: 1px solid #f0f0f8; font-size: 13px; }
  tbody tr:last-child td { border-bottom: none; }

  /* Totals */
  .totals { display: flex; justify-content: flex-end; margin-bottom: 36px; }
  .totals-box { width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e8e8f0; font-size: 13px; }
  .totals-row:last-child { border-bottom: none; border-top: 2px solid #6366f1; padding-top: 12px; font-size: 16px; font-weight: 800; color: #6366f1; }

  /* Footer */
  .footer { border-top: 1px solid #e8e8f0; padding-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-note { font-size: 11px; color: #aaa; max-width: 320px; line-height: 1.6; }
  .footer-company { text-align: right; font-size: 11px; color: #888; }
  .footer-company strong { color: #1a1a2e; font-size: 12px; display: block; margin-bottom: 4px; }

  /* Watermark */
  .watermark { position: fixed; bottom: 40px; right: 40px; opacity: 0.04; font-size: 80px; font-weight: 900; color: #6366f1; transform: rotate(-30deg); pointer-events: none; z-index: 0; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page { padding: 24px; }
    .watermark { position: fixed; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="watermark">QUOTATION</div>

  <!-- HEADER -->
  <div class="header">
    <div class="logo-block">
      ${logoSrc
            ? `<img src="${logoSrc}" class="logo-img" alt="Logo" />`
            : `<div class="logo-placeholder">${companyName.charAt(0)}</div>`}
      <div>
        <div class="company-name">${companyName}</div>
        <div class="company-sub">${tagline || website}</div>
      </div>
    </div>
    <div class="quote-badge">
      <div class="quote-title">Quotation</div>
      <div class="quote-no"># ${quoteNo}</div>
      <div class="quote-date">Date: ${fmtDate(quote.createdAt)}</div>
      ${quote.valid_until ? `<div class="quote-date">Valid Until: ${fmtDate(quote.valid_until)}</div>` : ''}
      ${quote.status === 'accepted' ? `<div style="margin-top:8px"><span class="status-accepted">✓ ACCEPTED</span></div>` : ''}
    </div>
  </div>

  <!-- FROM / TO -->
  <div class="info-grid">
    <div class="info-block">
      <div class="info-label">From</div>
      <div class="info-value">
        <strong>${companyName}</strong>
        ${address ? `<div class="muted">${address}</div>` : ''}
        ${companyPhone ? `<div class="muted">📞 ${companyPhone}</div>` : ''}
        ${companyEmail ? `<div class="muted">✉ ${companyEmail}</div>` : ''}
        ${gstNumber ? `<div class="muted">GST: ${gstNumber}</div>` : ''}
        ${panNumber ? `<div class="muted">PAN: ${panNumber}</div>` : ''}
      </div>
    </div>
    <div class="info-block">
      <div class="info-label">Quotation For</div>
      <div class="info-value">
        <strong>${quote.contact_name || '—'}</strong>
        ${quote.company_name ? `<div class="muted">${quote.company_name}</div>` : ''}
        ${quote.contact_phone ? `<div class="muted">📞 ${quote.contact_phone}</div>` : ''}
        ${quote.contact_email ? `<div class="muted">✉ ${quote.contact_email}</div>` : ''}
      </div>
    </div>
  </div>

  ${quote.notes ? `
    <div style="margin-bottom: 24px; background: #f8f8ff; padding: 16px; border-radius: 8px; border-left: 4px solid #6366f1;">
      <strong style="color: #6366f1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Notes</strong><br/>
      <span style="font-size: 12px; color: #555;">${quote.notes}</span>
    </div>
  ` : ''}


  <!-- ITEM TABLE -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(quote.items || []).map((item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${item.description}</strong></td>
          <td style="text-align:right">${item.quantity}</td>
          <td style="text-align:right">${fmt(item.unit_price)}</td>
          <td style="text-align:right;font-weight:700;color:#1a1a2e">${fmt(item.quantity * item.unit_price)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- TOTALS -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${fmt(quote.subtotal)}</span>
      </div>
      ${quote.discount_pct > 0 ? `
      <div class="totals-row">
        <span>Discount (${quote.discount_pct}%)</span>
        <span style="color: #ef4444;">− ${fmt(quote.subtotal * (quote.discount_pct / 100))}</span>
      </div>
      ` : ''}
      <div class="totals-row">
        <span>Tax / GST (${quote.tax_pct}%)</span>
        <span>${fmt((quote.subtotal - (quote.subtotal * ((quote.discount_pct || 0) / 100))) * ((quote.tax_pct || 0) / 100))}</span>
      </div>
      <div class="totals-row">
        <span>Total Estimated</span>
        <span>${fmt(quote.total)}</span>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-note">
      This quotation is valid until ${quote.valid_until ? fmtDate(quote.valid_until) : 'further notice'}.
      ${website ? `<br/>Visit us at <strong>${website}</strong>` : ''}
    </div>
    <div class="footer-company">
      <strong>${companyName}</strong>
      ${companyEmail ? `${companyEmail}<br/>` : ''}
      ${companyPhone ? companyPhone : ''}
    </div>
  </div>
</div>

<!-- Print button (hidden on print) -->
<div class="no-print" style="position:fixed;top:20px;right:20px;display:flex;gap:10px">
  <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;box-shadow:0 4px 12px rgba(99,102,241,0.3)">
    ⬇ Download / Print PDF
  </button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#555;border:none;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer;font-family:Inter,sans-serif">
    Close
  </button>
</div>

<script>
  // Auto-trigger print after fonts load
  window.onload = () => setTimeout(() => {}, 500);
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=820,height=960,scrollbars=yes');
    if (win) {
        win.document.write(html);
        win.document.close();
    } else {
        alert('Pop-up blocked. Please allow pop-ups for this site to download quotations.');
    }
}
