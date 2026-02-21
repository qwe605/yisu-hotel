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

//用于用户查询自己的订单情况
async function listMyReservations(req, res) { 
  //采用可选链操作符，避免空指针异常
  const userId = req.user?.id;
  if(!userId) return res.status(401).json({message:'未登录'});
  const {scope='upcoming',page=1,pageSize=10}=req.query;
  //标准化分页参数
  const limit=Math.max(parseInt(pageSize,10)||10,1);
  const offset=Math.max((parseInt(page,10)||1)-1,0)*limit;
  const rows=await reservationModel.listBookings(userId,scope,limit,offset);
  const total=await reservationModel.countBookings(userId,scope);
  res.json({items:rows,total,page:Number(page),pageSize:limit});
}

module.exports = { createReservation, cancelReservation ,listMyReservations};
