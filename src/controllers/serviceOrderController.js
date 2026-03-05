const ServiceOrder = require('../models/ServiceOrder');
const Quote = require('../models/Quote');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { logActivity } = require('../utils/activityLogger');

/* ──────────── GET list ──────────── */
exports.getServiceOrders = async (req, res, next) => {
    try {
        const { status, priority, page = 1, limit = 20, assigned_to, search } = req.query;
        const filter = { is_archived: false };

        if (req.user.role === 'operations') filter.assigned_to = req.user._id;
        else if (req.user.role === 'sales') filter.created_by = req.user._id;
        else if (assigned_to) filter.assigned_to = assigned_to;

        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const total = await ServiceOrder.countDocuments(filter);
        const orders = await ServiceOrder.find(filter)
            .populate('client', 'company_name contact_person phone email')
            .populate('package', 'name price estimated_days')
            .populate('assigned_to', 'name email')
            .populate('assigned_by', 'name')
            .populate('quote', 'reference_no total')
            .skip((page - 1) * limit).limit(Number(limit))
            .sort({ createdAt: -1 });

        res.json({ success: true, count: total, data: orders, page: Number(page), limit: Number(limit) });
    } catch (err) { next(err); }
};

/* ──────────── GET single ──────────── */
exports.getServiceOrder = async (req, res, next) => {
    try {
        const order = await ServiceOrder.findById(req.params.id)
            .populate('client', 'company_name contact_person phone email lead')
            .populate('package', 'name price estimated_days required_documents')
            .populate('assigned_to', 'name email')
            .populate('assigned_by', 'name')
            .populate('created_by', 'name role')
            .populate('converted_by', 'name')
            .populate('lead', 'name phone email status')
            .populate('quote', 'reference_no total subtotal discount_pct tax_pct items contact_name')
            .populate('status_history.changed_by', 'name')
            .populate('payments.recorded_by', 'name');
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        // Operations can only see their own
        if (req.user.role === 'operations' && order.assigned_to?._id?.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });
        // Sales can only see orders they created
        if (req.user.role === 'sales' && order.created_by?._id?.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });

        res.json({ success: true, data: order });
    } catch (err) { next(err); }
};

/* ──────────── CREATE order from quote ──────────── */
exports.createServiceOrder = async (req, res, next) => {
    try {
        const { quote_id, lead_id, priority, due_date, project_notes, project_value, package_id } = req.body;

        let clientId, packageId = package_id;
        let leadId = lead_id, quoteId = quote_id;
        let finalProjectValue = project_value ? Number(project_value) : 0;

        if (quote_id) {
            const quote = await Quote.findById(quote_id).populate('lead');
            if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
            if (quote.status !== 'accepted') return res.status(400).json({ success: false, message: 'Quote must be accepted before creating an order' });

            quoteId = quote._id;
            if (!finalProjectValue) finalProjectValue = quote.total || 0;

            // Use lead from quote if not explicitly provided
            if (!leadId && quote.lead) leadId = quote.lead._id || quote.lead;
        }

        // Resolve lead → get or create Client
        if (leadId) {
            const lead = await Lead.findById(leadId).populate('interested_package');
            if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

            // Find or create client record
            let client = await Client.findOne({ lead: leadId });
            if (!client) {
                client = await Client.create({
                    company_name: lead.name,
                    contact_person: lead.name,
                    phone: lead.phone || '0000000000',
                    email: lead.email || '',
                    lead: leadId,
                    created_by: req.user._id,
                });
            }
            clientId = client._id;

            // Use lead's interested_package if no package explicitly provided
            if (!packageId && lead.interested_package) {
                packageId = lead.interested_package._id || lead.interested_package;
            }

            // Mark lead as converted
            if (lead.status !== 'converted') {
                lead.status = 'converted';
                lead.converted = true;
                lead.status_history.push({ status: 'converted', changed_by: req.user._id, note: 'Marked converted on order creation' });
                await lead.save();
            }
        }

        if (!clientId) return res.status(400).json({ success: false, message: 'Could not determine client. Provide a lead_id or quote linked to a lead.' });

        // If still no package, find any package in the system to use as placeholder
        if (!packageId) {
            const Package = require('../models/Package');
            const anyPkg = await Package.findOne();
            if (anyPkg) packageId = anyPkg._id;
            else return res.status(400).json({ success: false, message: 'No packages found. Please create at least one package in admin settings.' });
        }

        const order = await ServiceOrder.create({
            client: clientId,
            package: packageId,
            lead: leadId || undefined,
            quote: quoteId || undefined,
            project_value: finalProjectValue,
            project_notes: project_notes || '',
            priority: priority || 'medium',
            due_date: due_date || null,
            converted_by: req.user._id,
            converted_at: new Date(),
            created_by: req.user._id,
        });

        await logActivity({
            entity_type: 'service_order', entity_id: order._id,
            action: 'service_order_created', performed_by: req.user._id,
            description: `Service order created${quoteId ? ` from quote` : ''}`,
        });

        res.status(201).json({ success: true, data: order, message: 'Order created successfully' });
    } catch (err) { next(err); }
};


