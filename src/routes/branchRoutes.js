const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// List all branches (admin) or own branch
router.get('/', async (req, res, next) => {
    try {
        const branches = await Branch.find().sort({ name: 1 });
        res.json({ success: true, data: branches });
    } catch (err) { next(err); }
});

// Create branch (admin only)
router.post('/', authorize('admin'), async (req, res, next) => {
    try {
        const { name, code, address, phone, email } = req.body;
        const branch = await Branch.create({ name, code: code.toUpperCase(), address, phone, email, created_by: req.user._id });
        res.status(201).json({ success: true, data: branch });
    } catch (err) { next(err); }
});

// Update branch (admin only)
router.patch('/:id', authorize('admin'), async (req, res, next) => {
    try {
        const { name, code, address, phone, email, is_active } = req.body;
        const branch = await Branch.findByIdAndUpdate(
            req.params.id,
            { name, ...(code && { code: code.toUpperCase() }), address, phone, email, is_active },
            { new: true, runValidators: true }
        );
        if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
        res.json({ success: true, data: branch });
    } catch (err) { next(err); }
});

// Delete/deactivate branch (admin only)
router.delete('/:id', authorize('admin'), async (req, res, next) => {
    try {
        await Branch.findByIdAndUpdate(req.params.id, { is_active: false });
        res.json({ success: true, message: 'Branch deactivated' });
    } catch (err) { next(err); }
});

module.exports = router;
