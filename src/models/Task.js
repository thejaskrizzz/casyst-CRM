const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    service_order: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceOrder', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'in_progress', 'done'], default: 'pending' },
    remarks: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
