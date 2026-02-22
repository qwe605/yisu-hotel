const { pool } = require('../config/database');

async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hotel_id INT NOT NULL,
      room_type_id INT NOT NULL,
      user_name VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      check_in DATE DEFAULT NULL,
      check_out DATE DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await pool.query(sql);
}

async function insertBooking({ room_type_id, user_id, total_price, check_in, check_out, status }) {
  const sql = `
    INSERT INTO bookings (room_type_id, user_id, total_price, check_in, check_out, status)
    VALUES ( ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.query(sql, [room_type_id, user_id, total_price, check_in, check_out, status]);
  return result.insertId;
}

async function deleteBooking(id) {
  const sql = `DELETE FROM bookings WHERE id = ?`;
  await pool.query(sql, [id]);
}

async function listBookings(userId, scope, limit, offset) {
  const sql = `
    SELECT
      b.id, b.room_type_id, b.user_id, b.check_in, b.check_out, b.status,
      rt.name AS room_name, rt.base_price,
      h.id AS hotel_id, h.name_zh AS hotel_name, h.star_rating, h.address
    FROM bookings b
    JOIN room_types rt ON rt.id = b.room_type_id
    JOIN hotels h ON h.id = rt.hotel_id
    WHERE b.user_id = ?
      AND (
        (? = 'upcoming' AND b.check_in >= CURDATE() AND b.status IN ('pending','confirmed'))
        OR
        (? = 'past' AND b.status IN ('checked_out','cancelled'))
      )
    ORDER BY
      CASE WHEN ? = 'upcoming' THEN b.check_in END ASC,
      CASE WHEN ? = 'past' THEN b.check_out END DESC
    LIMIT ? OFFSET ?
  `;
  const params = [userId, scope, scope, scope, scope, limit, offset];
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  ensureTable,
  insertBooking,
  deleteBooking,
  listBookings
};
