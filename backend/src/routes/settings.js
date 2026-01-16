const express = require('express');
const router = express.Router();

const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', authorize('admin'), getSettings);
router.put('/', authorize('admin'), updateSettings);

module.exports = router;
