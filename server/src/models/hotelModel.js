const { pool } = require('../config/database');

async function execute(sql, params = []) {
  return pool.query(sql, params);
}

async function getHotelDetailById(id) {
  const sql = `
    SELECT
      h.id, h.name_zh, h.name_en, h.address, h.star_rating, h.description,
      h.latitude, h.longitude,
      MIN(rt.base_price) AS min_price,
      COUNT(DISTINCT rt.id) AS room_type_count
    FROM hotels h
    LEFT JOIN room_types rt ON rt.hotel_id = h.id
    WHERE h.id = ? AND h.status = "approved"
    GROUP BY h.id, h.name_zh, h.name_en, h.address, h.star_rating, h.description, h.latitude, h.longitude
  `;
  return pool.query(sql, [id]);
}

async function getRoomsByHotelId(id) {
  const sql = `
    SELECT id, name, base_price, capacity, description, amenities
    FROM room_types
    WHERE hotel_id = ?
    ORDER BY base_price ASC
  `;
  return pool.query(sql, [id]);
}

async function getFeaturesByHotelId(id) {
  const sql = `
    SELECT name, feature_type, distance, description
    FROM hotel_features
    WHERE hotel_id = ?
  `;
  return pool.query(sql, [id]);
}

async function getImagesByHotelId(id) {
  const sql = `
    SELECT image_url, is_primary, display_order
    FROM hotel_images
    WHERE hotel_id = ?
    ORDER BY is_primary DESC, display_order ASC
  `;
  return pool.query(sql, [id]);
}

async function getPromotionsByHotelId(id) {
  const sql = `
    SELECT id, name, description, discount_type, discount_value, start_date, end_date
    FROM promotions
    WHERE hotel_id = ?
  `;
  return pool.query(sql, [id]);
}

async function getBookingsByHotelId(id) {
  const sql = `
    SELECT b.id, b.room_type_id, b.user_id, b.check_in, b.check_out
    FROM bookings b
    JOIN room_types rt ON rt.id = b.room_type_id
    WHERE rt.hotel_id = ? AND b.check_out >= NOW()
  `;
  return pool.query(sql, [id]);
}

async function getAmenitiesGlobal() {
  const sql = `SELECT GROUP_CONCAT(amenities SEPARATOR ',') AS all_amenities FROM room_types`;
  return pool.query(sql);
}

async function getPromotionsAll() {
  const sql = `
    SELECT id, hotel_id, name, discount_type, discount_value, start_date, end_date, description, created_at
    FROM promotions
    ORDER BY start_date DESC, id DESC
  `;
  return pool.query(sql);
}

async function getRoomTypeCapacity(roomTypeId) {
  const [rows] = await pool.query('SELECT capacity FROM room_types WHERE id = ?', [roomTypeId]);
  return rows?.[0]?.capacity;
}

async function updateRoomTypeCapacity(roomTypeId, nextCapacity) {
  return pool.query('UPDATE room_types SET capacity = ? WHERE id = ?', [nextCapacity, roomTypeId]);
}

module.exports = {
  execute,
  getHotelDetailById,
  getRoomsByHotelId,
  getFeaturesByHotelId,
  getImagesByHotelId,
  getPromotionsByHotelId,
  getBookingsByHotelId,
  getAmenitiesGlobal,
  getPromotionsAll,
  getRoomTypeCapacity,
  updateRoomTypeCapacity
};
