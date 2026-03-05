const express = require('express');
const router = express.Router();
const { getClients, getClient, archiveClient } = require('../controllers/clientController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect, authorize('admin', 'manager', 'operations'));

router.route('/').get(getClients);
router.route('/:id').get(getClient);
router.patch('/:id/archive', authorize('admin', 'manager'), archiveClient);

module.exports = router;
