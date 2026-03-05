const mongoose = require('mongoose');

const LEAD_STATUSES = ['new', 'contacted', 'followup', 'interested', 'not_interested', 'lost', 'converted'];

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    source: { type: String, enum: ['ads', 'website', 'referral', 'walkin'], required: true },
    interested_package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    notes: { type: String },
    status: { type: String, enum: LEAD_STATUSES, default: 'new' },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    converted: { type: Boolean, default: false },
    status_history: [{
        status: { type: String, enum: LEAD_STATUSES },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changed_at: { type: Date, default: Date.now },
        note: { type: String },
    }],
    is_archived: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
