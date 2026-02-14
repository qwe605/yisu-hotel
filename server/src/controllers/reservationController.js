const reservationModel = require('../models/reservationModel');

async function createReservation(req, res) {
  try {
    await reservationModel.ensureTable();
    const { room_type_id, user_id, total_price = 0, check_in = null, check_out = null, status } = req.body || {};
    if (!room_type_id) {
      res.status(400).json({ message: '缺少必要参数' });
      return;
    }
    const reservation_id = await reservationModel.insertBooking({ room_type_id, user_id, total_price, check_in, check_out, status });
    res.json({ reservation_id });
  } catch (err) {
    res.status(500).json({ message: '服务器内部错误' });
    console.error('createReservation SQL error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
  }
}

async function cancelReservation(req, res) {
  try {
    await reservationModel.ensureTable();
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ message: '参数错误' });
      return;
    }
    await reservationModel.deleteBooking(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: '服务器内部错误' });
  }
}

module.exports = { createReservation, cancelReservation };
