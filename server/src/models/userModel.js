const { pool } = require('../config/database');

let cachedUserTable = null;
async function resolveUserTable(dbName) {
  if (cachedUserTable) return cachedUserTable;
  const [rows] = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('users','user') LIMIT 1`,
    [dbName || 'yisu_hotel']
  );
  cachedUserTable = rows?.[0]?.table_name || 'users';
  return cachedUserTable;
}

async function findByIdentifier(identifier, dbName) {
  const tbl = await resolveUserTable(dbName);
  const sql = `
    SELECT id, username, email, phone, role, password_hash
    FROM ${tbl}
    WHERE phone = ? OR username = ? OR email = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [identifier, identifier, identifier]);
  return rows?.[0] || null;
}

async function existsUser(username, email, phone, dbName) {
  const tbl = await resolveUserTable(dbName);
  const [rows] = await pool.query(
    `SELECT id FROM ${tbl} WHERE username = ? OR email = ? OR phone = ? LIMIT 1`,
    [username, email, phone]
  );
  return !!(rows && rows.length > 0);
}

async function createUser({ username, email, phone, passwordHash }, dbName) {
  const tbl = await resolveUserTable(dbName);
  const [result] = await pool.query(
    `INSERT INTO ${tbl} (username, email, phone, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'user', NOW(), NOW())`,
    [username, email, phone, passwordHash]
  );
  return result.insertId;
}

module.exports = {
  resolveUserTable,
  findByIdentifier,
  existsUser,
  createUser
};
