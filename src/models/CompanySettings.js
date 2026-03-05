const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
    // There should only ever be one document — singleton pattern
    company_name: { type: String, default: 'Casyst' },
    tagline: { type: String, default: '' },
    logo_url: { type: String, default: '' },
    address_line1: { type: String, default: '' },
    address_line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' },
    gst_number: { type: String, default: '' },
    pan_number: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    website: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    invoice_prefix: { type: String, default: 'INV' },
    quote_prefix: { type: String, default: 'QT' },
    default_tax_pct: { type: Number, default: 18 },
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
