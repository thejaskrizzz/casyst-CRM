const CompanySettings = require('../models/CompanySettings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Logo upload storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/logo');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `logo${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
        cb(null, true);
    }
});

// GET /api/settings — fetch (or auto-create) the singleton
exports.getSettings = async (req, res, next) => {
    try {
        let settings = await CompanySettings.findOne();
        if (!settings) settings = await CompanySettings.create({});
        res.json({ success: true, data: settings });
    } catch (err) { next(err); }
};

// PUT /api/settings — upsert
exports.updateSettings = async (req, res, next) => {
    try {
        const allowed = [
            'company_name', 'tagline', 'logo_url', 'address_line1', 'address_line2',
            'city', 'state', 'pincode', 'country', 'gst_number', 'pan_number',
            'email', 'phone', 'website', 'currency', 'invoice_prefix', 'quote_prefix', 'default_tax_pct'
        ];
        const update = {};
        allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

        let settings = await CompanySettings.findOne();
        if (!settings) {
            settings = await CompanySettings.create(update);
        } else {
            Object.assign(settings, update);
            await settings.save();
        }
        res.json({ success: true, data: settings, message: 'Company settings updated' });
    } catch (err) { next(err); }
};

// POST /api/settings/logo — upload logo file
exports.uploadLogo = [
    upload.single('logo'),
    async (req, res, next) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
            const logo_url = `/uploads/logo/${req.file.filename}`;
            let settings = await CompanySettings.findOne();
            if (!settings) settings = await CompanySettings.create({ logo_url });
            else { settings.logo_url = logo_url; await settings.save(); }
            res.json({ success: true, data: { logo_url }, message: 'Logo uploaded' });
        } catch (err) { next(err); }
    }
];
