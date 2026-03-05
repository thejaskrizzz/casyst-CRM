const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

// @desc    Get all users
// @route   GET /api/users
exports.getUsers = async (req, res, next) => {
    try {
        const { role, status, page = 1, limit = 20, search } = req.query;
        const filter = {};
        if (role) filter.role = role;
        if (status) filter.status = status;
        if (search) filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];

        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .skip((page - 1) * limit).limit(Number(limit))
            .sort({ createdAt: -1 });

        res.json({ success: true, count: total, data: users, page: Number(page), limit: Number(limit) });
    } catch (err) { next(err); }
};

// @desc    Create user
// @route   POST /api/users
exports.createUser = async (req, res, next) => {
    try {
        const { name, email, phone, password, role } = req.body;
        const user = await User.create({ name, email, phone, password, role });
        await logActivity({ entity_type: 'user', entity_id: user._id, action: 'user_created', performed_by: req.user._id, description: `User '${user.name}' (${user.role}) created` });
        res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
};

// @desc    Update user
// @route   PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
    try {
        const { name, email, phone, role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { name, email, phone, role }, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        await logActivity({ entity_type: 'user', entity_id: user._id, action: 'user_updated', performed_by: req.user._id, description: `User '${user.name}' updated` });
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};

// @desc    Toggle user status
// @route   PATCH /api/users/:id/status
exports.toggleStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user._id.toString() === req.user._id.toString())
            return res.status(400).json({ success: false, message: 'Cannot change your own status' });
        user.status = user.status === 'active' ? 'inactive' : 'active';
        await user.save();
        await logActivity({ entity_type: 'user', entity_id: user._id, action: 'user_status_changed', performed_by: req.user._id, description: `User '${user.name}' status changed to ${user.status}` });
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};

// @desc    Reset user password
// @route   PATCH /api/users/:id/reset-password
exports.resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.password = newPassword;
        user.refresh_tokens = [];
        await user.save();
        await logActivity({ entity_type: 'user', entity_id: user._id, action: 'password_reset', performed_by: req.user._id, description: `Password reset for '${user.name}'` });
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) { next(err); }
};

// @desc    Get single user
// @route   GET /api/users/:id
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
};
