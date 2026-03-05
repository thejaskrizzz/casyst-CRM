const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, uploadLogo } = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.route('/')
    .get(getSettings)                          // all authenticated roles can read
    .put(authorize('admin'), updateSettings);  // only admin can write

router.post('/logo', authorize('admin'), uploadLogo);

module.exports = router;
