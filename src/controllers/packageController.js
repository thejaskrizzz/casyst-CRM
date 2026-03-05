const Package = require('../models/Package');
const { logActivity } = require('../utils/activityLogger');

exports.getPackages = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search, is_active } = req.query;
        const filter = {};
        if (is_active !== undefined) filter.is_active = is_active === 'true';
        if (search) filter.name = { $regex: search, $options: 'i' };
        const total = await Package.countDocuments(filter);
        const packages = await Package.find(filter)
            .populate('created_by', 'name')
            .skip((page - 1) * limit).limit(Number(limit))
            .sort({ createdAt: -1 });
        res.json({ success: true, count: total, data: packages });
    } catch (err) { next(err); }
};

exports.createPackage = async (req, res, next) => {
    try {
        const { name, description, price, estimated_days, required_documents } = req.body;
        const pkg = await Package.create({ name, description, price, estimated_days, required_documents, created_by: req.user._id });
        await logActivity({ entity_type: 'package', entity_id: pkg._id, action: 'package_created', performed_by: req.user._id, description: `Package '${pkg.name}' created` });
        res.status(201).json({ success: true, data: pkg });
    } catch (err) { next(err); }
};

exports.updatePackage = async (req, res, next) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
        await logActivity({ entity_type: 'package', entity_id: pkg._id, action: 'package_updated', performed_by: req.user._id, description: `Package '${pkg.name}' updated` });
        res.json({ success: true, data: pkg });
    } catch (err) { next(err); }
};

exports.deletePackage = async (req, res, next) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
        await logActivity({ entity_type: 'package', entity_id: pkg._id, action: 'package_deactivated', performed_by: req.user._id, description: `Package '${pkg.name}' deactivated` });
        res.json({ success: true, message: 'Package deactivated' });
    } catch (err) { next(err); }
};

exports.getPackage = async (req, res, next) => {
    try {
        const pkg = await Package.findById(req.params.id).populate('created_by', 'name');
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
        res.json({ success: true, data: pkg });
    } catch (err) { next(err); }
};
