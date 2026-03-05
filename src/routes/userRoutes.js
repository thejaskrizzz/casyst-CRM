const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, toggleStatus, resetPassword, getUser } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// GET (list/read) — admin + manager (managers need to assign leads/orders to staff)
router.get('/', protect, authorize('admin', 'manager'), getUsers);
router.get('/:id', protect, authorize('admin', 'manager'), getUser);

// Write operations — admin only
router.post('/', protect, authorize('admin'), createUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.patch('/:id/status', protect, authorize('admin'), toggleStatus);
router.patch('/:id/reset-password', protect, authorize('admin'), resetPassword);

module.exports = router;

