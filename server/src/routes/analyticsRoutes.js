const express = require('express');
const { trackEvent } = require('../controllers/analyticsController');

const router = express.Router();

router.post('/track', trackEvent);

module.exports = router;
