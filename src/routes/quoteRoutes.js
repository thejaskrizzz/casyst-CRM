const express = require('express');
const router = express.Router();
const { getQuotes, getQuote, createQuote, updateQuote, updateStatus, deleteQuote } = require('../controllers/quoteController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.route('/')
    .get(authorize('admin', 'manager', 'sales'), getQuotes)
    .post(authorize('admin', 'manager', 'sales'), createQuote);

router.route('/:id')
    .get(authorize('admin', 'manager', 'sales'), getQuote)
    .put(authorize('admin', 'manager', 'sales'), updateQuote)
    .delete(authorize('admin', 'manager'), deleteQuote);

router.patch('/:id/status', authorize('admin', 'manager', 'sales'), updateStatus);

module.exports = router;
