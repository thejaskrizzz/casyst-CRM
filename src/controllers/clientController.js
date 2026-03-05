const Client = require('../models/Client');
const { logActivity } = require('../utils/activityLogger');

exports.getClients = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, is_archived = false } = req.query;
        const filter = { is_archived: is_archived === 'true' };
        if (search) filter.$or = [
            { company_name: { $regex: search, $options: 'i' } },
            { contact_person: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
        ];
        const total = await Client.countDocuments(filter);
        const clients = await Client.find(filter)
            .populate('lead', 'name source status')
            .skip((page - 1) * limit).limit(Number(limit))
            .sort({ createdAt: -1 });
        res.json({ success: true, count: total, data: clients, page: Number(page), limit: Number(limit) });
    } catch (err) { next(err); }
};

exports.getClient = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id).populate('lead');
        if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
        res.json({ success: true, data: client });
    } catch (err) { next(err); }
};

exports.archiveClient = async (req, res, next) => {
    try {
        const client = await Client.findByIdAndUpdate(req.params.id, { is_archived: true }, { new: true });
        if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
        await logActivity({ entity_type: 'client', entity_id: client._id, action: 'client_archived', performed_by: req.user._id, description: `Client '${client.company_name}' archived` });
        res.json({ success: true, data: client });
    } catch (err) { next(err); }
};
