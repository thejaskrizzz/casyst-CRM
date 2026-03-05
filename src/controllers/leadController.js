const Lead = require('../models/Lead');
const Client = require('../models/Client');
const ServiceOrder = require('../models/ServiceOrder');
const CallLog = require('../models/CallLog');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get leads (sales: own, manager/admin: all)
exports.getLeads = async (req, res, next) => {
    try {
        const { status, source, page = 1, limit = 20, search, assigned_to } = req.query;
        const filter = { is_archived: false };

        if (req.user.role === 'sales') filter.assigned_to = req.user._id;
        else if (assigned_to) filter.assigned_to = assigned_to;

        if (status) filter.status = status;
        if (source) filter.source = source;
        if (search) filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];

        const total = await Lead.countDocuments(filter);
        const leads = await Lead.find(filter)
            .populate('assigned_to', 'name email')
            .populate('interested_package', 'name price')
            .populate('created_by', 'name')
            .skip((page - 1) * limit).limit(Number(limit))
            .sort({ createdAt: -1 });

        res.json({ success: true, count: total, data: leads, page: Number(page), limit: Number(limit) });
    } catch (err) { next(err); }
};

// @desc    Get single lead
exports.getLead = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate('assigned_to', 'name email')
            .populate('interested_package', 'name price required_documents')
            .populate('created_by', 'name')
            .populate('status_history.changed_by', 'name');
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (req.user.role === 'sales' && lead.assigned_to?._id?.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });
        res.json({ success: true, data: lead });
    } catch (err) { next(err); }
};

// @desc    Create lead
exports.createLead = async (req, res, next) => {
    try {
        const { name, phone, email, source, interested_package, notes } = req.body;
        const lead = await Lead.create({
            name, phone, email, source, interested_package, notes,
            assigned_to: req.user.role === 'sales' ? req.user._id : req.body.assigned_to,
            created_by: req.user._id,
            status_history: [{ status: 'new', changed_by: req.user._id, note: 'Lead created' }],
        });
        await logActivity({ entity_type: 'lead', entity_id: lead._id, action: 'lead_created', performed_by: req.user._id, description: `Lead '${lead.name}' created` });
        res.status(201).json({ success: true, data: lead });
    } catch (err) { next(err); }
};

// @desc    Update lead (pre-conversion only)
exports.updateLead = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (lead.converted) return res.status(400).json({ success: false, message: 'Cannot edit a converted lead' });
        if (req.user.role === 'sales' && lead.assigned_to?.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });

        const allowedUpdates = ['name', 'phone', 'email', 'source', 'interested_package', 'notes'];
        allowedUpdates.forEach(field => { if (req.body[field] !== undefined) lead[field] = req.body[field]; });

        if (req.body.assigned_to && ['admin', 'manager'].includes(req.user.role)) lead.assigned_to = req.body.assigned_to;
        await lead.save();
        await logActivity({ entity_type: 'lead', entity_id: lead._id, action: 'lead_updated', performed_by: req.user._id, description: `Lead '${lead.name}' updated` });
        res.json({ success: true, data: lead });
    } catch (err) { next(err); }
};

// @desc    Update lead status
exports.updateLeadStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (lead.converted) return res.status(400).json({ success: false, message: 'Lead is locked after conversion' });
        if (status === 'converted') return res.status(400).json({ success: false, message: 'Use the convert endpoint' });

        const prev = lead.status;
        lead.status = status;
        lead.status_history.push({ status, changed_by: req.user._id, note });
        await lead.save();
        await logActivity({ entity_type: 'lead', entity_id: lead._id, action: 'status_changed', performed_by: req.user._id, description: `Lead status changed from '${prev}' to '${status}'` });
        res.json({ success: true, data: lead });
    } catch (err) { next(err); }
};

