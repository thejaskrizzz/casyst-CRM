const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { getOverview, getStaffPerformance, getStaffReport } = require('../controllers/analyticsController');

const adminOnly = [protect, authorize('admin')];
const adminManager = [protect, authorize('admin', 'manager')];

router.get('/overview', adminManager, getOverview);
router.get('/staff', adminManager, getStaffPerformance);
router.get('/staff/:id/report', adminManager, getStaffReport);

module.exports = router;
