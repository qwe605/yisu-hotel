const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { getMe, updateMyCollect } = require('../controllers/userController');

const router = express.Router();

router.get('/me', requireAuth, getMe);
router.put('/me/collect', requireAuth, updateMyCollect);

module.exports = router;
