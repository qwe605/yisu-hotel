// 预约相关路由
const express = require('express');
const { createReservation, cancelReservation, listMyReservations } = require('../controllers/reservationController');

const router = express.Router();

router.post('/', createReservation);
router.delete('/:id', cancelReservation);
router.get('/my', listMyReservations);

module.exports = router;
