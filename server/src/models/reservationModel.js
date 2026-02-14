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

module.exports = {
  ensureTable,
  insertBooking,
  deleteBooking
};
