const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/logos/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `branch-logo-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
        cb(null, true);
    }
});

router.use(protect);

// List all branches (admin) or own branch
router.get('/', async (req, res, next) => {
    try {
        const branches = await Branch.find().sort({ name: 1 });
        res.json({ success: true, data: branches });
    } catch (err) { next(err); }
});

// Get own branch (Manager)
router.get('/me', authorize('manager', 'operations'), async (req, res, next) => {
    try {
        if (!req.user.branch) return res.status(404).json({ success: false, message: 'No branch assigned' });
        const branch = await Branch.findById(req.user.branch);
        res.json({ success: true, data: branch });
    } catch (err) { next(err); }
});

// Update own branch details (Manager only)
router.put('/me', authorize('manager'), async (req, res, next) => {
    try {
        if (!req.user.branch) return res.status(404).json({ success: false, message: 'No branch assigned' });
        const { tagline, website, address, phone, email, gst_number, pan_number, invoice_prefix, quote_prefix } = req.body;
        const branch = await Branch.findByIdAndUpdate(
            req.user.branch,
            { tagline, website, address, phone, email, gst_number, pan_number, invoice_prefix, quote_prefix },
            { new: true, runValidators: true }
        );
        res.json({ success: true, data: branch });
    } catch (err) { next(err); }
});

// Upload branch logo (Manager only)
router.post('/me/logo', authorize('manager'), upload.single('logo'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Please upload an image' });
        if (!req.user.branch) return res.status(404).json({ success: false, message: 'No branch assigned' });

        const logoUrl = `/uploads/logos/${req.file.filename}`;
        const branch = await Branch.findByIdAndUpdate(
            req.user.branch,
            { logo_url: logoUrl },
            { new: true }
        );
        res.json({ success: true, data: branch });
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
