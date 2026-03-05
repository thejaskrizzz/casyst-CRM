/**
 * generateInvoice(payment, order, settings)
 * Opens a print-ready HTML invoice in a new window.
 * The user can save it as PDF using the browser's "Save as PDF" print option.
 */

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export function generateInvoice(payment, order, settings) {
    const s = settings || {};
    const prefix = s.invoice_prefix || 'INV';
    const invoiceNo = `${prefix}-${payment._id?.toString().slice(-6).toUpperCase()}`;
    const logoSrc = s.logo_url
        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://casyst-crm.onrender.com'}${s.logo_url}`
        : null;

    const address = [s.address_line1, s.address_line2, s.city, s.state, s.pincode, s.country]
        .filter(Boolean).join(', ');

    const methodLabels = { cash: 'Cash', bank_transfer: 'Bank Transfer', upi: 'UPI', cheque: 'Cheque', other: 'Other' };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${invoiceNo}</title>
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
  .invoice-badge { text-align: right; }
  .invoice-title { font-size: 32px; font-weight: 800; color: #6366f1; letter-spacing: -1px; text-transform: uppercase; }
  .invoice-no { font-size: 13px; color: #888; margin-top: 4px; }
  .invoice-date { font-size: 12px; color: #555; margin-top: 2px; }

  /* Status pill */
  .status-approved { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }

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
  <div class="watermark">PAID</div>

  <!-- HEADER -->
  <div class="header">
    <div class="logo-block">
      ${logoSrc
            ? `<img src="${logoSrc}" class="logo-img" alt="Logo" />`
            : `<div class="logo-placeholder">${(s.company_name || 'C').charAt(0)}</div>`}
      <div>
        <div class="company-name">${s.company_name || 'Company Name'}</div>
        <div class="company-sub">${s.tagline || (s.website || '')}</div>
      </div>
    </div>
    <div class="invoice-badge">
      <div class="invoice-title">Invoice</div>
      <div class="invoice-no"># ${invoiceNo}</div>
      <div class="invoice-date">Date: ${fmtDate(payment.approved_at || payment.paid_at)}</div>
      <div style="margin-top:8px"><span class="status-approved">✓ PAYMENT APPROVED</span></div>
    </div>
  </div>

  <!-- FROM / TO -->
  <div class="info-grid">
    <div class="info-block">
      <div class="info-label">From</div>
      <div class="info-value">
        <strong>${s.company_name || '—'}</strong>
        ${address ? `<div class="muted">${address}</div>` : ''}
        ${s.phone ? `<div class="muted">📞 ${s.phone}</div>` : ''}
        ${s.email ? `<div class="muted">✉ ${s.email}</div>` : ''}
        ${s.gst_number ? `<div class="muted">GST: ${s.gst_number}</div>` : ''}
        ${s.pan_number ? `<div class="muted">PAN: ${s.pan_number}</div>` : ''}
      </div>
    </div>
    <div class="info-block">
      <div class="info-label">Billed To</div>
      <div class="info-value">
        <strong>${order.client?.company_name || order.client?.contact_person || '—'}</strong>
        ${order.client?.contact_person && order.client?.company_name ? `<div class="muted">${order.client.contact_person}</div>` : ''}
        ${order.client?.phone ? `<div class="muted">📞 ${order.client.phone}</div>` : ''}
        ${order.client?.email ? `<div class="muted">✉ ${order.client.email}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- SERVICE TABLE -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Payment Method</th>
          <th>Reference No.</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>${order.package?.name || 'Professional Service'}</strong>
            ${payment.note ? `<br/><span style="color:#888;font-size:11px">${payment.note}</span>` : ''}
            <br/><span style="color:#888;font-size:11px">Payment Date: ${fmtDate(payment.paid_at)}</span>
          </td>
          <td>${methodLabels[payment.method] || payment.method || '—'}</td>
          <td style="font-family:monospace;font-size:12px">${payment.reference_no || '—'}</td>
          <td style="text-align:right;font-weight:700;color:#1a1a2e">${fmt(payment.amount)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TOTALS -->
  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${fmt(payment.amount)}</span>
      </div>
      <div class="totals-row">
        <span>Tax / GST</span>
        <span>Included</span>
      </div>
      <div class="totals-row">
        <span>Total Paid</span>
        <span>${fmt(payment.amount)}</span>
      </div>
    </div>
  </div>

  <!-- APPROVAL INFO -->
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:32px;font-size:12px;color:#065f46">
    <strong>✓ Verified & Approved</strong>
    ${payment.approved_by?.name ? ` by <strong>${payment.approved_by.name}</strong>` : ''}
    ${payment.approved_at ? ` on ${fmtDate(payment.approved_at)}` : ''}
    <br/><span style="opacity:0.75">This payment has been reviewed and approved by the accounts department.</span>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-note">
      Thank you for your business. This is a computer-generated invoice and does not require a signature.
      ${s.website ? `<br/>Visit us at <strong>${s.website}</strong>` : ''}
    </div>
    <div class="footer-company">
      <strong>${s.company_name || 'Company'}</strong>
      ${s.email ? `${s.email}<br/>` : ''}
      ${s.phone ? s.phone : ''}
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
        alert('Pop-up blocked. Please allow pop-ups for this site to download invoices.');
    }
}
