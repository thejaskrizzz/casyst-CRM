const Document = require('../models/Document');
const { logActivity } = require('../utils/activityLogger');
const path = require('path');

exports.getDocuments = async (req, res, next) => {
    try {
        const docs = await Document.find({ service_order: req.params.id })
            .populate('uploaded_by', 'name')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: docs });
    } catch (err) { next(err); }
};

exports.uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

        const doc = await Document.create({
            service_order: req.params.id,
            file_name: req.file.filename,
            original_name: req.file.originalname,
            file_url: `/uploads/${req.params.id}/${req.file.filename}`,
            mime_type: req.file.mimetype,
            size: req.file.size,
            uploaded_by: req.user._id,
        });

        await logActivity({ entity_type: 'service_order', entity_id: req.params.id, action: 'document_uploaded', performed_by: req.user._id, description: `Document '${req.file.originalname}' uploaded` });
        res.status(201).json({ success: true, data: doc });
    } catch (err) { next(err); }
};

exports.deleteDocument = async (req, res, next) => {
    try {
        const doc = await Document.findOneAndDelete({ _id: req.params.docId, service_order: req.params.id });
        if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

        const fs = require('fs');
        const filePath = path.join(__dirname, '../../', doc.file_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await logActivity({ entity_type: 'service_order', entity_id: req.params.id, action: 'document_deleted', performed_by: req.user._id, description: `Document '${doc.original_name}' deleted` });
        res.json({ success: true, message: 'Document deleted' });
    } catch (err) { next(err); }
};
