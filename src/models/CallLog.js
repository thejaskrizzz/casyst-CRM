const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true },
    outcome: { type: String, enum: ['no_answer', 'interested', 'not_interested', 'followup', 'converted', 'callback'], required: true },
    next_followup_date: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