/* ──────────── UPDATE order (priority / due_date / project_notes) ──────────── */
exports.updateServiceOrder = async (req, res, next) => {
    try {
        const { priority, due_date, project_notes, project_value } = req.body;
        const updates = {};
        if (priority !== undefined) updates.priority = priority;
        if (due_date !== undefined) updates.due_date = due_date;
        if (project_notes !== undefined) updates.project_notes = project_notes;
        if (project_value !== undefined) updates.project_value = project_value;

        const order = await ServiceOrder.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });
        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'service_order_updated', performed_by: req.user._id, description: `Service order updated` });
        res.json({ success: true, data: order });
    } catch (err) { next(err); }
};

/* ──────────── UPDATE status ──────────── */
exports.updateStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });
        if (order.is_archived) return res.status(400).json({ success: false, message: 'Cannot update archived order' });

        const prev = order.status;
        order.status = status;
        order.status_history.push({ status, changed_by: req.user._id, note });

        await order.save();
        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'status_changed', performed_by: req.user._id, description: `Status changed from '${prev}' to '${status}'` });
        res.json({ success: true, data: order });
    } catch (err) { next(err); }
};

/* ──────────── ASSIGN order ──────────── */
exports.assignServiceOrder = async (req, res, next) => {
    try {
        const { assigned_to, priority, due_date, note } = req.body;
        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        order.assigned_to = assigned_to;
        order.assigned_by = req.user._id;
        if (priority) order.priority = priority;
        if (due_date) order.due_date = due_date;
        if (note) order.status_history.push({ status: order.status, changed_by: req.user._id, note: `Assigned: ${note}` });

        await order.save();

        const populated = await ServiceOrder.findById(order._id).populate('assigned_to', 'name email');
        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'service_assigned', performed_by: req.user._id, description: `Assigned to ${populated.assigned_to?.name}` });
        res.json({ success: true, data: populated });
    } catch (err) { next(err); }
};

/* ──────────── ADD payment (saved as pending — awaits accountant approval) ──────────── */
exports.addPayment = async (req, res, next) => {
    try {
        const { amount, method, reference_no, note, paid_at } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });

        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        order.payments.push({
            amount, method: method || 'bank_transfer', reference_no, note,
            recorded_by: req.user._id, paid_at: paid_at || new Date(),
            status: 'pending',
        });
        await order.save();

        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'payment_added', performed_by: req.user._id, description: `Payment of ₹${amount} submitted for approval (${method || 'bank_transfer'})` });

        const populated = await ServiceOrder.findById(order._id).populate('payments.recorded_by', 'name').populate('payments.approved_by', 'name');
        res.status(201).json({ success: true, data: populated, message: `Payment of ₹${amount} submitted — awaiting accountant approval` });
    } catch (err) { next(err); }
};

/* ──────────── APPROVE payment ──────────── */
exports.approvePayment = async (req, res, next) => {
    try {
        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        const payment = order.payments.id(req.params.pid);
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.status !== 'pending') return res.status(400).json({ success: false, message: `Payment is already ${payment.status}` });

        payment.status = 'approved';
        payment.approved_by = req.user._id;
        payment.approved_at = new Date();
        payment.rejection_reason = '';
        await order.save(); // pre-save hook recalculates totals

        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'payment_approved', performed_by: req.user._id, description: `Payment of ₹${payment.amount} approved` });

        const populated = await ServiceOrder.findById(order._id).populate('payments.recorded_by', 'name').populate('payments.approved_by', 'name');
        res.json({ success: true, data: populated, message: `Payment of ₹${payment.amount} approved` });
    } catch (err) { next(err); }
};

