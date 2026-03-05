const express = require('express');
const router = express.Router();
const { getPackages, createPackage, updatePackage, deletePackage, getPackage } = require('../controllers/packageController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.route('/')
    .get(getPackages)
    .post(authorize('admin', 'manager'), createPackage);

router.route('/:id')
    .get(getPackage)
    .put(authorize('admin', 'manager'), updatePackage)
    .delete(authorize('admin'), deletePackage);

module.exports = router;
