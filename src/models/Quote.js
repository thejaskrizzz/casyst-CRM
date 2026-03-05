const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    unit_price: { type: Number, required: true, min: 0 },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
    status: { type: String },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

const quoteSchema = new mongoose.Schema({
    // Reference to lead (optional — quote can be standalone)
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    // Contact details (pre-filled from lead but editable)
    contact_name: { type: String, required: true },
    contact_email: { type: String },
    contact_phone: { type: String },
    company_name: { type: String },

    // Line items
    items: { type: [itemSchema], default: [] },

    // Financials (calculated)
    subtotal: { type: Number, default: 0 },
    discount_pct: { type: Number, default: 0, min: 0, max: 100 },
    tax_pct: { type: Number, default: 18, min: 0, max: 100 }, // GST default 18%
    total: { type: Number, default: 0 },

    // Meta
    notes: { type: String },
    valid_until: { type: Date },
    reference_no: { type: String, unique: true },

    // Status flow
    status: {
        type: String,
        enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'],
        default: 'draft',
    },
    status_history: { type: [statusHistorySchema], default: [] },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    is_archived: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate reference number and recalculate totals
quoteSchema.pre('save', async function () {
    if (!this.reference_no) {
        const count = await mongoose.model('Quote').countDocuments();
        this.reference_no = `QT-${String(count + 1).padStart(4, '0')}`;
    }
    // Recalculate totals
    const subtotal = this.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const discount = subtotal * (this.discount_pct / 100);
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (this.tax_pct / 100);
    this.subtotal = subtotal;
    this.total = Math.round(afterDiscount + tax);
});

module.exports = mongoose.model('Quote', quoteSchema);
