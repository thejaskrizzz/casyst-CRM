const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    estimated_days: { type: Number, required: true, min: 1 },
    required_documents: [{ type: String }],
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Package', packageSchema);
