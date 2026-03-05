const express = require('express');
const router = express.Router();
const { salesDashboard, operationsDashboard, managerDashboard, adminDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.get('/sales', authorize('admin', 'manager', 'sales'), salesDashboard);
router.get('/operations', authorize('admin', 'manager', 'operations'), operationsDashboard);
router.get('/manager', authorize('admin', 'manager'), managerDashboard);
router.get('/admin', authorize('admin'), adminDashboard);

module.exports = router;
