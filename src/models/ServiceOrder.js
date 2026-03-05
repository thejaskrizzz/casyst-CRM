const mongoose = require('mongoose');

const SO_STATUSES = [
    'pending_documents', 'documents_received', 'verification',
    'gov_submission', 'approval_waiting', 'completed', 'rejected', 'on_hold'
];

const paymentSchema = new mongoose.Schema({
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'other'], default: 'bank_transfer' },
    reference_no: { type: String, default: '' },
    note: { type: String, default: '' },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paid_at: { type: Date, default: Date.now },
    // Accountant approval workflow
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approved_at: { type: Date, default: null },
    rejection_reason: { type: String, default: '' },
}, { timestamps: true });

const EXPENSE_CATEGORIES = [
    'vendor', 'govt_fee', 'service_charge', 'gst',
    'transportation', 'miscellaneous', 'other'
];

const expenseSchema = new mongoose.Schema({
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
}, { timestamps: true });

module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;

const serviceOrderSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    quote: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },

    // Project financials
    project_value: { type: Number, default: 0 },       // agreed total from quote
    payments: { type: [paymentSchema], default: [] },   // recorded payments
    amount_paid: { type: Number, default: 0 },          // auto-computed
    balance_due: { type: Number, default: 0 },          // auto-computed
    payment_status: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    expenses: { type: [expenseSchema], default: [] },   // operational expenses

    // Project notes
    project_notes: { type: String, default: '' },

    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    due_date: { type: Date },
    status: { type: String, enum: SO_STATUSES, default: 'pending_documents' },
    status_history: [{
        status: { type: String, enum: SO_STATUSES },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changed_at: { type: Date, default: Date.now },
        note: { type: String },
    }],

    // Conversion tracking
    converted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    converted_at: { type: Date },

    is_archived: { type: Boolean, default: false },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-recompute payment fields before save (only approved payments count)
serviceOrderSchema.pre('save', async function () {
    const paid = this.payments
        .filter(p => p.status === 'approved')
        .reduce((s, p) => s + (p.amount || 0), 0);
    this.amount_paid = paid;
    this.balance_due = Math.max(0, (this.project_value || 0) - paid);
    if (paid <= 0) this.payment_status = 'unpaid';
    else if (paid >= (this.project_value || 0)) this.payment_status = 'paid';
    else this.payment_status = 'partial';
});

module.exports = mongoose.model('ServiceOrder', serviceOrderSchema);

