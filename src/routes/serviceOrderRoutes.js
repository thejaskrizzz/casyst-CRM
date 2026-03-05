const express = require('express');
const router = express.Router();
const {
    getServiceOrders, getServiceOrder, createServiceOrder, updateServiceOrder,
    updateStatus, assignServiceOrder, getServiceOrderActivity,
    addPayment, deletePayment, approvePayment, rejectPayment,
    addExpense, deleteExpense,
} = require('../controllers/serviceOrderController');
const { createTask, getTasks, updateTask } = require('../controllers/taskController');
const { getDocuments, uploadDocument, deleteDocument } = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(protect);

// List + create
router.route('/')
    .get(authorize('admin', 'manager', 'operations', 'sales', 'accountant'), getServiceOrders)
    .post(authorize('admin', 'manager', 'sales'), createServiceOrder);

// Single order
router.route('/:id')
    .get(authorize('admin', 'manager', 'operations', 'sales', 'accountant'), getServiceOrder)
    .put(authorize('admin', 'manager'), updateServiceOrder);

// Status + assign
router.patch('/:id/status', authorize('admin', 'manager', 'operations'), updateStatus);
router.patch('/:id/assign', authorize('admin', 'manager'), assignServiceOrder);
router.get('/:id/activity', authorize('admin', 'manager', 'operations', 'sales', 'accountant'), getServiceOrderActivity);

// Payments
router.post('/:id/payments', authorize('admin', 'manager', 'sales'), addPayment);
router.delete('/:id/payments/:pid', authorize('admin', 'manager'), deletePayment);
router.patch('/:id/payments/:pid/approve', authorize('admin', 'accountant'), approvePayment);
router.patch('/:id/payments/:pid/reject', authorize('admin', 'accountant'), rejectPayment);

// Tasks
router.route('/:id/tasks')
    .get(authorize('admin', 'manager', 'operations', 'sales', 'accountant'), getTasks)
    .post(authorize('admin', 'manager'), createTask);
router.patch('/:id/tasks/:taskId', authorize('admin', 'manager', 'operations'), updateTask);

// Documents
router.route('/:id/documents')
    .get(authorize('admin', 'manager', 'operations', 'sales', 'accountant'), getDocuments)
    .post(authorize('admin', 'manager', 'operations'), upload.single('file'), uploadDocument);
router.delete('/:id/documents/:docId', authorize('admin', 'manager'), deleteDocument);

// Expenses
router.post('/:id/expenses', authorize('admin', 'manager', 'operations'), addExpense);
router.delete('/:id/expenses/:eid', authorize('admin', 'manager'), deleteExpense);

module.exports = router;
