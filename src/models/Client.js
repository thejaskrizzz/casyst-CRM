const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    company_name: { type: String, required: true, trim: true },
    contact_person: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    is_archived: { type: Boolean, default: false },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
