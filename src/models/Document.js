const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    service_order: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceOrder', required: true },
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    original_name: { type: String },
    mime_type: { type: String },
    size: { type: Number },
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
