const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    entity_type: { type: String, enum: ['lead', 'service_order', 'client', 'user', 'package', 'task', 'document'], required: true },
    entity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
