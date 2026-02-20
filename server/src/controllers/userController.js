const userModel = require('../models/userModel');

async function getMe(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: '未登录' });
    const user = await userModel.getById(userId, process.env.DB_NAME);
    if (!user) return res.status(404).json({ message: '用户不存在' });
    res.json(user);
  } catch (err) {
    console.error('getMe error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

async function updateMyCollect(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: '未登录' });
    const input = String(req.body?.collect ?? '');
    const normalized = input
      .split(',')
      .map(x => Number(x))
      .filter(n => Number.isFinite(n))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(',');
    const ok = await userModel.updateCollect(userId, normalized, process.env.DB_NAME);
    if (!ok) return res.status(400).json({ message: '更新失败' });
    res.json({ ok: true, collect: normalized });
  } catch (err) {
    console.error('updateMyCollect error:', { code: err?.code, sqlMessage: err?.sqlMessage, sql: err?.sql });
    res.status(500).json({ message: '服务器内部错误' });
  }
}

module.exports = { getMe, updateMyCollect };
