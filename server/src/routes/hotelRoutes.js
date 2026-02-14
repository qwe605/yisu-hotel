// 酒店相关路由
// 作用：将HTTP路径映射到控制器方法
const express = require('express');
const { searchHotels, getHotelDetail, updateRoomTypeCapacity, getAmenities, getPromotions } = require('../controllers/hotelController');

const router = express.Router();

router.get('/search', searchHotels);
router.get('/amenities', getAmenities);
router.get('/promotions', getPromotions);
router.post('/room-types/:id/capacity', updateRoomTypeCapacity);
router.get('/:id', getHotelDetail);

module.exports = router;
