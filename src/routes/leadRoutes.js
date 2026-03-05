const express = require('express');
const router = express.Router();
const {
    getLeads, getLead, createLead, updateLead, updateLeadStatus,
    convertLead, addCallLog, getCallLogs, getTodayFollowups, getLeadActivity, assignLead,
} = require('../controllers/leadController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect, authorize('admin', 'manager', 'sales'));

router.get('/followups/today', getTodayFollowups);
router.route('/').get(getLeads).post(createLead);
router.route('/:id').get(getLead).put(updateLead);
router.patch('/:id/status', updateLeadStatus);
// Assign lead — admin and manager only (inline middleware override)
router.patch('/:id/assign', authorize('admin', 'manager'), assignLead);
router.post('/:id/convert', convertLead);
router.route('/:id/calls').get(getCallLogs).post(addCallLog);
router.get('/:id/activity', getLeadActivity);

module.exports = router;