// @desc    Convert lead -> create client + service order
exports.convertLead = async (req, res, next) => {
    try {
        const { company_name, package_id, priority, due_date, assigned_to_ops } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (lead.converted) return res.status(400).json({ success: false, message: 'Lead already converted' });

        // Lock the lead
        lead.converted = true;
        lead.status = 'converted';
        lead.status_history.push({ status: 'converted', changed_by: req.user._id, note: 'Lead converted to client' });
        await lead.save();

        // Create client
        const client = await Client.create({
            company_name: company_name || lead.name,
            contact_person: lead.name,
            phone: lead.phone,
            email: lead.email,
            lead: lead._id,
            created_by: req.user._id,
        });

        // Create service order — assign to ops staff if provided
        const serviceOrder = await ServiceOrder.create({
            client: client._id,
            package: package_id || lead.interested_package,
            lead: lead._id,
            priority: priority || 'medium',
            due_date,
            assigned_to: assigned_to_ops || undefined,
            assigned_by: assigned_to_ops ? req.user._id : undefined,
            created_by: req.user._id,
            status_history: [{ status: 'pending_documents', changed_by: req.user._id, note: 'Service order created on lead conversion' }],
        });

        await logActivity({ entity_type: 'lead', entity_id: lead._id, action: 'lead_converted', performed_by: req.user._id, description: `Lead '${lead.name}' converted to client and service order created` });
        await logActivity({ entity_type: 'client', entity_id: client._id, action: 'client_created', performed_by: req.user._id, description: `Client '${client.company_name}' created on conversion` });
        await logActivity({ entity_type: 'service_order', entity_id: serviceOrder._id, action: 'service_order_created', performed_by: req.user._id, description: `Service order created for client '${client.company_name}'${assigned_to_ops ? ' and assigned to operations' : ''}` });

        res.status(201).json({ success: true, data: { lead, client, serviceOrder } });
    } catch (err) { next(err); }
};

// @desc    Add call log
exports.addCallLog = async (req, res, next) => {
    try {
        const { note, outcome, next_followup_date } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        const call = await CallLog.create({ lead: lead._id, performed_by: req.user._id, note, outcome, next_followup_date });
        await logActivity({ entity_type: 'lead', entity_id: lead._id, action: 'call_logged', performed_by: req.user._id, description: `Call logged: ${outcome}` });
        res.status(201).json({ success: true, data: call });
    } catch (err) { next(err); }
};

// @desc    Get call logs for a lead
exports.getCallLogs = async (req, res, next) => {
    try {
        const calls = await CallLog.find({ lead: req.params.id })
            .populate('performed_by', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: calls });
    } catch (err) { next(err); }
};

// @desc    Get today's followups
exports.getTodayFollowups = async (req, res, next) => {
    try {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

        const filter = { next_followup_date: { $gte: startOfDay, $lte: endOfDay } };
        if (req.user.role === 'sales') filter.performed_by = req.user._id;

        const calls = await CallLog.find(filter)
            .populate({ path: 'lead', select: 'name phone email status', match: { is_archived: false } })
            .populate('performed_by', 'name');

        const result = calls.filter(c => c.lead); // Remove archived leads
        res.json({ success: true, count: result.length, data: result });
    } catch (err) { next(err); }
};

// @desc    Get activity for a lead
exports.getLeadActivity = async (req, res, next) => {
    try {
        const ActivityLog = require('../models/ActivityLog');
        const logs = await ActivityLog.find({ entity_type: 'lead', entity_id: req.params.id })
            .populate('performed_by', 'name role')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: logs });
    } catch (err) { next(err); }
};

// @desc    Assign lead to a sales user (admin/manager only)
exports.assignLead = async (req, res, next) => {
    try {
        const { assigned_to } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (lead.converted) return res.status(400).json({ success: false, message: 'Cannot reassign a converted lead' });

        const prevAssignee = lead.assigned_to;
        lead.assigned_to = assigned_to || null;
        await lead.save();

        await logActivity({
            entity_type: 'lead', entity_id: lead._id,
            action: 'lead_assigned', performed_by: req.user._id,
            description: `Lead '${lead.name}' assigned by ${req.user.name}`,
        });

        const updated = await Lead.findById(lead._id)
            .populate('assigned_to', 'name email')
            .populate('interested_package', 'name price');

        res.json({ success: true, data: updated });
    } catch (err) { next(err); }
};
