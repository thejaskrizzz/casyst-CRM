const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, lowercase: true, default: '' },
    tagline: { type: String, default: '' },
    website: { type: String, default: '' },
    logo_url: { type: String, default: '' },
    gst_number: { type: String, uppercase: true, trim: true, default: '' },
    pan_number: { type: String, uppercase: true, trim: true, default: '' },
    invoice_prefix: { type: String, uppercase: true, trim: true, default: '' },
    quote_prefix: { type: String, uppercase: true, trim: true, default: '' },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
