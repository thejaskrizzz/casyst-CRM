const Quote = require('../models/Quote');
const { logActivity } = require('../utils/activityLogger');

// @desc  Get all quotes (filtered by creator for sales, all for admin/manager)
exports.getQuotes = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 15, search, lead_id } = req.query;
        const filter = { is_archived: false };

        if (req.user.role === 'sales') filter.created_by = req.user._id;
        if (status) filter.status = status;
        if (lead_id) filter.lead = lead_id;
        if (search) filter.$or = [
            { contact_name: { $regex: search, $options: 'i' } },
            { company_name: { $regex: search, $options: 'i' } },
            { reference_no: { $regex: search, $options: 'i' } },
        ];

        const total = await Quote.countDocuments(filter);
        const quotes = await Quote.find(filter)
            .populate('lead', 'name phone')
            .populate('created_by', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ success: true, count: total, data: quotes, page: Number(page) });
    } catch (err) { next(err); }
};

// @desc  Get single quote
exports.getQuote = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id)
            .populate('lead', 'name phone email')
            .populate('created_by', 'name')
            .populate('status_history.changed_by', 'name');
        if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
        if (req.user.role === 'sales' && quote.created_by._id.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });
        res.json({ success: true, data: quote });
    } catch (err) { next(err); }
};

// @desc  Create quote
exports.createQuote = async (req, res, next) => {
    try {
        const { lead, contact_name, contact_email, contact_phone, company_name, items, discount_pct, tax_pct, notes, valid_until } = req.body;
        const quote = await Quote.create({
            lead, contact_name, contact_email, contact_phone, company_name,
            items: items || [],
            discount_pct: discount_pct || 0,
            tax_pct: tax_pct ?? 18,
            notes, valid_until,
            created_by: req.user._id,
            status: 'draft',
            status_history: [{ status: 'draft', changed_by: req.user._id, note: 'Quote created' }],
        });
        await logActivity({ entity_type: 'quote', entity_id: quote._id, action: 'quote_created', performed_by: req.user._id, description: `Quote ${quote.reference_no} created for ${contact_name}` });
        res.status(201).json({ success: true, data: quote });
    } catch (err) { next(err); }
};

// @desc  Update quote (draft only — can't edit sent/accepted)
exports.updateQuote = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
        if (!['draft', 'revised'].includes(quote.status))
            return res.status(400).json({ success: false, message: 'Only draft or revised quotes can be edited' });
        if (req.user.role === 'sales' && quote.created_by.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });

        const { contact_name, contact_email, contact_phone, company_name, items, discount_pct, tax_pct, notes, valid_until } = req.body;
        Object.assign(quote, { contact_name, contact_email, contact_phone, company_name, items, discount_pct, tax_pct, notes, valid_until });
        await quote.save(); // triggers pre-save for total recalculation

        await logActivity({ entity_type: 'quote', entity_id: quote._id, action: 'quote_updated', performed_by: req.user._id, description: `Quote ${quote.reference_no} updated` });
        res.json({ success: true, data: quote });
    } catch (err) { next(err); }
};

// @desc  Update status
exports.updateStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body;
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
        if (req.user.role === 'sales' && quote.created_by.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });

        const prev = quote.status;
        quote.status = status;
        quote.status_history.push({ status, changed_by: req.user._id, note });
        await quote.save();

        await logActivity({ entity_type: 'quote', entity_id: quote._id, action: 'status_changed', performed_by: req.user._id, description: `Quote ${quote.reference_no} status changed from '${prev}' to '${status}'` });
        res.json({ success: true, data: quote });
    } catch (err) { next(err); }
};

// @desc  Delete (archive) quote
exports.deleteQuote = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
        if (req.user.role === 'sales' && quote.created_by.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: 'Access denied' });
        quote.is_archived = true;
        await quote.save();
        res.json({ success: true, message: 'Quote archived' });
    } catch (err) { next(err); }
};