/* ──────────── REJECT payment ──────────── */
exports.rejectPayment = async (req, res, next) => {
    try {
        const { rejection_reason } = req.body;
        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        const payment = order.payments.id(req.params.pid);
        if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.status !== 'pending') return res.status(400).json({ success: false, message: `Payment is already ${payment.status}` });

        payment.status = 'rejected';
        payment.approved_by = req.user._id;
        payment.approved_at = new Date();
        payment.rejection_reason = rejection_reason || 'No reason provided';
        await order.save();

        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'payment_rejected', performed_by: req.user._id, description: `Payment of ₹${payment.amount} rejected: ${rejection_reason || 'No reason'}` });

        const populated = await ServiceOrder.findById(order._id).populate('payments.recorded_by', 'name').populate('payments.approved_by', 'name');
        res.json({ success: true, data: populated, message: `Payment rejected` });
    } catch (err) { next(err); }
};

/* ──────────── DELETE payment ──────────── */
exports.deletePayment = async (req, res, next) => {
    try {
        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        const pidx = order.payments.findIndex(p => p._id.toString() === req.params.pid);
        if (pidx === -1) return res.status(404).json({ success: false, message: 'Payment not found' });

        const deleted = order.payments[pidx];
        order.payments.splice(pidx, 1);
        await order.save();

        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'payment_deleted', performed_by: req.user._id, description: `Payment of ₹${deleted.amount} deleted` });
        res.json({ success: true, message: 'Payment deleted' });
    } catch (err) { next(err); }
};

/* ──────────── Activity ──────────── */
exports.getServiceOrderActivity = async (req, res, next) => {
    try {
        const ActivityLog = require('../models/ActivityLog');
        const logs = await ActivityLog.find({ entity_type: 'service_order', entity_id: req.params.id })
            .populate('performed_by', 'name role')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: logs });
    } catch (err) { next(err); }
};

/* ──────────── ADD expense ──────────── */
exports.addExpense = async (req, res, next) => {
    try {
        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        const { category, description, amount, date, notes } = req.body;
        if (!category || !amount) return res.status(400).json({ success: false, message: 'Category and amount are required' });

        // Enforce cap: total expenses cannot exceed the total approved payment amount
        const approvedTotal = order.payments
            .filter(p => p.status === 'approved')
            .reduce((s, p) => s + (p.amount || 0), 0);
        const currentExpenses = order.expenses.reduce((s, e) => s + (e.amount || 0), 0);
        if (currentExpenses + Number(amount) > approvedTotal) {
            return res.status(400).json({
                success: false,
                message: `Expense exceeds available verified funds. Available: ₹${(approvedTotal - currentExpenses).toFixed(2)}`
            });
        }

        order.expenses.push({
            category, description, amount: Number(amount),
            date: date || new Date(),
            notes,
            recorded_by: req.user._id,
        });
        await order.save();

        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'expense_added', performed_by: req.user._id, description: `Expense of ₹${amount} added under "${category}"` });

        const populated = await ServiceOrder.findById(order._id).populate('expenses.recorded_by', 'name');
        res.status(201).json({ success: true, data: populated.expenses, message: 'Expense recorded' });
    } catch (err) { next(err); }
};

/* ──────────── DELETE expense ──────────── */
exports.deleteExpense = async (req, res, next) => {
    try {
        const order = await ServiceOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

        const eidx = order.expenses.findIndex(e => e._id.toString() === req.params.eid);
        if (eidx === -1) return res.status(404).json({ success: false, message: 'Expense not found' });

        const deleted = order.expenses[eidx];
        order.expenses.splice(eidx, 1);
        await order.save();

        await logActivity({ entity_type: 'service_order', entity_id: order._id, action: 'expense_deleted', performed_by: req.user._id, description: `Expense of ₹${deleted.amount} deleted` });
        res.json({ success: true, message: 'Expense deleted' });
    } catch (err) { next(err); }
};
